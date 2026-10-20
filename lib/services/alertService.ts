/**
 * Alert Service
 * Manages automatic alerts for stock issues
 */

import { prisma } from '@/server/db/prisma';
import { getExpiredBatches, getExpiringBatches, getTotalAvailableQuantity } from './stockService';

export interface Alert {
  id: number;
  type: 'LOW_STOCK' | 'EXPIRED' | 'EXPIRING_SOON' | 'RUPTURE' | 'EXCESS';
  product_id: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  is_resolved: boolean;
  resolved_at: Date | null;
  created_at: Date;
}

/**
 * Create an alert using Prisma
 */
export async function createAlert(
  type: Alert['type'],
  productId: number,
  message: string,
  severity: Alert['severity'] = 'WARNING'
): Promise<number> {
  const alert = await prisma.alerts.create({
    data: { type, product_id: productId, message, severity },
  });
  return alert.id;
}

/**
 * Get active alerts (unresolved)
 */
export async function getActiveAlerts(
  limit: number = 100
): Promise<(Alert & { product_name: string })[]> {
  const alerts = await prisma.alerts.findMany({
    where: { is_resolved: false },
    orderBy: [{ severity: 'desc' }, { created_at: 'desc' }],
    take: limit,
  });
  const productIds = [...new Set(alerts.map((alert) => alert.product_id))];
  const products = productIds.length
    ? await prisma.products.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const productNames = new Map(products.map((product) => [product.id, product.name]));
  return alerts.map((alert) => ({ ...alert, product_name: productNames.get(alert.product_id) || '' }));
}

/**
 * Check for low stock alerts
 */
export async function checkLowStockAlerts(): Promise<void> {
  const products = await prisma.products.findMany({
    where: { is_active: true },
    select: { id: true, name: true, minimum_stock: true },
  });
  for (const product of products) {
    const currentQty = await getTotalAvailableQuantity(product.id);
    // minimum_stock is Decimal, so convert to number for comparison
    const minStock = typeof product.minimum_stock === 'object' && 'toNumber' in product.minimum_stock
      ? product.minimum_stock.toNumber()
      : Number(product.minimum_stock);
    if (currentQty < minStock) {
      const existing = await prisma.alerts.findFirst({
        where: {
          product_id: product.id,
          type: 'LOW_STOCK',
          is_resolved: false,
        },
      });
      if (!existing) {
        await createAlert(
          'LOW_STOCK',
          product.id,
          `Stock for ${product.name} is low: ${currentQty} (minimum: ${product.minimum_stock})`,
          'WARNING'
        );
      }
    } else {
      await prisma.alerts.updateMany({
        where: { product_id: product.id, type: 'LOW_STOCK', is_resolved: false },
        data: { is_resolved: true, resolved_at: new Date() },
      });
    }
  }
}

/** Keep expiration alerts in sync with the current non-empty stock batches. */
export async function checkExpirationAlerts(days = 7): Promise<void> {
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + days);
  const [expiredBatches, expiringBatches, existingAlerts] = await Promise.all([
    prisma.stock_batches.findMany({
      where: { expiration_date: { lt: now }, quantity_remaining: { gt: 0 } },
      select: { product_id: true },
    }),
    prisma.stock_batches.findMany({
      where: { expiration_date: { gte: now, lte: soon }, quantity_remaining: { gt: 0 } },
      select: { product_id: true },
    }),
    prisma.alerts.findMany({
      where: { type: { in: ['EXPIRED', 'EXPIRING_SOON'] }, is_resolved: false },
      select: { product_id: true, type: true },
    }),
  ]);
  const expiredIds = new Set(expiredBatches.map((batch) => batch.product_id));
  const expiringIds = new Set(expiringBatches.map((batch) => batch.product_id));
  const productIds = new Set([
    ...expiredIds,
    ...expiringIds,
    ...existingAlerts.map((alert) => alert.product_id),
  ]);

  for (const productId of productIds) {
    for (const type of ['EXPIRED', 'EXPIRING_SOON'] as const) {
      const isCurrentlyActive = type === 'EXPIRED' ? expiredIds.has(productId) : expiringIds.has(productId);
      const existing = await prisma.alerts.findFirst({
        where: { product_id: productId, type, is_resolved: false },
      });
      if (isCurrentlyActive && !existing) {
        await createAlert(
          type,
          productId,
          type === 'EXPIRED'
            ? 'Un ou plusieurs lots de ce produit sont périmés et ont encore du stock.'
            : `Un ou plusieurs lots de ce produit expirent dans les ${days} prochains jours.`,
          type === 'EXPIRED' ? 'CRITICAL' : 'WARNING',
        );
      } else if (!isCurrentlyActive && existing) {
        await prisma.alerts.updateMany({
          where: { product_id: productId, type, is_resolved: false },
          data: { is_resolved: true, resolved_at: new Date() },
        });
      }
    }
  }
}

/**
 * Resolve an alert by ID
 */
export async function resolveAlert(alertId: number): Promise<boolean> {
  const alert = await prisma.alerts.findUnique({
    where: { id: alertId },
  });
  if (!alert) return false;
  await prisma.alerts.update({
    where: { id: alertId },
    data: { is_resolved: true, resolved_at: new Date() },
  });
  return true;
}
