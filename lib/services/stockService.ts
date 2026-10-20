import { prisma } from '@/server/db/prisma';

export type StockBatch = import('@prisma/client').stock_batches;
export type StockMovement = import('@prisma/client').stock_movements;

export async function createStockBatch(
  data: Omit<StockBatch, 'id' | 'created_at' | 'updated_at' | 'quantity_remaining'>
): Promise<StockBatch> {
  return prisma.stock_batches.create({
    data: {
      ...data,
      quantity_remaining: data.quantity_initial,
    },
  });
}

export async function getStockBatchesForProduct(productId: number): Promise<StockBatch[]> {
  return prisma.stock_batches.findMany({
    where: {
      product_id: productId,
      quantity_remaining: { gt: 0 },
    },
    orderBy: { entry_date: 'asc' },
  });
}

export async function consumeStockFIFO(
  productId: number,
  quantityToConsume: number,
  userId: number,
  reason?: string,
  reference_number?: string,
  type: string = 'OUT'   // ✅ paramètre ajouté
): Promise<StockMovement[]> {
  let remaining = quantityToConsume;

  const batches = await prisma.stock_batches.findMany({
    where: { product_id: productId, quantity_remaining: { gt: 0 } },
    orderBy: { entry_date: 'asc' },
  });

  const snapshot = await prisma.inventory_snapshots.findUnique({
    where: { product_id: productId },
  });

  const lotsTotal = batches.reduce((sum, b) => sum + Number(b.quantity_remaining), 0);
  const globalStock = snapshot ? Number(snapshot.real_quantity) : 0;

  if (globalStock > lotsTotal) {
    throw new Error(
      'Stock désynchronisé : le stock global est supérieur à la somme des lots. Veuillez régulariser l\'inventaire.'
    );
  }

  const movements: StockMovement[] = [];

  for (const batch of batches) {
    if (remaining <= 0) break;
    const consume = Math.min(Number(batch.quantity_remaining), remaining);

    await prisma.stock_batches.update({
      where: { id: batch.id },
      data: { quantity_remaining: { decrement: consume } },
    });

    const movement = await prisma.stock_movements.create({
      data: {
        product_id: productId,
        batch_id:   batch.id,
        type:       type as any,   // ✅ type dynamique
        quantity:   consume,
        reason:     reason || null,
        reference_number: reference_number || null,
        user_id:    userId,
      },
    });

    movements.push(movement);
    remaining -= consume;
  }

  if (remaining > 0) throw new Error('Stock insuffisant');
  return movements;
}

export async function getStockMovements(
  productId: number,
  limit = 50
): Promise<StockMovement[]> {
  return prisma.stock_movements.findMany({
    where: { product_id: productId },
    orderBy: { created_at: 'desc' },
    take: limit,
  });
}

// ── API/AlertService compatibility exports ───────────────────────────────────

export async function addStock(
  product_id: number,
  batch_number: string,
  quantity_initial: number,
  purchase_price: number,
  user_id: number,
  entry_date?: Date,
  expiration_date?: Date,
  notes?: string
): Promise<StockBatch> {
  return prisma.stock_batches.create({
    data: {
      product_id,
      user_id,
      batch_number,
      quantity_initial,
      quantity_remaining: quantity_initial,
      purchase_price,
      entry_date:      entry_date      || new Date(),
      expiration_date: expiration_date || null,
      notes:           notes           || null,
    },
  });
}

// ✅ Signature mise à jour : accepte type en 6e paramètre
export async function consumeStock(
  product_id: number,
  quantity: number,
  reason: string,
  user_id: number,
  reference_number?: string,
  type: string = 'OUT'
): Promise<StockMovement[]> {
  return consumeStockFIFO(product_id, quantity, user_id, reason, reference_number, type);
}

export async function getExpiredBatches(
  product_id: number,
  asOf: Date = new Date()
): Promise<StockBatch[]> {
  return prisma.stock_batches.findMany({
    where: {
      product_id,
      expiration_date: { lt: asOf },
      quantity_remaining: { gt: 0 },
    },
    orderBy: { expiration_date: 'asc' },
  });
}

export async function getExpiringBatches(
  product_id: number,
  days = 7,
  asOf: Date = new Date()
): Promise<StockBatch[]> {
  const soon = new Date(asOf);
  soon.setDate(soon.getDate() + days);
  return prisma.stock_batches.findMany({
    where: {
      product_id,
      expiration_date: { gte: asOf, lte: soon },
      quantity_remaining: { gt: 0 },
    },
    orderBy: { expiration_date: 'asc' },
  });
}

export async function getTotalAvailableQuantity(product_id: number): Promise<number> {
  const batches = await prisma.stock_batches.findMany({
    where: { product_id, quantity_remaining: { gt: 0 } },
    select: { quantity_remaining: true },
  });
  return batches.reduce((sum, b) => sum + Number(b.quantity_remaining), 0);
}

export async function getBatchesCountForProductDate(
  productId: number,
  date: string
): Promise<number> {
  return prisma.stock_batches.count({
    where: {
      product_id: productId,
      entry_date: {
        gte: new Date(date + 'T00:00:00.000Z'),
        lt:  new Date(date + 'T23:59:59.999Z'),
      },
    },
  });
}