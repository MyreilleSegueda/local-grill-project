/**
 * Dashboard Service
 * Calculates KPIs and metrics for dashboard
 */

import { prisma } from '@/server/db/prisma';
import { toNumber } from '../utils/decimal';

export interface DashboardKPIs {
  totalStockValue: number;
  totalProducts: number;
  productsOutOfStock: number;
  productsLowStock: number;
  totalBatches: number;
  expiredBatches: number;
  expiringBatches: number;
  activeAlerts: number;
  criticalAlerts: number;
}

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  // Total stock value
  const stockBatches = await prisma.stock_batches.findMany({
    where: { quantity_remaining: { gt: 0 } },
    select: { quantity_remaining: true, purchase_price: true, expiration_date: true },
  });
  const totalStockValue = stockBatches.reduce((sum, b) => sum + Number(b.quantity_remaining) * Number(b.purchase_price), 0);

  // Products stats
  const products = await prisma.products.findMany({
    where: { is_active: true },
    include: { stock_batches: true },
  });
  const totalProducts = products.length;
  let productsOutOfStock = 0;
  let productsLowStock = 0;
  for (const p of products) {
    const totalQty = p.stock_batches.reduce((sum, b) => sum + Number(b.quantity_remaining), 0);
    if (totalQty === 0) productsOutOfStock++;
    else if (totalQty < toNumber(p.minimum_stock)) productsLowStock++;
  }

  // Batches stats
  const now = new Date();
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  let totalBatches = 0, expiredBatches = 0, expiringBatches = 0;
  for (const b of stockBatches) {
    totalBatches++;
    if (b.expiration_date && b.expiration_date < now) expiredBatches++;
    else if (b.expiration_date && b.expiration_date >= now && b.expiration_date <= in3days) expiringBatches++;
  }

  // Alerts
  const alerts = await prisma.alerts.findMany();
  const activeAlerts = alerts.filter(a => !a.is_resolved).length;
  const criticalAlerts = alerts.filter(a => !a.is_resolved && a.severity === 'CRITICAL').length;

  return {
    totalStockValue,
    totalProducts,

    productsOutOfStock,
    productsLowStock,
    totalBatches,
    expiredBatches,
    expiringBatches,
    activeAlerts,
    criticalAlerts,
  };
}

/**
 * Get daily consumption data for chart (Prisma version)
 */
import { endOfDay, startOfDay, subDays } from 'date-fns';
export async function getDailyConsumptionChart(days: number = 7, start?: Date, end?: Date) {
  const fromDate = start ? startOfDay(start) : startOfDay(subDays(new Date(), days));
  const toDate = end ? endOfDay(end) : undefined;
  const consumptions = await prisma.daily_consumption.findMany({
    where: { created_at: { gte: fromDate, ...(toDate ? { lte: toDate } : {}) } },
    select: {
      created_at: true,
      quantity_consumed: true,
    },
    orderBy: { created_at: 'asc' },
  });
  // Group by date
  const grouped: Record<string, number> = {};
  for (const c of consumptions) {
    const date = c.created_at.toISOString().split('T')[0];
    grouped[date] = (grouped[date] || 0) + Number(c.quantity_consumed);
  }
  return Object.entries(grouped).map(([date, total_consumed]) => ({ date, total_consumed }));
}

/**
 * Get top consumed products (Prisma version)
 */
export interface TopConsumedProducts {
  product_id: number;
  name: string;
  category_name: string | null;
  total_consumed: number;
  consumption_count: number;
  avg_consumption: number;
}
export async function getTopConsumedProducts(limit: number = 10, start?: Date, end?: Date): Promise<TopConsumedProducts[]> {
  const fromDate = start ? startOfDay(start) : subDays(new Date(), 30);
  const toDate = end ? endOfDay(end) : undefined;
  const consumptions = await prisma.daily_consumption.findMany({
    where: { created_at: { gte: fromDate, ...(toDate ? { lte: toDate } : {}) } },
    select: {
      product_id: true,
      quantity_consumed: true,
    },
  });
  const productIds = [...new Set(consumptions.map((item) => item.product_id))];
  const products = productIds.length
    ? await prisma.products.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, category: { select: { name: true } } },
      })
    : [];
  const productById = new Map(products.map((product) => [product.id, product]));
  // Aggregate by product
  const map = new Map<number, { name: string; category_name: string | null; total: number; count: number }>();
  for (const c of consumptions) {
    const entry = map.get(c.product_id) || {
      name: productById.get(c.product_id)?.name || '',
      category_name: productById.get(c.product_id)?.category?.name || null,
      total: 0,
      count: 0,
    };
    entry.total += Number(c.quantity_consumed);
    entry.count++;
    map.set(c.product_id, entry);
  }
  return Array.from(map.entries())
    .map(([product_id, v]) => ({
      product_id,
      name: v.name,
      category_name: v.category_name,
      total_consumed: v.total,
      consumption_count: v.count,
      avg_consumption: v.count ? v.total / v.count : 0,
    }))
    .sort((a, b) => b.total_consumed - a.total_consumed)
    .slice(0, limit);
}


