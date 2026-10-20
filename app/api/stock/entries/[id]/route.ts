/**
 * app/api/stock/entries/[id]/route.ts — Next.js 15
 *
 * GET    → détail complet d'un lot
 * PATCH  → modifier prix / expiry / notes / qty_initial (si aucun mouvement)
 * DELETE → supprimer lot + recalculer snapshot (real = theoretical)
 *
 * ── Contraintes métier ──────────────────────────────────────────────────────
 *   • qty_initial modifiable SEULEMENT si qty_remaining === qty_initial
 *   • expiration_date ≥ entry_date
 *   • DELETE bloqué si mouvements existent OU qty_remaining ≠ qty_initial
 *
 * ── Snapshot ──────────────────────────────────────────────────────────────
 *   Après toute opération : real_quantity = theoretical_quantity (règle fondamentale)
 *
 * ── Audit ────────────────────────────────────────────────────────────────────
 *   Utilise activityLog (String action) et NON auditLog (enum AuditAction)
 *   car le schéma Prisma ne contient pas CREATE_STOCK_ENTRY dans AuditAction.
 */

import { NextRequest, NextResponse }         from "next/server";
import { prisma }                             from "@/lib/prisma";
import { getUserIdFromRequest, auditStock }   from "@/lib/services/auditLogService";
import { Decimal }                            from "@prisma/client/runtime/library";

type RouteContext = { params: Promise<{ id: string }> };

/* ─── GET ──────────────────────────────────────────────────────────────────── */

