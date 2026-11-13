import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { authorizeKitchen } from "@/lib/services/kitchenAuth";
import { kitchenOperationFits } from "@/lib/services/kitchenRules";
import { changeLocationBalance } from "@/lib/services/stockLocationService";

type Context = { params: Promise<{ lineId: string; eventId: string }> };

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
  if (message === "RETURN_REQUEST_REQUIRED") return NextResponse.json({ error: "Les retours Cuisine sont désormais gérés par demande et réception Magasin" }, { status: 409 });
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
  if (eventInfo.type === "RETURNED") return NextResponse.json({ error: "Un retour réceptionné ne peut pas être modifié" }, { status: 409 });
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
      const pendingReturns = await tx.kitchen_return_requests.findMany({
        where: { dispatch_line_id: line.id, status: { in: ["PENDING", "PARTIAL"] } },
        select: { quantity: true, received_quantity: true },
      });
      const reserved = pendingReturns.reduce(
        (sum, request) => sum.plus(request.quantity.minus(request.received_quantity)),
        new Decimal(0),
      );
      if (!kitchenOperationFits(line.sent_quantity, previousServed, previousReturned.plus(reserved), amount)) throw new Error("QUANTITY_EXCEEDS_REMAINING");

      const delta = amount.minus(current.quantity);
      if (delta.gt(0)) await changeLocationBalance(tx, line.batch_id, "CUISINE", delta.negated());
      if (delta.lt(0)) await changeLocationBalance(tx, line.batch_id, "CUISINE", delta.abs());

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
  if (eventInfo.type === "RETURNED") return NextResponse.json({ error: "Un retour réceptionné ne peut pas être supprimé" }, { status: 409 });
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

      await tx.kitchen_events.delete({ where: { id: event.id } });
      await changeLocationBalance(tx, line.batch_id, "CUISINE", event.quantity);

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
