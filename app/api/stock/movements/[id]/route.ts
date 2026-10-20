/**
 * app/api/stock/movements/[id]/route.ts — Next.js 15
 *
 * GET    → détail d'un mouvement
 * PATCH  → modifier raison / référence (type, qty, product_id NON modifiables)
 * DELETE → supprimer + restituer qty + recalculer snapshot (real = theoretical)
 *
 * ── Contraintes métier ──────────────────────────────────────────────────────
 *   • Un mouvement IN ne peut pas être supprimé ici → /api/stock/entries/:id
 *   • DELETE → transaction : suppression + restitution lot + snapshot
 *   • Après suppression : real_quantity = theoretical_quantity (règle fondamentale)
 *
 * ── Audit ────────────────────────────────────────────────────────────────────
 *   Utilise activityLog (String action) et NON auditLog (enum AuditAction)
 *   car le schéma Prisma ne contient pas CREATE_STOCK_EXIT dans AuditAction.
 */

import { NextRequest, NextResponse }         from "next/server";
import { prisma }                             from "@/lib/prisma";
import { getUserIdFromRequest, auditStock }   from "@/lib/services/auditLogService";
import { updateInventorySnapshot }            from "@/lib/services/inventoryService";
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
    const movement = await prisma.stock_movements.findUnique({
      where:   { id },
      include: {
        product: { include: { unit: true, category: true } },
        batch: {
          select: {
            id: true, batch_number: true,
            quantity_initial: true, quantity_remaining: true,
            purchase_price: true, entry_date: true, expiration_date: true,
          },
        },
      },
    });
    if (!movement) return NextResponse.json({ error: "Mouvement introuvable" }, { status: 404 });

    const user = await prisma.user.findUnique({
      where:  { id: movement.user_id },
      select: { id: true, fullName: true, email: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        movement: { ...movement, user },
        meta: {
          canDelete: movement.type !== "IN",
          canEdit:   movement.type !== "IN",
        },
      },
    });
  } catch (err) {
    console.error("[GET /api/stock/movements/:id]", err);
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
    const existing = await prisma.stock_movements.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Mouvement introuvable" }, { status: 404 });

    if (existing.type === "IN") {
      return NextResponse.json(
        { error: "Un mouvement d'entrée ne peut pas être modifié ici. Utilisez /api/stock/entries/:id" },
        { status: 400 },
      );
    }

    const body = await req.json() as { reason?: string; reference_number?: string };

    const errors: Record<string, string> = {};
    if (body.reason !== undefined && !String(body.reason).trim())
      errors.reason = "La raison ne peut pas être vide";
    if (Object.keys(errors).length > 0)
      return NextResponse.json({ error: "Données invalides", fields: errors }, { status: 422 });

    const updateData: Record<string, unknown> = {};
    if (body.reason           !== undefined) updateData.reason           = body.reason;
    if (body.reference_number !== undefined) updateData.reference_number = body.reference_number;

    const updated = await prisma.stock_movements.update({
      where:   { id },
      data:    updateData,
      include: { product: { include: { unit: true } } },
    });

    const user = await prisma.user.findUnique({
      where:  { id: updated.user_id },
      select: { id: true, fullName: true, email: true },
    });

    await auditStock.updateExit(req, userId, id, {
      before: { reason: existing.reason, reference_number: existing.reference_number },
      after:  updateData,
    });

    return NextResponse.json({ success: true, data: { movement: { ...updated, user } } });

  } catch (err) {
    console.error("[PATCH /api/stock/movements/:id]", err);
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
    const movement = await prisma.stock_movements.findUnique({
      where:   { id },
      include: { product: true },
    });
    if (!movement) return NextResponse.json({ error: "Mouvement introuvable" }, { status: 404 });

    // Mouvements IN = gérés par /api/stock/entries/:id
    if (movement.type === "IN") {
      return NextResponse.json(
        {
          error:  "Suppression impossible",
          reason: "Un mouvement d'entrée (IN) ne peut pas être supprimé ici. Supprimez le lot via /api/stock/entries/:id.",
        },
        { status: 400 },
      );
    }

    const qtyToRestore = Number(movement.quantity);
    const productId    = movement.product_id;

    // ── Transaction atomique ──────────────────────────────────────────────
    await prisma.$transaction(async (tx) => {

      // 1. Supprimer le mouvement
      await tx.stock_movements.delete({ where: { id } });

      // 2. Restituer qty dans le lot source (si batch lié)
      if (movement.batch_id) {
        const batch = await tx.stock_batches.findUnique({
          where:  { id: movement.batch_id },
          select: { quantity_initial: true, quantity_remaining: true },
        });
        if (batch) {
          // Ne pas dépasser quantity_initial
          const newRemaining = Math.min(
            Number(batch.quantity_remaining) + qtyToRestore,
            Number(batch.quantity_initial),
          );
          await tx.stock_batches.update({
            where: { id: movement.batch_id! },
            data:  { quantity_remaining: new Decimal(newRemaining), updated_at: new Date() },
          });
        }
      }

      // 3. Recalculer snapshot : real = theoretical = somme des lots
      const allBatches = await tx.stock_batches.findMany({
        where:  { product_id: productId },
        select: { quantity_remaining: true, purchase_price: true },
      });
      const newQty   = allBatches.reduce((s, b) => s + Number(b.quantity_remaining), 0);
      const newValue = allBatches.reduce((s, b) => s + Number(b.quantity_remaining) * Number(b.purchase_price), 0);

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

    await auditStock.deleteExit(req, userId, id, {
      product_id:       productId,
      type:             movement.type,
      qty_restored:     qtyToRestore,
      reference_number: movement.reference_number,
    });

    return NextResponse.json({ success: true, message: "Mouvement supprimé et stock restitué" });

  } catch (err) {
    console.error("[DELETE /api/stock/movements/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}