export async function GET(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id: rawId } = await ctx.params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    const batch = await prisma.stock_batches.findUnique({
      where:   { id },
      include: {
        product: { include: { unit: true, category: true } },
        stock_movements: {
          orderBy: { created_at: "desc" },
          include: { product: { select: { name: true } } },
        },
      },
    });
    if (!batch) return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });

    const creator = await prisma.user.findUnique({
      where: { id: batch.user_id },
      select: { id: true, fullName: true, email: true },
    });

    const hasMovements   = batch.stock_movements.length > 0;
    const partlyConsumed = Number(batch.quantity_remaining) !== Number(batch.quantity_initial);

    return NextResponse.json({
      success: true,
      data: {
        batch: { ...batch, user: creator },
        meta: {
          canEdit:   !partlyConsumed,
          canDelete: !hasMovements && !partlyConsumed,
          hasMovements,
          fullyConsumed: Number(batch.quantity_remaining) === 0,
        },
      },
    });
  } catch (err) {
    console.error("[GET /api/stock/entries/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ─── PATCH ────────────────────────────────────────────────────────────────── */

export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id: rawId } = await ctx.params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    const existing = await prisma.stock_batches.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });

    const body = await req.json() as {
      purchase_price?:   number;
      expiration_date?:  string | null;
      notes?:            string | null;
      quantity_initial?: number;
    };

    const errors: Record<string, string> = {};
    if (body.purchase_price !== undefined && Number(body.purchase_price) < 0)
      errors.purchase_price = "Le prix ne peut pas être négatif";

    if (body.expiration_date) {
      const expDate   = new Date(body.expiration_date);
      const entryDate = new Date(existing.entry_date);
      if (expDate < entryDate)
        errors.expiration_date = "La date d'expiration doit être ≥ à la date d'entrée";
    }

    if (body.quantity_initial !== undefined) {
      const qiNew      = Number(body.quantity_initial);
      const noMovement = Number(existing.quantity_remaining) === Number(existing.quantity_initial);
      if (isNaN(qiNew) || qiNew <= 0)
        errors.quantity_initial = "La quantité initiale doit être > 0";
      else if (!noMovement)
        errors.quantity_initial = "Impossible de modifier : des sorties ont déjà été enregistrées";
      else if (qiNew < Number(existing.quantity_remaining))
        errors.quantity_initial = "Ne peut pas être inférieure à la quantité restante";
    }

    if (Object.keys(errors).length > 0)
      return NextResponse.json({ error: "Données invalides", fields: errors }, { status: 422 });

    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (body.purchase_price   !== undefined) updateData.purchase_price   = new Decimal(Number(body.purchase_price));
    if (body.expiration_date  !== undefined) updateData.expiration_date  = body.expiration_date ? new Date(body.expiration_date) : null;
    if (body.notes            !== undefined) updateData.notes            = body.notes;
    if (body.quantity_initial !== undefined) {
      updateData.quantity_initial   = new Decimal(Number(body.quantity_initial));
      updateData.quantity_remaining = new Decimal(Number(body.quantity_initial));
    }

    // ── Si qty change → transaction avec recalcul snapshot ─────────────────
    if (body.quantity_initial !== undefined) {
      await prisma.$transaction(async (tx) => {
        await tx.stock_batches.update({ where: { id }, data: updateData });

        const allBatches = await tx.stock_batches.findMany({
          where:  { product_id: existing.product_id },
          select: { quantity_remaining: true, purchase_price: true },
        });
        const newQty   = allBatches.reduce((s, b) => s + Number(b.quantity_remaining), 0);
        const newValue = allBatches.reduce((s, b) => s + Number(b.quantity_remaining) * Number(b.purchase_price), 0);

        // real = theoretical TOUJOURS
        await tx.inventory_snapshots.upsert({
          where:  { product_id: existing.product_id },
          create: {
            product_id:           existing.product_id,
            theoretical_quantity: new Decimal(newQty),
            real_quantity:        new Decimal(newQty),
            difference:           new Decimal(0),
            total_value:          new Decimal(newValue),
          },
          update: {
            theoretical_quantity: new Decimal(newQty),
            real_quantity:        new Decimal(newQty),
            difference:           new Decimal(0),
            total_value:          new Decimal(newValue),
          },
        });
      });
    } else {
      // Pas de changement de qty : simple mise à jour
      await prisma.stock_batches.update({ where: { id }, data: updateData });
    }

    const updated = await prisma.stock_batches.findUnique({
      where:   { id },
      include: {
        product: { include: { unit: true, category: true } },
      },
    });

    const creator = updated
      ? await prisma.user.findUnique({
          where: { id: updated.user_id },
          select: { id: true, fullName: true, email: true },
        })
      : null;

    await auditStock.updateEntry(req, userId, id, {
      before: {
        purchase_price:   Number(existing.purchase_price),
        expiration_date:  existing.expiration_date,
        notes:            existing.notes,
        quantity_initial: Number(existing.quantity_initial),
      },
      after: updateData,
    });

    return NextResponse.json({
      success: true,
      data: { batch: updated ? { ...updated, user: creator } : null },
    });

  } catch (err) {
    console.error("[PATCH /api/stock/entries/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ─── DELETE ───────────────────────────────────────────────────────────────── */

export async function DELETE(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id: rawId } = await ctx.params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    const batch = await prisma.stock_batches.findUnique({
      where:   { id },
      include: { stock_movements: { take: 1 } },
    });
    if (!batch) return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });

    if (batch.stock_movements.length > 0) {
      return NextResponse.json(
        {
          error:  "Suppression impossible",
          reason: "Ce lot a déjà fait l'objet de mouvements de stock. Soldez le lot via un ajustement avant de le supprimer.",
        },
        { status: 409 },
      );
    }

    if (Number(batch.quantity_remaining) !== Number(batch.quantity_initial)) {
      return NextResponse.json(
        {
          error:  "Suppression impossible",
          reason: `La quantité restante (${Number(batch.quantity_remaining)}) ≠ quantité initiale (${Number(batch.quantity_initial)}). Le lot a été partiellement consommé.`,
        },
        { status: 409 },
      );
    }

    const productId = batch.product_id;

    // ── Transaction : supprimer lot + recalculer snapshot ───────────────────
    await prisma.$transaction(async (tx) => {
      await tx.stock_batches.delete({ where: { id } });

      // Recalculer depuis les lots restants (le lot supprimé n'est plus là)
      const remainingBatches = await tx.stock_batches.findMany({
        where:  { product_id: productId },
        select: { quantity_remaining: true, purchase_price: true },
      });
      const newQty   = remainingBatches.reduce((s, b) => s + Number(b.quantity_remaining), 0);
      const newValue = remainingBatches.reduce((s, b) => s + Number(b.quantity_remaining) * Number(b.purchase_price), 0);

      // real = theoretical TOUJOURS
      await tx.inventory_snapshots.upsert({
        where:  { product_id: productId },
        create: {
          product_id:           productId,
          theoretical_quantity: new Decimal(newQty),
          real_quantity:        new Decimal(newQty),
          difference:           new Decimal(0),
          total_value:          new Decimal(newValue),
        },
        update: {
          theoretical_quantity: new Decimal(newQty),
          real_quantity:        new Decimal(newQty),
          difference:           new Decimal(0),
          total_value:          new Decimal(newValue),
        },
      });
    });

    await auditStock.deleteEntry(req, userId, id, {
      product_id:   productId,
      batch_number: batch.batch_number,
      quantity:     Number(batch.quantity_initial),
    });

    return NextResponse.json({ success: true, message: "Lot supprimé et inventaire mis à jour" });

  } catch (err) {
    console.error("[DELETE /api/stock/entries/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
