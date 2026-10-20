/**
 * lib/services/inventoryService.ts — SOURCE UNIQUE
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * RÈGLE FONDAMENTALE :
 *
 *   theoretical_quantity = somme des stock_batches.quantity_remaining
 *   real_quantity        = theoretical_quantity (toujours égales)
 *   difference           = 0 (toujours)
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * recordInventoryCount(newPhysicalQty) — logique correcte :
 *
 *   delta = newPhysicalQty - theoretical_actuelle
 *
 *   SURPLUS (delta > 0) :
 *     → Crée 1 lot ADJ dans stock_batches (quantity_initial = quantity_remaining = delta)
 *     → AUCUN mouvement dans stock_movements
 *       (le lot suffit : theoretical monte automatiquement via la somme des lots)
 *
 *   MANQUE (delta < 0) :
 *     → Débite les lots FIFO dans stock_batches
 *     → Crée 1 mouvement ADJUSTMENT dans stock_movements (c'est la sortie réelle)
 *
 *   AUCUN ÉCART (delta = 0) :
 *     → Aucune modification des lots, snapshot confirmé
 *
 * stock_movements = UNIQUEMENT les sorties réelles (OUT, LOSS, EXPIRED, ADJUSTMENT négatif)
 * Un surplus de comptage n'est PAS une sortie → pas de stock_movement.
 * ══════════════════════════════════════════════════════════════════════════════
 * updateInventorySnapshot(productId) :
 *   recalcule theoretical depuis les lots
 *   real = theoretical (toujours), difference = 0 (toujours)
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { prisma }  from "@/lib/prisma";
import { z }       from "zod";
import { Decimal } from "@prisma/client/runtime/library";

/* ─── Types ──────────────────────────────────────────────────────────────────── */

export interface InventorySnapshot {
  id:                   number;
  product_id:           number;
  theoretical_quantity: number;
  real_quantity:        number;
  difference:           number;
  total_value:          number;
  last_updated_at:      Date;
  verified_by:          number | null;
}

export interface InventoryCount {
  id:                   number;
  product_id:           number;
  theoretical_quantity: number;
  real_quantity:        number;
  difference:           number;
  user_id:              number;
  notes:                string | null;
  created_at:           Date;
}

export const createInventoryCountSchema = z.object({
  product_id:    z.number().int().positive(),
  real_quantity: z.number().nonnegative(),
  notes:         z.string().optional(),
});

type TxClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/* ─────────────────────────────────────────────────────────────────────────────
   updateInventorySnapshot
   Recalcule le snapshot depuis les lots actifs.
   real = theoretical = somme des lots. difference = 0.
   Peut être appelée dans une transaction Prisma (passer tx).
───────────────────────────────────────────────────────────────────────────── */
export async function updateInventorySnapshot(
  productId:   number,
  tx?:         TxClient,
  verifiedBy?: number,
): Promise<void> {
  const client = (tx ?? prisma) as typeof prisma;
  try {
    const batches = await client.stock_batches.findMany({
      where:  { product_id: productId },
      select: { quantity_remaining: true, purchase_price: true },
    });

    const qty   = batches.reduce((s, b) => s + Number(b.quantity_remaining), 0);
    const value = batches.reduce((s, b) => s + Number(b.quantity_remaining) * Number(b.purchase_price), 0);

    await client.inventory_snapshots.upsert({
      where:  { product_id: productId },
      update: {
        theoretical_quantity: new Decimal(qty),
        real_quantity:        new Decimal(qty),   // real = theoretical TOUJOURS
        difference:           new Decimal(0),
        total_value:          new Decimal(value),
        last_updated_at:      new Date(),
        ...(verifiedBy !== undefined ? { verified_by: verifiedBy } : {}),
      },
      create: {
        product_id:           productId,
        theoretical_quantity: new Decimal(qty),
        real_quantity:        new Decimal(qty),   // real = theoretical TOUJOURS
        difference:           new Decimal(0),
        total_value:          new Decimal(value),
        ...(verifiedBy !== undefined ? { verified_by: verifiedBy } : {}),
      },
    });
  } catch (err) {
    console.error(`[inventoryService] updateInventorySnapshot(${productId}) failed:`, err);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   recordInventoryCount
   Ajuste les lots selon l'écart constaté et met à jour le snapshot.

   SURPLUS  → lot ADJ créé dans stock_batches SEULEMENT (pas de stock_movement)
   MANQUE   → débit FIFO stock_batches + 1 mouvement ADJUSTMENT dans stock_movements
───────────────────────────────────────────────────────────────────────────── */
export async function recordInventoryCount(
  input:  unknown,
  userId: number,
): Promise<InventoryCount> {
  const { product_id, real_quantity, notes } = createInventoryCountSchema.parse(input);

  return prisma.$transaction(async (tx) => {

    // ── 1. Lots actuels (FIFO pour éventuel débit) ─────────────────────────
    const batches = await tx.stock_batches.findMany({
      where:   { product_id },
      select:  { id: true, quantity_remaining: true, purchase_price: true },
      orderBy: { entry_date: "asc" },
    });
    const theoreticalBefore = batches.reduce((s, b) => s + Number(b.quantity_remaining), 0);
    const delta             = real_quantity - theoreticalBefore;

    // ── 2. Ajustement selon le signe du delta ──────────────────────────────
    if (Math.abs(delta) > 0.0001) {

      if (delta > 0) {
        // ── SURPLUS : lot ADJ uniquement, AUCUN mouvement stock ────────────
        //   Le lot entre dans stock_batches → theoretical monte via la somme.
        //   Pas besoin d'un stock_movement : un surplus n'est pas une sortie.
        await tx.stock_batches.create({
          data: {
            product_id,
            user_id:            userId,
            batch_number:       `ADJ-${Date.now()}`,
            quantity_initial:   new Decimal(delta),
            quantity_remaining: new Decimal(delta),
            purchase_price:     new Decimal(0),
            entry_date:         new Date(),
            notes:              notes
              ? `[Ajustement inventaire +${delta.toFixed(2)}] ${notes}`
              : `Ajustement inventaire — surplus constaté +${delta.toFixed(2)}`,
          },
        });

      } else {
        // ── MANQUE : débit FIFO + 1 seul mouvement ADJUSTMENT ─────────────
        let toDeduct     = Math.abs(delta);
        let firstBatchId: number | null = null;

        for (const batch of batches) {
          if (toDeduct <= 0) break;
          const take      = Math.min(toDeduct, Number(batch.quantity_remaining));
          const newRemain = Number(batch.quantity_remaining) - take;

          await tx.stock_batches.update({
            where: { id: batch.id },
            data:  { quantity_remaining: new Decimal(newRemain), updated_at: new Date() },
          });

          if (firstBatchId === null) firstBatchId = batch.id;
          toDeduct -= take;
        }

        // 1 seul mouvement ADJUSTMENT (sortie) pour la traçabilité
        await tx.stock_movements.create({
          data: {
            product_id,
            batch_id:         firstBatchId,
            type:             "ADJUSTMENT",
            quantity:         new Decimal(Math.abs(delta)),
            reason:           notes
              ? `[Ajustement inventaire -${Math.abs(delta).toFixed(2)}] ${notes}`
              : `Inventaire physique : manque constaté -${Math.abs(delta).toFixed(2)}`,
            reference_number: `ADJ-${Date.now()}`,
            user_id:          userId,
          },
        });
      }
    }

    // ── 3. Recalculer depuis les lots APRÈS ajustement ─────────────────────
    const updatedBatches = await tx.stock_batches.findMany({
      where:  { product_id },
      select: { quantity_remaining: true, purchase_price: true },
    });
    const newTheoQty  = updatedBatches.reduce((s, b) => s + Number(b.quantity_remaining), 0);
    const newTotalVal = updatedBatches.reduce((s, b) => s + Number(b.quantity_remaining) * Number(b.purchase_price), 0);

    // ── 4. Historique du comptage dans inventory_counts ────────────────────
    const count = await tx.inventory_counts.create({
      data: {
        product_id,
        theoretical_quantity: new Decimal(theoreticalBefore),          // avant ajustement
        real_quantity:        new Decimal(real_quantity),               // valeur saisie
        difference:           new Decimal(real_quantity - theoreticalBefore), // écart historique
        user_id:              userId,
        notes:                notes ?? null,
      },
    });

    // ── 5. Snapshot : real = theoretical = newTheoQty ─────────────────────
    await tx.inventory_snapshots.upsert({
      where:  { product_id },
      create: {
        product_id,
        theoretical_quantity: new Decimal(newTheoQty),
        real_quantity:        new Decimal(newTheoQty),
        difference:           new Decimal(0),
        total_value:          new Decimal(newTotalVal),
        verified_by:          userId,
      },
      update: {
        theoretical_quantity: new Decimal(newTheoQty),
        real_quantity:        new Decimal(newTheoQty),
        difference:           new Decimal(0),
        total_value:          new Decimal(newTotalVal),
        last_updated_at:      new Date(),
        verified_by:          userId,
      },
    });

    return {
      id:                   count.id,
      product_id:           count.product_id,
      theoretical_quantity: Number(count.theoretical_quantity),
      real_quantity:        Number(count.real_quantity),
      difference:           Number(count.difference),
      user_id:              count.user_id,
      notes:                count.notes,
      created_at:           count.created_at,
    } as InventoryCount;
  });
}

/* ─── Fonctions de lecture ─────────────────────────────────────────────────── */

export async function getAllInventorySnapshots(): Promise<unknown[]> {
  const snapshots = await prisma.inventory_snapshots.findMany({
    orderBy: { last_updated_at: "desc" },
  });
  const productIds = [...new Set(snapshots.map((snapshot) => snapshot.product_id))];
  const products = productIds.length
    ? await prisma.products.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          minimum_stock: true,
          category: { select: { name: true } },
          unit: { select: { abbreviation: true, name: true } },
        },
      })
    : [];
  const productsById = new Map(products.map((product) => [product.id, product]));

  return snapshots.map(s => {
    const product = productsById.get(s.product_id);
    return {
    id:                   s.id,
    product_id:           s.product_id,
    product_name:         product?.name               ?? "",
    category_name:        product?.category?.name     ?? "",
    unit_abbreviation:    product?.unit?.abbreviation ?? "",
    unit_name:            product?.unit?.name         ?? "",
    minimum_stock:        product?.minimum_stock       ?? null,
    physical_quantity:    Number(s.theoretical_quantity),
    theoretical_quantity: Number(s.theoretical_quantity),
    variance:             0,
    variance_percentage:  0,
    last_count_date:      s.last_updated_at,
    total_value:          Number(s.total_value),
    };
  });
}

