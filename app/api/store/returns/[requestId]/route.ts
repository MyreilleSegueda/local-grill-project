import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { authorizeStore } from "@/lib/services/kitchenAuth";
import { changeLocationBalance, recordLocationMovement } from "@/lib/services/stockLocationService";
import { parseStoreQuantity } from "@/lib/services/storeQuantity";

type Context = { params: Promise<{ requestId: string }> };

export async function POST(req: NextRequest, context: Context) {
  const auth = await authorizeStore(req, "STORE_RECEIVE");
  if (auth.response) return auth.response;
  if (!auth.userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const requestId = Number((await context.params).requestId);
  if (!Number.isSafeInteger(requestId) || requestId <= 0) {
    return NextResponse.json({ error: "Identifiant de demande invalide" }, { status: 400 });
  }
  let body: { quantity?: number | string; reject_remaining?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const amount = body.reject_remaining ? null : parseStoreQuantity(body.quantity);
  if (!body.reject_remaining && !amount) {
    return NextResponse.json({ error: "La quantité réceptionnée doit être supérieure à zéro" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{
        id: number; dispatch_line_id: number; product_id: number; batch_id: number;
        quantity: Decimal; received_quantity: Decimal; status: "PENDING" | "PARTIAL" | "RECEIVED" | "REJECTED";
        operation_key: string;
      }>>(Prisma.sql`
        SELECT id, dispatch_line_id, product_id, batch_id, quantity, received_quantity, status, operation_key
        FROM kitchen_return_requests WHERE id = ${requestId} FOR UPDATE
      `);
      const request = locked[0];
      if (!request) throw new Error("RETURN_REQUEST_NOT_FOUND");
      if (request.status !== "PENDING" && request.status !== "PARTIAL") throw new Error("RETURN_REQUEST_CLOSED");

      if (body.reject_remaining) {
        const updated = await tx.kitchen_return_requests.update({
          where: { id: request.id },
          data: { status: "REJECTED", received_by: auth.userId },
        });
        return { request: updated, received: new Decimal(0) };
      }

      const outstanding = request.quantity.minus(request.received_quantity);
      const receiptAmount = amount;
      if (!receiptAmount || !receiptAmount.isFinite() || !receiptAmount.gt(0) || receiptAmount.gt(outstanding)) {
        throw new Error("INVALID_RECEIPT_QUANTITY");
      }

      await tx.$queryRaw(Prisma.sql`
        SELECT id FROM stock_location_balances
        WHERE batch_id = ${request.batch_id} AND location = 'CUISINE' FOR UPDATE
      `);
      await changeLocationBalance(tx, request.batch_id, "CUISINE", receiptAmount.negated());
      await changeLocationBalance(tx, request.batch_id, "STORE", receiptAmount);
      const reference = `RETOUR-CUISINE-${request.id}`;
      await recordLocationMovement(tx, {
        product_id: request.product_id,
        batch_id: request.batch_id,
        from_location: "CUISINE",
        to_location: "STORE",
        quantity: receiptAmount,
        user_id: auth.userId!,
        reason: "Réception et validation du retour Cuisine",
        reference_number: reference,
        return_request_id: request.id,
      });

      const receivedQuantity = request.received_quantity.plus(receiptAmount);
      const complete = receivedQuantity.eq(request.quantity);
      const updatedRequest = await tx.kitchen_return_requests.update({
        where: { id: request.id },
        data: {
          received_quantity: receivedQuantity,
          status: complete ? "RECEIVED" : "PARTIAL",
          received_by: auth.userId,
          ...(complete ? { received_at: new Date() } : {}),
        },
      });
      await tx.kitchen_dispatch_lines.update({
        where: { id: request.dispatch_line_id },
        data: { returned_quantity: { increment: receiptAmount } },
      });
      await tx.kitchen_events.create({
        data: {
          dispatch_line_id: request.dispatch_line_id,
          type: "RETURNED",
          quantity: receiptAmount,
          actor_id: auth.userId!,
          operation_key: `STORE-RECEIPT-${request.id}-${crypto.randomUUID()}`,
        },
      });
      return { request: updatedRequest, received: receiptAmount };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "RETURN_REQUEST_NOT_FOUND") return NextResponse.json({ error: "Demande de retour introuvable" }, { status: 404 });
    if (message === "RETURN_REQUEST_CLOSED") return NextResponse.json({ error: "Cette demande est déjà clôturée" }, { status: 409 });
    if (message === "INVALID_RECEIPT_QUANTITY") return NextResponse.json({ error: "La quantité réceptionnée doit être positive et ne pas dépasser le reliquat" }, { status: 400 });
    if (message === "INSUFFICIENT_LOCATION_STOCK") return NextResponse.json({ error: "Le stock Cuisine ne contient plus cette quantité" }, { status: 409 });
    console.error("[POST /api/store/returns/:requestId]", error);
    return NextResponse.json({ error: "Erreur lors du contrôle et de la réception du retour" }, { status: 500 });
  }
}
