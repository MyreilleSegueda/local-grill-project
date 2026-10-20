/**
 * app/api/stock/consume/route.ts
 * POST → consomme du stock FIFO ET met à jour inventory_snapshots
 */
import { NextRequest, NextResponse }        from "next/server";
import { prisma }                           from "@/lib/prisma";
import { auditStock } from "@/lib/services/auditLogService";
import { updateInventorySnapshot }          from "@/lib/services/inventoryService";
import type { StockMovementType }           from "@prisma/client";
import { authorizeKitchenDispatch, authorizeStockExit } from "@/lib/services/kitchenAuth";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as {
      product_id:        number;
      quantity:          number;
      type?:             string;
      reason?:           string;
      reference_number?: string;
      destination?: "STORE" | "CUISINE";
    };

    const auth = body.destination === "CUISINE"
      ? await authorizeKitchenDispatch(req)
      : await authorizeStockExit(req);
    if (auth.response) return auth.response;
    if (!auth.userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const errors: Record<string, string> = {};
    if (!body.product_id)            errors.product_id = "product_id requis";
    if (!body.quantity || body.quantity <= 0) errors.quantity = "Quantité > 0 requise";
    if (Object.keys(errors).length > 0)
      return NextResponse.json({ error: "Données invalides", fields: errors }, { status: 400 });

    const requestedType = body.type ?? "OUT";
    if (!["IN", "OUT", "LOSS", "EXPIRED", "ADJUSTMENT"].includes(requestedType)) {
      return NextResponse.json({ error: "Type de mouvement invalide" }, { status: 400 });
    }
    if (body.destination === "CUISINE" && requestedType !== "OUT") {
      return NextResponse.json({ error: "La destination Cuisine est réservée aux sorties" }, { status: 400 });
    }
    const mvtType = requestedType as StockMovementType;
    const pid     = Number(body.product_id);
    let   toConsume = body.quantity;

    // Vérifier stock disponible
    const totalAvailable = await prisma.stock_batches.aggregate({
      where:  { product_id: pid, quantity_remaining: { gt: 0 } },
      _sum:   { quantity_remaining: true },
    });
    const available = Number(totalAvailable._sum.quantity_remaining ?? 0);
    if (available < toConsume) {
      return NextResponse.json(
        { error: `Stock insuffisant : disponible ${available}, demandé ${toConsume}` },
        { status: 409 },
      );
    }

    const movements: number[] = [];

    await prisma.$transaction(async (tx) => {
      // FIFO : lots les plus anciens en premier
      const batches = await tx.stock_batches.findMany({
        where:   { product_id: pid, quantity_remaining: { gt: 0 } },
        orderBy: { entry_date: "asc" },
      });

      for (const batch of batches) {
        if (toConsume <= 0) break;
        const take      = Math.min(toConsume, Number(batch.quantity_remaining));
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
            reason:           body.reason ?? "Consommation stock",
            reference_number: body.reference_number ?? null,
            user_id:          auth.userId,
          },
        });
        movements.push(mvt.id);
        toConsume -= take;
      }
      if (toConsume > 0.000001) throw new Error("Stock insuffisant");

      if (body.destination === "CUISINE") {
        const dispatch = await tx.kitchen_dispatches.create({
          data: {
            reference: `CUISINE-${auth.userId}-${Date.now()}-${crypto.randomUUID()}`,
            created_by: auth.userId,
          },
        });
        const createdMovements = await tx.stock_movements.findMany({
          where: { id: { in: movements } },
          select: { id: true, product_id: true, batch_id: true, quantity: true, type: true },
        });
        for (const movement of createdMovements) {
          if (movement.type !== "OUT" || movement.batch_id === null)
            throw new Error("Mouvement source Cuisine invalide");
          await tx.kitchen_dispatch_lines.create({
            data: {
              dispatch_id: dispatch.id,
              origin_movement_id: movement.id,
              product_id: movement.product_id,
              batch_id: movement.batch_id,
              sent_quantity: movement.quantity,
            },
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
      data:    { movement_ids: movements, consumed: body.quantity },
    });

  } catch (err) {
    console.error("[POST /api/stock/consume]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