/**
 * Get stock losses and waste report
 */
export interface StockLosses {
  total_losses: number;
  total_loss_value: number;
  expired_count: number;
  expired_value: number;
  loss_percentage: number;
}
export async function getStockLossesReport(start?: Date, end?: Date): Promise<StockLosses> {
  // Prisma version
  const fromDate = start ? startOfDay(start) : subDays(new Date(), 30);
  const toDate = end ? endOfDay(end) : undefined;
  const losses = await prisma.stock_movements.findMany({
    where: {
      type: { in: ['LOSS', 'EXPIRED'] },
      created_at: { gte: fromDate, ...(toDate ? { lte: toDate } : {}) },
    },
    select: {
      type: true,
      quantity: true,
      batch: { select: { purchase_price: true } },
    },
  });
  let total_losses = 0, total_loss_value = 0, expired_count = 0, expired_value = 0;
  for (const l of losses) {
    total_losses++;
    const value = Number(l.quantity) * Number(l.batch?.purchase_price ?? 0);
    total_loss_value += value;
    if (l.type === 'EXPIRED') {
      expired_count++;
      expired_value += value;
    }
  }
  const stockBatches = await prisma.stock_batches.findMany();
  const totalStockVal = stockBatches.reduce((sum, b) => sum + Number(b.quantity_remaining) * Number(b.purchase_price), 0);
  const loss_percentage = totalStockVal > 0 ? (total_loss_value / totalStockVal) * 100 : 0;
  return {
    total_losses,
    total_loss_value,
    expired_count,
    expired_value,
    loss_percentage,
  };
}

/**
 * Get recent stock movements (Prisma version)
 */
export async function getRecentMovements(limit: number = 20, start?: Date, end?: Date) {
  const dateFilter = start || end
    ? { created_at: { ...(start ? { gte: startOfDay(start) } : {}), ...(end ? { lte: endOfDay(end) } : {}) } }
    : {};
  const movements = await prisma.stock_movements.findMany({
    where: dateFilter,
    orderBy: { created_at: 'desc' },
    take: limit,
    include: {
      product: { select: { name: true } },
      batch: { select: { batch_number: true } },
    },
  });
  // Fetch user names in batch for all user_ids
  const userIds = Array.from(new Set(movements.map(m => m.user_id)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, fullName: true },
  });
  const userMap = new Map(users.map(u => [u.id, u.fullName]));
  return movements.map(m => ({
    id: m.id,
    type: m.type,
    quantity: Number(m.quantity),
    reason: m.reason,
    created_at: m.created_at,
    product_name: m.product?.name || '',
    user_name: userMap.get(m.user_id) || '',
    batch_number: m.batch?.batch_number || '',
  }));
}

/**
 * Get inventory health metrics (Prisma version)
 */
export async function getInventoryHealth() {
  const snapshots = await prisma.inventory_snapshots.findMany();
  const productIds = new Set<number>();
  let accurate_count = 0, minor_variance_count = 0, major_variance_count = 0;
  for (const inv of snapshots) {
    productIds.add(inv.product_id);
    const diff = Math.abs(Number(inv.difference));
    if (diff === 0) accurate_count++;
    else if (diff > 0 && diff <= 5) minor_variance_count++;
    else if (diff > 5) major_variance_count++;
  }
  const total_products = productIds.size;
  const accuracy_percentage = total_products > 0 ? Math.round((accurate_count / total_products) * 100 * 100) / 100 : 0;
  return {
    total_products,
    accurate_count,
    minor_variance_count,
    major_variance_count,
    accuracy_percentage,
  };
}
