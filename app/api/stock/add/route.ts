/**
 * app/api/stock/add/route.ts
 * POST → crée un lot de stock (stock_batches) + mouvement IN + snapshot inventaire
 */
import { NextRequest, NextResponse }              from "next/server";
import { prisma }                                  from "@/lib/prisma";
import { getUserIdFromRequest, auditStock }        from "@/lib/services/auditLogService";
import { updateInventorySnapshot }                 from "@/lib/services/inventoryService";
import { Decimal }                                 from "@prisma/client/runtime/library";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const body = await req.json() as {
      product_id:        number;
      batch_number:      string;
      quantity_initial:  number;
      purchase_price:    number;
      entry_date?:       string;
      expiration_date?:  string | null;
      notes?:            string | null;
    };

    const errors: Record<string, string> = {};
    if (!body.product_id)       errors.product_id      = "product_id requis";
    if (!body.batch_number)     errors.batch_number    = "batch_number requis";
    if (!body.quantity_initial || Number(body.quantity_initial) <= 0)
      errors.quantity_initial = "Quantité > 0 requise";
    if (body.purchase_price === undefined || Number(body.purchase_price) < 0)
      errors.purchase_price = "Prix ≥ 0 requis";
    if (body.expiration_date && body.entry_date) {
      if (new Date(body.expiration_date) < new Date(body.entry_date))
        errors.expiration_date = "La date d'expiration doit être ≥ à la date d'entrée";
    }
    if (Object.keys(errors).length > 0)
      return NextResponse.json({ error: "Données invalides", fields: errors }, { status: 400 });

    const product = await prisma.products.findUnique({ where: { id: Number(body.product_id) } });
    if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

    // Vérifier numéro de lot unique pour ce produit
    const existing = await prisma.stock_batches.findFirst({
      where: { product_id: Number(body.product_id), batch_number: body.batch_number },
    });
    if (existing)
      return NextResponse.json({ error: "Ce numéro de lot existe déjà pour ce produit" }, { status: 409 });

    // ── Transaction : créer lot + mouvement IN + snapshot ───────────────────
    const batch = await prisma.$transaction(async (tx) => {
      const newBatch = await tx.stock_batches.create({
        data: {
          product_id:         Number(body.product_id),
          user_id:            userId,
          batch_number:       body.batch_number,
          quantity_initial:   new Decimal(body.quantity_initial),
          quantity_remaining: new Decimal(body.quantity_initial),
          purchase_price:     new Decimal(body.purchase_price),
          entry_date:         body.entry_date ? new Date(body.entry_date) : new Date(),
          expiration_date:    body.expiration_date ? new Date(body.expiration_date) : null,
          notes:              body.notes ?? null,
        },
        include: {
          product: { include: { unit: true, category: true } },
          
        },
      });

      return newBatch;
    });

    // Mettre à jour le snapshot : real = theoretical = nouvelle somme des lots
    await updateInventorySnapshot(Number(body.product_id));

    // Audit via activityLog (pas AuditLog — enum incompatible)
    await auditStock.createEntry(req, userId, batch.id, {
      product_id:   batch.product_id,
      batch_number: batch.batch_number,
      quantity:     Number(batch.quantity_initial),
      price:        Number(batch.purchase_price),
    });

    return NextResponse.json({ success: true, data: { batch } }, { status: 201 });

  } catch (err) {
    console.error("[POST /api/stock/add]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}