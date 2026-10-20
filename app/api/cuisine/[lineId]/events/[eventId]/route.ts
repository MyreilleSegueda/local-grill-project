import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { authorizeKitchen } from "@/lib/services/kitchenAuth";
import { kitchenOperationFits } from "@/lib/services/kitchenRules";

type Context = { params: Promise<{ lineId: string; eventId: string }> };

async function refreshSnapshot(tx: Prisma.TransactionClient, productId: number) {
  const batches = await tx.stock_batches.findMany({
    where: { product_id: productId },
    select: { quantity_remaining: true, purchase_price: true },
  });
  const quantity = batches.reduce((sum, batch) => sum.plus(batch.quantity_remaining), new Decimal(0));
  const value = batches.reduce((sum, batch) => sum.plus(batch.quantity_remaining.mul(batch.purchase_price)), new Decimal(0));
  await tx.inventory_snapshots.upsert({
    where: { product_id: productId },
    create: { product_id: productId, theoretical_quantity: quantity, real_quantity: quantity, difference: new Decimal(0), total_value: value },
    update: { theoretical_quantity: quantity, real_quantity: quantity, difference: new Decimal(0), total_value: value, last_updated_at: new Date() },
  });
}

async function readIds(context: Context) {
  const params = await context.params;
  const lineId = Number(params.lineId);
  const eventId = Number(params.eventId);
  if (!Number.isSafeInteger(lineId) || lineId <= 0 || !Number.isSafeInteger(eventId) || eventId <= 0) return null;
  return { lineId, eventId };
}

function respondError(error: unknown, method: "PATCH" | "DELETE") {
  const message = error instanceof Error ? error.message : "";
  if (message === "EVENT_NOT_FOUND") return NextResponse.json({ error: "Opération Cuisine introuvable" }, { status: 404 });
  if (message === "QUANTITY_EXCEEDS_REMAINING") return NextResponse.json({ error: "La quantité dépasse le reliquat disponible" }, { status: 409 });
  if (message === "INVALID_RETURN_MOVEMENT") return NextResponse.json({ error: "Le mouvement de retour associé est introuvable" }, { status: 409 });
  if (message === "RETURN_ALREADY_USED") return NextResponse.json({ error: "Ce retour a déjà été utilisé dans le stock ; sa quantité ne peut pas être réduite ou supprimée." }, { status: 409 });
  if (message === "BATCH_RETURN_LIMIT") return NextResponse.json({ error: "Le retour dépasserait la quantité initiale du lot" }, { status: 409 });
  console.error(`[${method} /api/cuisine/:lineId/events/:eventId]`, error);
  return NextResponse.json({ error: "Erreur lors de la modification de l'opération Cuisine" }, { status: 500 });
}

