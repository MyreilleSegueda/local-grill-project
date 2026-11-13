/**
 * app/api/stock/consume/route.ts
 * POST → consomme du stock FIFO ET met à jour inventory_snapshots
 */
import { NextRequest, NextResponse }        from "next/server";
import { prisma }                           from "@/lib/prisma";
import { auditStock } from "@/lib/services/auditLogService";
import { updateInventorySnapshot }          from "@/lib/services/inventoryService";
import type { StockMovementType }           from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { authorizeStockExit } from "@/lib/services/kitchenAuth";
import { allocateFifo } from "@/lib/services/fifo";
import { changeLocationBalance, recordLocationMovement } from "@/lib/services/stockLocationService";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as {
      product_id:        number;
      quantity:          number;
      type?:             string;
      reason?:           string;
      reference_number?: string;
      destination?: "STORE" | "OTHER" | "CUISINE";
    };

    const auth = await authorizeStockExit(req);
    if (auth.response) return auth.response;
    if (!auth.userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const errors: Record<string, string> = {};
    if (!body.product_id)            errors.product_id = "product_id requis";
    if (!Number.isFinite(body.quantity) || !body.quantity || body.quantity <= 0) errors.quantity = "Quantité > 0 requise";
    if (Object.keys(errors).length > 0)
      return NextResponse.json({ error: "Données invalides", fields: errors }, { status: 400 });

    const requestedType = body.type ?? "OUT";
    if (!["IN", "OUT", "LOSS", "EXPIRED", "ADJUSTMENT"].includes(requestedType)) {
      return NextResponse.json({ error: "Type de mouvement invalide" }, { status: 400 });
    }
    if (body.destination === "CUISINE") {
      return NextResponse.json({ error: "Les produits doivent être transférés du Magasin vers la Cuisine" }, { status: 400 });
    }
    if (body.destination && !["STORE", "OTHER"].includes(body.destination)) {
      return NextResponse.json({ error: "Destination invalide" }, { status: 400 });
    }
    if (body.destination === "STORE" && requestedType !== "OUT") {
      return NextResponse.json({ error: "Le transfert vers Magasin nécessite une sortie normale" }, { status: 400 });
    }
    const transferToStore = body.destination === "STORE" && requestedType === "OUT";
    const mvtType = requestedType as StockMovementType;
    const pid     = Number(body.product_id);
    const requestedQuantity = new Decimal(body.quantity);

    // Vérifier stock disponible
    const totalAvailable = await prisma.stock_batches.aggregate({
      where:  { product_id: pid, quantity_remaining: { gt: 0 } },
      _sum:   { quantity_remaining: true },
    });
    const available = Number(totalAvailable._sum.quantity_remaining ?? 0);
    if (new Decimal(available).lt(requestedQuantity)) {
      return NextResponse.json(
        { error: `Stock insuffisant : disponible ${available}, demandé ${requestedQuantity}` },
        { status: 409 },
      );
    }

    const movements: number[] = [];

    await prisma.$transaction(async (tx) => {
      // FIFO : lots les plus anciens en premier
      const batches = await tx.stock_batches.findMany({
        where:   { product_id: pid, quantity_remaining: { gt: 0 } },
        orderBy: [{ entry_date: "asc" }, { id: "asc" }],
      });

      const allocations = allocateFifo(
        batches.map((batch) => ({
          batch,
          id: batch.id,
          entry_date: batch.entry_date,
          quantity: batch.quantity_remaining,
        })),
        requestedQuantity,
      );

      for (const allocation of allocations) {
        const batch = allocation.batch.batch;
        const take = allocation.quantity;
        const batchUpdate = await tx.stock_batches.updateMany({
          where: { id: batch.id, quantity_remaining: { gte: take } },
          data:  { quantity_remaining: { decrement: take }, updated_at: new Date() },
        });
        if (batchUpdate.count !== 1) throw new Error("Stock modifié par une autre opération; réessayez");

        const mvt = await tx.stock_movements.create({
          data: {
            product_id:       pid,
            batch_id:         batch.id,
            type:             mvtType,
            quantity:         take,
            reason:           body.reason ?? (transferToStore ? "Transfert vers Magasin" : "Consommation stock"),
            reference_number: body.reference_number ?? null,
            user_id:          auth.userId,
          },
        });
        movements.push(mvt.id);
        if (transferToStore) {
          await changeLocationBalance(tx, batch.id, "STORE", take);
          await recordLocationMovement(tx, {
            product_id: pid,
            batch_id: batch.id,
            from_location: "GENERAL",
            to_location: "STORE",
            quantity: take,
            user_id: auth.userId,
            reason: body.reason ?? "Transfert du stock général vers Magasin",
            reference_number: body.reference_number ?? null,
          });
        }
      }
    });

    // Mettre à jour le snapshot après transaction
    await updateInventorySnapshot(pid);

    await auditStock.createExit(req, auth.userId, movements[0] ?? 0, {
      product_id: pid,
      quantity:   body.quantity,
      type:       mvtType,
    });

    return NextResponse.json({
      success: true,
      data:    { movement_ids: movements, transferred_to_store: transferToStore, consumed: body.quantity },
    });

  } catch (err) {
    console.error("[POST /api/stock/consume]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
