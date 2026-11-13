import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { authorizeKitchen } from "@/lib/services/kitchenAuth";

type Context = { params: Promise<{ lineId: string }> };

export async function POST(req: NextRequest, context: Context) {
  let body: { quantity?: number; operation_key?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const auth = await authorizeKitchen(req, "CUISINE_RETURN");
  if (auth.response) return auth.response;
  if (!auth.userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const lineId = Number((await context.params).lineId);
  const quantity = Number(body.quantity);
  const operationKey = body.operation_key?.trim();
  if (!Number.isSafeInteger(lineId) || lineId <= 0 ||
      !Number.isFinite(quantity) || quantity <= 0 ||
      !operationKey || operationKey.length > 100) {
    return NextResponse.json({ error: "Identifiant, quantité ou clé d'opération invalide" }, { status: 400 });
  }

  try {
    const request = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{
        id: number; product_id: number; batch_id: number; sent_quantity: Decimal;
        served_quantity: Decimal; returned_quantity: Decimal;
      }>>(Prisma.sql`
        SELECT id, product_id, batch_id, sent_quantity, served_quantity, returned_quantity
        FROM kitchen_dispatch_lines WHERE id = ${lineId} FOR UPDATE
      `);
      const line = locked[0];
      if (!line) throw new Error("CUISINE_LINE_NOT_FOUND");

      const duplicate = await tx.kitchen_return_requests.findUnique({ where: { operation_key: operationKey } });
      if (duplicate) throw new Error("DUPLICATE_OPERATION");

      const requested = new Decimal(quantity);
      const pendingForLine = await tx.kitchen_return_requests.findMany({
        where: { dispatch_line_id: line.id, status: { in: ["PENDING", "PARTIAL"] } },
        select: { quantity: true, received_quantity: true },
      });
      const reservedLine = pendingForLine.reduce(
        (sum, item) => sum.plus(item.quantity.minus(item.received_quantity)),
        new Decimal(0),
      );
      if (requested.gt(line.sent_quantity.minus(line.served_quantity).minus(line.returned_quantity).minus(reservedLine))) {
        throw new Error("QUANTITY_EXCEEDS_REMAINING");
      }

      const lockedBalance = await tx.$queryRaw<Array<{ quantity: Decimal }>>(Prisma.sql`
        SELECT quantity FROM stock_location_balances
        WHERE batch_id = ${line.batch_id} AND location = 'CUISINE' FOR UPDATE
      `);
      const balance = lockedBalance[0]?.quantity ?? new Decimal(0);
      const pendingForBatch = await tx.kitchen_return_requests.findMany({
        where: { batch_id: line.batch_id, status: { in: ["PENDING", "PARTIAL"] } },
        select: { quantity: true, received_quantity: true },
      });
      const reservedBatch = pendingForBatch.reduce(
        (sum, item) => sum.plus(item.quantity.minus(item.received_quantity)),
        new Decimal(0),
      );
      if (requested.gt(balance.minus(reservedBatch))) throw new Error("INSUFFICIENT_KITCHEN_STOCK");

      return tx.kitchen_return_requests.create({
        data: {
          dispatch_line_id: line.id,
          product_id: line.product_id,
          batch_id: line.batch_id,
          quantity: requested,
          operation_key: operationKey,
          reason: body.reason?.trim() || null,
          requested_by: auth.userId!,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ success: true, data: { request } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Cette demande a déjà été enregistrée" }, { status: 409 });
    }
    if (message === "CUISINE_LINE_NOT_FOUND") return NextResponse.json({ error: "Ligne Cuisine introuvable" }, { status: 404 });
    if (message === "DUPLICATE_OPERATION") return NextResponse.json({ error: "Cette demande a déjà été enregistrée" }, { status: 409 });
    if (message === "QUANTITY_EXCEEDS_REMAINING") return NextResponse.json({ error: "La quantité dépasse le reliquat non consommé" }, { status: 409 });
    if (message === "INSUFFICIENT_KITCHEN_STOCK") return NextResponse.json({ error: "Le stock Cuisine disponible est insuffisant" }, { status: 409 });
    console.error("[POST /api/cuisine/:lineId/returns]", error);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement de la demande de retour" }, { status: 500 });
  }
}