export async function PATCH(req: NextRequest, context: Context) {
  const ids = await readIds(context);
  if (!ids) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  let body: { quantity?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 }); }
  const requested = Number(body.quantity);
  if (!Number.isFinite(requested) || requested <= 0) return NextResponse.json({ error: "La quantité doit être supérieure à zéro" }, { status: 400 });

  const eventInfo = await prisma.kitchen_events.findUnique({ where: { id: ids.eventId }, select: { type: true } });
  if (!eventInfo) return NextResponse.json({ error: "Opération Cuisine introuvable" }, { status: 404 });
  const auth = await authorizeKitchen(req, eventInfo.type === "SERVED" ? "CUISINE_SERVE" : "CUISINE_RETURN");
  if (auth.response) return auth.response;

  try {
    const event = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{
        id: number; product_id: number; batch_id: number; sent_quantity: Decimal;
        served_quantity: Decimal; returned_quantity: Decimal;
      }>>(Prisma.sql`SELECT id, product_id, batch_id, sent_quantity, served_quantity, returned_quantity FROM kitchen_dispatch_lines WHERE id = ${ids.lineId} FOR UPDATE`);
      const line = locked[0];
      if (!line) throw new Error("EVENT_NOT_FOUND");
      const current = await tx.kitchen_events.findUnique({ where: { id: ids.eventId } });
      if (!current || current.dispatch_line_id !== line.id) throw new Error("EVENT_NOT_FOUND");

      const amount = new Decimal(requested);
      const previousServed = line.served_quantity.minus(current.type === "SERVED" ? current.quantity : 0);
      const previousReturned = line.returned_quantity.minus(current.type === "RETURNED" ? current.quantity : 0);
      if (!kitchenOperationFits(line.sent_quantity, previousServed, previousReturned, amount)) throw new Error("QUANTITY_EXCEEDS_REMAINING");

      if (current.type === "RETURNED") {
        if (!current.stock_movement_id) throw new Error("INVALID_RETURN_MOVEMENT");
        const movement = await tx.stock_movements.findUnique({ where: { id: current.stock_movement_id } });
        if (!movement || movement.type !== "IN" || movement.batch_id !== line.batch_id) throw new Error("INVALID_RETURN_MOVEMENT");
        const batches = await tx.$queryRaw<Array<{ quantity_initial: Decimal; quantity_remaining: Decimal }>>(Prisma.sql`SELECT quantity_initial, quantity_remaining FROM stock_batches WHERE id = ${line.batch_id} FOR UPDATE`);
        const batch = batches[0];
        if (!batch) throw new Error("INVALID_RETURN_MOVEMENT");
        const delta = amount.minus(current.quantity);
        if (delta.gt(0) && batch.quantity_remaining.plus(delta).gt(batch.quantity_initial)) throw new Error("BATCH_RETURN_LIMIT");
        if (delta.lt(0) && batch.quantity_remaining.lt(delta.abs())) throw new Error("RETURN_ALREADY_USED");
        if (!delta.isZero()) {
          await tx.stock_batches.update({ where: { id: line.batch_id }, data: { quantity_remaining: { increment: delta }, updated_at: new Date() } });
          await tx.stock_movements.update({ where: { id: movement.id }, data: { quantity: amount } });
          await refreshSnapshot(tx, line.product_id);
        }
      }

      await tx.kitchen_events.update({ where: { id: current.id }, data: { quantity: amount } });
      await tx.kitchen_dispatch_lines.update({
        where: { id: line.id },
        data: current.type === "SERVED"
          ? { served_quantity: previousServed.plus(amount) }
          : { returned_quantity: previousReturned.plus(amount) },
      });
      return { id: current.id, type: current.type, quantity: amount };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ success: true, data: { event } });
  } catch (error) { return respondError(error, "PATCH"); }
}

export async function DELETE(req: NextRequest, context: Context) {
  const ids = await readIds(context);
  if (!ids) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  const eventInfo = await prisma.kitchen_events.findUnique({ where: { id: ids.eventId }, select: { type: true } });
  if (!eventInfo) return NextResponse.json({ error: "Opération Cuisine introuvable" }, { status: 404 });
  const auth = await authorizeKitchen(req, eventInfo.type === "SERVED" ? "CUISINE_SERVE" : "CUISINE_RETURN");
  if (auth.response) return auth.response;

  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{
        id: number; product_id: number; batch_id: number; served_quantity: Decimal; returned_quantity: Decimal;
      }>>(Prisma.sql`SELECT id, product_id, batch_id, served_quantity, returned_quantity FROM kitchen_dispatch_lines WHERE id = ${ids.lineId} FOR UPDATE`);
      const line = locked[0];
      if (!line) throw new Error("EVENT_NOT_FOUND");
      const event = await tx.kitchen_events.findUnique({ where: { id: ids.eventId } });
      if (!event || event.dispatch_line_id !== line.id) throw new Error("EVENT_NOT_FOUND");

      if (event.type === "RETURNED") {
        if (!event.stock_movement_id) throw new Error("INVALID_RETURN_MOVEMENT");
        const movement = await tx.stock_movements.findUnique({ where: { id: event.stock_movement_id } });
        const batches = await tx.$queryRaw<Array<{ quantity_remaining: Decimal }>>(Prisma.sql`SELECT quantity_remaining FROM stock_batches WHERE id = ${line.batch_id} FOR UPDATE`);
        if (!movement || movement.type !== "IN" || movement.batch_id !== line.batch_id || !batches[0]) throw new Error("INVALID_RETURN_MOVEMENT");
        if (batches[0].quantity_remaining.lt(event.quantity)) throw new Error("RETURN_ALREADY_USED");
        await tx.kitchen_events.delete({ where: { id: event.id } });
        await tx.stock_movements.delete({ where: { id: movement.id } });
        await tx.stock_batches.update({ where: { id: line.batch_id }, data: { quantity_remaining: { decrement: event.quantity }, updated_at: new Date() } });
        await refreshSnapshot(tx, line.product_id);
      } else {
        await tx.kitchen_events.delete({ where: { id: event.id } });
      }

      await tx.kitchen_dispatch_lines.update({
        where: { id: line.id },
        data: event.type === "SERVED"
          ? { served_quantity: { decrement: event.quantity } }
          : { returned_quantity: { decrement: event.quantity } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ success: true });
  } catch (error) { return respondError(error, "DELETE"); }
}
