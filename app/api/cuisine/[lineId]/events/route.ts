import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { authorizeKitchen } from "@/lib/services/kitchenAuth";
import { isKitchenEventType, kitchenOperationFits } from "@/lib/services/kitchenRules";

type Context = { params: Promise<{ lineId: string }> };

async function refreshSnapshot(tx: Prisma.TransactionClient, productId: number) {
  const batches = await tx.stock_batches.findMany({
    where: { product_id: productId },
    select: { quantity_remaining: true, purchase_price: true },
  });
  const quantity = batches.reduce((sum, batch) => sum.plus(batch.quantity_remaining), new Decimal(0));
  const value = batches.reduce(
    (sum, batch) => sum.plus(batch.quantity_remaining.mul(batch.purchase_price)),
    new Decimal(0),
  );
  await tx.inventory_snapshots.upsert({
    where: { product_id: productId },
    create: {
      product_id: productId,
      theoretical_quantity: quantity,
      real_quantity: quantity,
      difference: new Decimal(0),
      total_value: value,
    },
    update: {
      theoretical_quantity: quantity,
      real_quantity: quantity,
      difference: new Decimal(0),
      total_value: value,
      last_updated_at: new Date(),
    },
  });
}

export async function POST(req: NextRequest, context: Context) {
  let body: { type?: string; quantity?: number; operation_key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const eventType = body.type;
  if (!isKitchenEventType(eventType)) {
    return NextResponse.json({ error: "Type d'opération invalide" }, { status: 400 });
  }
  const permission = eventType === "SERVED" ? "CUISINE_SERVE" : "CUISINE_RETURN";
  const auth = await authorizeKitchen(req, permission);
  if (auth.response) return auth.response;
  if (!auth.userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const lineId = Number((await context.params).lineId);
  const quantity = Number(body.quantity);
  const operationKey = body.operation_key?.trim();
  if (!Number.isSafeInteger(lineId) || lineId <= 0 || !Number.isFinite(quantity) || quantity <= 0 ||
      !operationKey || operationKey.length > 100) {
    return NextResponse.json({ error: "Identifiant, quantité ou clé d'opération invalide" }, { status: 400 });
  }
  const amount = new Decimal(quantity);

  try {
    const event = await prisma.$transaction(async (tx) => {
      // Lock the inventory line so simultaneous service/return operations serialize.
      const locked = await tx.$queryRaw<Array<{
        id: number; dispatch_id: number; origin_movement_id: number; product_id: number; batch_id: number;
        sent_quantity: Decimal; served_quantity: Decimal; returned_quantity: Decimal;
      }>>(Prisma.sql`
        SELECT id, dispatch_id, origin_movement_id, product_id, batch_id,
               sent_quantity, served_quantity, returned_quantity
        FROM kitchen_dispatch_lines WHERE id = ${lineId} FOR UPDATE
      `);
      const line = locked[0];
      if (!line) throw new Error("CUISINE_LINE_NOT_FOUND");

      const duplicate = await tx.kitchen_events.findUnique({ where: { operation_key: operationKey } });
      if (duplicate) throw new Error("DUPLICATE_OPERATION");

      if (!kitchenOperationFits(line.sent_quantity, line.served_quantity, line.returned_quantity, amount))
        throw new Error("QUANTITY_EXCEEDS_REMAINING");

      let stockMovementId: number | null = null;
      if (eventType === "RETURNED") {
        const origin = await tx.stock_movements.findUnique({ where: { id: line.origin_movement_id } });
        if (!origin || origin.type !== "OUT" || origin.product_id !== line.product_id || origin.batch_id !== line.batch_id) {
          throw new Error("INVALID_ORIGIN_MOVEMENT");
        }
        const batches = await tx.$queryRaw<Array<{ id: number; quantity_initial: Decimal; quantity_remaining: Decimal }>>(
          Prisma.sql`SELECT id, quantity_initial, quantity_remaining FROM stock_batches WHERE id = ${line.batch_id} FOR UPDATE`,
        );
        const batch = batches[0];
        if (!batch || batch.quantity_remaining.plus(amount).gt(batch.quantity_initial)) {
          throw new Error("BATCH_RETURN_LIMIT");
        }
        await tx.stock_batches.update({
          where: { id: line.batch_id },
          data: { quantity_remaining: { increment: amount }, updated_at: new Date() },
        });
        const movement = await tx.stock_movements.create({
          data: {
            product_id: line.product_id,
            batch_id: line.batch_id,
            type: "IN",
            quantity: amount,
            reason: "Retour Cuisine",
            reference_number: `CUISINE-RET-${operationKey}`,
            user_id: auth.userId,
          },
        });
        stockMovementId = movement.id;
        await refreshSnapshot(tx, line.product_id);
      }

      const created = await tx.kitchen_events.create({
        data: {
          dispatch_line_id: line.id,
          type: eventType,
          quantity: amount,
          actor_id: auth.userId,
          stock_movement_id: stockMovementId,
          operation_key: operationKey,
        },
      });
      await tx.kitchen_dispatch_lines.update({
        where: { id: line.id },
        data: eventType === "SERVED"
          ? { served_quantity: { increment: amount } }
          : { returned_quantity: { increment: amount } },
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ success: true, data: { event } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Cette opération a déjà été enregistrée" }, { status: 409 });
    }
    if (message === "CUISINE_LINE_NOT_FOUND") return NextResponse.json({ error: "Ligne Cuisine introuvable" }, { status: 404 });
    if (message === "DUPLICATE_OPERATION") return NextResponse.json({ error: "Cette opération a déjà été enregistrée" }, { status: 409 });
    if (message === "QUANTITY_EXCEEDS_REMAINING") return NextResponse.json({ error: "La quantité dépasse le reliquat non servi" }, { status: 409 });
    if (message === "INVALID_ORIGIN_MOVEMENT") return NextResponse.json({ error: "Mouvement de sortie d'origine invalide" }, { status: 409 });
    if (message === "BATCH_RETURN_LIMIT") return NextResponse.json({ error: "Le retour dépasserait la quantité initiale du lot" }, { status: 409 });
    console.error("[POST /api/cuisine/:lineId/events]", error);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement Cuisine" }, { status: 500 });
  }
}