export async function getInventorySnapshotForProduct(
  productId: number,
): Promise<InventorySnapshot | null> {
  const s = await prisma.inventory_snapshots.findUnique({ where: { product_id: productId } });
  if (!s) return null;
  return {
    ...s,
    theoretical_quantity: Number(s.theoretical_quantity),
    real_quantity:        Number(s.real_quantity),
    difference:           Number(s.difference),
    total_value:          Number(s.total_value),
  };
}

export async function getInventoryCountHistory(productId: number, limit = 50): Promise<InventoryCount[]> {
  const counts = await prisma.inventory_counts.findMany({
    where:   { product_id: productId },
    orderBy: { created_at: "desc" },
    take:    limit,
  });
  return counts.map(c => ({
    ...c,
    theoretical_quantity: Number(c.theoretical_quantity),
    real_quantity:        Number(c.real_quantity),
    difference:           Number(c.difference),
  }));
}

export async function getVarianceReport() {
  // Variance = historique des inventory_counts (le snapshot courant est toujours à 0)
  const counts = await prisma.inventory_counts.findMany({
    orderBy:  { created_at: "desc" },
  });
  const seen = new Set<number>();
  const latestCounts = counts.filter((count) => {
    if (seen.has(count.product_id)) return false;
    seen.add(count.product_id);
    return true;
  });
  const productIds = latestCounts.map((count) => count.product_id);
  const products = productIds.length
    ? await prisma.products.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, category: { select: { name: true } } },
      })
    : [];
  const productsById = new Map(products.map((product) => [product.id, product]));

  return latestCounts
    .filter(c => Math.abs(Number(c.difference)) > 0.0001)
    .map(c => {
      const product = productsById.get(c.product_id);
      return {
      product_id:           c.product_id,
      product_name:         product?.name           ?? null,
      category_name:        product?.category?.name ?? null,
      theoretical_quantity: Number(c.theoretical_quantity),
      real_quantity:        Number(c.real_quantity),
      difference:           Number(c.difference),
      last_count_date:      c.created_at,
      };
    });
}

export async function getDailyInventorySummary() {
  const result = await prisma.inventory_snapshots.aggregate({
    _count: { product_id: true },
    _sum:   { theoretical_quantity: true, total_value: true },
  });
  return {
    total_products: result._count.product_id,
    total_quantity: Number(result._sum.theoretical_quantity ?? 0),
    total_value:    Number(result._sum.total_value          ?? 0),
    total_variance: 0,
  };
}
