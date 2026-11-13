import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { authorizeStore } from "@/lib/services/kitchenAuth";
import { allocateFifo } from "@/lib/services/fifo";
import { changeLocationBalance, recordLocationMovement } from "@/lib/services/stockLocationService";
import { updateInventorySnapshot } from "@/lib/services/inventoryService";
import { parseStoreQuantity } from "@/lib/services/storeQuantity";

export async function GET(req: NextRequest) {
  const [viewAuth, transferAuth, receiveAuth, returnStockAuth] = await Promise.all([
    authorizeStore(req, "STORE_VIEW"),
    authorizeStore(req, "STORE_TRANSFER"),
    authorizeStore(req, "STORE_RECEIVE"),
    authorizeStore(req, "STORE_RETURN_STOCK"),
  ]);
  const canView = viewAuth.userId !== null;
  const canTransfer = transferAuth.userId !== null;
  const canReceive = receiveAuth.userId !== null;
  const canReturnToStock = returnStockAuth.userId !== null;
  if (!canView && !canTransfer && !canReceive && !canReturnToStock) {
    return viewAuth.response ?? NextResponse.json({ error: "Permission Magasin requise" }, { status: 403 });
  }

  try {
    const [balances, returns, movements] = await Promise.all([
      canView || canTransfer || canReturnToStock ? prisma.stock_location_balances.findMany({
        where: { location: "STORE", quantity: { gt: 0 } },
        include: {
          batch: {
            include: { product: { include: { unit: true } } },
          },
        },
        orderBy: [{ batch: { entry_date: "asc" } }, { batch_id: "asc" }],
      }) : Promise.resolve([]),
      canView || canReceive ? prisma.kitchen_return_requests.findMany({
        where: { status: { in: ["PENDING", "PARTIAL"] } },
        include: {
          product: { include: { unit: true } },
          batch: true,
          requester: { select: { id: true, fullName: true } },
          dispatch_line: { include: { dispatch: { select: { reference: true, created_at: true } } } },
        },
        orderBy: { requested_at: "asc" },
      }) : Promise.resolve([]),
      canView ? prisma.stock_location_movements.findMany({
        where: { OR: [{ from_location: "STORE" }, { to_location: "STORE" }] },
        include: {
          product: { include: { unit: true } },
          batch: true,
          actor: { select: { fullName: true } },
        },
        orderBy: { created_at: "desc" },
        take: 100,
      }) : Promise.resolve([]),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        balances,
        returns,
        movements,
        permissions: { canView, canTransfer, canReceive, canReturnToStock },
      },
    });
  } catch (error) {
    console.error("[GET /api/store]", error);
    return NextResponse.json({ error: "Impossible de charger le Magasin" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { product_id?: number; quantity?: number | string; destination?: string; reference_number?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const productId = Number(body.product_id);
  const amount = parseStoreQuantity(body.quantity);
  if (!Number.isSafeInteger(productId) || productId <= 0 ||
      !amount ||
      !["CUISINE", "STOCK"].includes(body.destination ?? "")) {
    return NextResponse.json({ error: "Produit, quantité ou destination invalide" }, { status: 400 });
  }
  const destination = body.destination as "CUISINE" | "STOCK";
  const auth = await authorizeStore(req, destination === "CUISINE" ? "STORE_TRANSFER" : "STORE_RETURN_STOCK");
  if (auth.response) return auth.response;
  if (!auth.userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if ((body.reference_number?.trim().length ?? 0) > 80) {
    return NextResponse.json({ error: "La référence ne peut pas dépasser 80 caractères" }, { status: 400 });
  }
  const reference = body.reference_number?.trim() || `MAG-${Date.now()}-${crypto.randomUUID()}`;

  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{
        id: number; batch_id: number; quantity: Decimal; entry_date: Date;
        quantity_initial: Decimal; quantity_remaining: Decimal;
      }>>(Prisma.sql`
        SELECT b.id, b.batch_id, b.quantity, s.entry_date, s.quantity_initial, s.quantity_remaining
        FROM stock_location_balances b
        JOIN stock_batches s ON s.id = b.batch_id
        WHERE s.product_id = ${productId} AND b.location = 'STORE' AND b.quantity > 0
        ORDER BY s.entry_date ASC, s.id ASC
        FOR UPDATE
      `);
      const allocations = allocateFifo(
        locked.map((row) => ({ ...row, id: row.batch_id, quantity: row.quantity })),
        amount,
      );
      let dispatch: { id: number } | null = null;
      if (destination === "CUISINE") {
        dispatch = await tx.kitchen_dispatches.create({
          data: { reference: `CUISINE-${reference}`, created_by: auth.userId! },
          select: { id: true },
        });
      }

      for (const allocation of allocations) {
        const row = allocation.batch;
        const batchId = row.batch_id;
        const quantity = allocation.quantity;
        await changeLocationBalance(tx, batchId, "STORE", quantity.negated());

        if (destination === "STOCK") {
          if (row.quantity_remaining.plus(quantity).gt(row.quantity_initial)) {
            throw new Error("BATCH_RETURN_LIMIT");
          }
          const reason = `Retour Magasin vers le stock général${body.reason?.trim() ? ` — ${body.reason.trim()}` : ""}`;
          await tx.stock_batches.update({
            where: { id: batchId },
            data: { quantity_remaining: { increment: quantity }, updated_at: new Date() },
          });
          await tx.stock_movements.create({
            data: {
              product_id: productId,
              batch_id: batchId,
              type: "IN",
              quantity,
              reason,
              reference_number: reference,
              user_id: auth.userId!,
            },
          });
          await recordLocationMovement(tx, {
            product_id: productId,
            batch_id: batchId,
            from_location: "STORE",
            to_location: "GENERAL",
            quantity,
            user_id: auth.userId!,
            reason,
            reference_number: reference,
          });
        } else {
          const movement = await recordLocationMovement(tx, {
            product_id: productId,
            batch_id: batchId,
            from_location: "STORE",
            to_location: "CUISINE",
            quantity,
            user_id: auth.userId!,
            reason: body.reason?.trim() || "Transfert du Magasin vers la Cuisine",
            reference_number: reference,
          });
          await changeLocationBalance(tx, batchId, "CUISINE", quantity);
          await tx.kitchen_dispatch_lines.create({
            data: {
              dispatch_id: dispatch!.id,
              origin_location_movement_id: movement.id,
              product_id: productId,
              batch_id: batchId,
              sent_quantity: quantity,
            },
          });
        }
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (destination === "STOCK") await updateInventorySnapshot(productId);
    return NextResponse.json({ success: true, data: { destination, quantity: amount.toString(), reference } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INSUFFICIENT_STOCK" || message === "INSUFFICIENT_LOCATION_STOCK") {
      return NextResponse.json({ error: "Stock Magasin insuffisant pour ce transfert" }, { status: 409 });
    }
    if (message === "BATCH_RETURN_LIMIT") {
      return NextResponse.json({ error: "Le transfert dépasserait la quantité initiale du lot" }, { status: 409 });
    }
    console.error("[POST /api/store]", error);
    return NextResponse.json({ error: "Erreur lors du transfert Magasin" }, { status: 500 });
  }
}
