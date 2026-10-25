

import { NextRequest, NextResponse } from 'next/server';

import { getAuthUser } from '@/lib/auth/request';
import {
  getDailyConsumptionChart,
  getStockLossesReport,
  getRecentMovements,
  getInventoryHealth,
  getDashboardKPIs,
  getTopConsumedProducts
} from '@/lib/services/dashboardService';
import { prisma } from '@/server/db/prisma';
import { endOfDay, startOfDay } from 'date-fns';
import { mapReportActivityLogs } from '@/lib/utils/reportLogMapper';

export async function GET(request: NextRequest) {
  try {
    // Authentification
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Filtres dynamiques (date, produit, catégorie, utilisateur, type...)
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const category = searchParams.get('category');
    const product = searchParams.get('product');
    const userId = searchParams.get('user');
    const movementType = searchParams.get('type');

    // Dates
    const parsedStart = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const parsedEnd = end ? new Date(end) : new Date();
    const startDate = Number.isNaN(parsedStart.getTime()) ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : parsedStart;
    const endDate = Number.isNaN(parsedEnd.getTime()) ? new Date() : parsedEnd;

    // Consommation quotidienne
    const daily_consumption = await getDailyConsumptionChart(30, startDate, endDate);
    const consumption_details_raw = await prisma.stock_movements.findMany({
      where: {
        type: { in: ['OUT', 'LOSS', 'EXPIRED'] },
        created_at: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
      },
      select: { created_at: true, product_id: true, quantity: true, batch: { select: { purchase_price: true } } },
      orderBy: { created_at: 'asc' },
    });
    const consumptionProductIds = [...new Set(consumption_details_raw.map(row => row.product_id))];
    const consumptionProducts = await prisma.products.findMany({
      where: { id: { in: consumptionProductIds } },
      select: { id: true, name: true, sku: true, unit: { select: { name: true, abbreviation: true } } },
    });
    const consumptionProductMap = new Map(consumptionProducts.map(product => [product.id, product]));
    const consumption_details = consumption_details_raw.map(row => {
      const product = consumptionProductMap.get(row.product_id);
      const unitCost = row.batch?.purchase_price == null ? null : Number(row.batch.purchase_price);
      const quantity = Number(row.quantity);
      return { date: row.created_at, product_name: product?.name || null,
        sku: product?.sku || null, quantity, unit: product?.unit?.abbreviation || product?.unit?.name || null,
        unit_cost: unitCost, value: unitCost === null ? null : quantity * unitCost };
    });
    // Top produits consommés
    const top_products = await getTopConsumedProducts(10, startDate, endDate);
    // Pertes & gaspillage
    const losses = await getStockLossesReport(startDate, endDate);
    // Derniers mouvements de stock
    const movements = await getRecentMovements(null, startDate, endDate);
    // Santé de l'inventaire
    const inventory_health = await getInventoryHealth();
    // KPIs globaux
    const kpis = await getDashboardKPIs();
    // Valorisation du stock courant par catégorie, calculée à partir des lots encore disponibles.
    const currentStockBatches = await prisma.stock_batches.findMany({
      where: { quantity_remaining: { gt: 0 } },
      select: {
        quantity_remaining: true,
        purchase_price: true,
        product: { select: { category: { select: { name: true } } } },
      },
    });
    const stockByCategoryMap = new Map<string, number>();
    for (const batch of currentStockBatches) {
      const name = batch.product.category?.name || 'Sans catégorie';
      stockByCategoryMap.set(name, (stockByCategoryMap.get(name) || 0)
        + Number(batch.quantity_remaining) * Number(batch.purchase_price));
    }
    const stock_by_category = [...stockByCategoryMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const inventoryCounts = await prisma.inventory_counts.findMany({
      where: { created_at: { gte: startOfDay(startDate), lte: endOfDay(endDate) } },
      distinct: ['product_id'],
      orderBy: { created_at: 'desc' },
    });
    const varianceProductIds = [...new Set(inventoryCounts.map(count => count.product_id))];
    const varianceProducts = varianceProductIds.length ? await prisma.products.findMany({
      where: { id: { in: varianceProductIds } },
      select: { id: true, name: true, category: { select: { name: true } }, unit: { select: { name: true, abbreviation: true } } },
    }) : [];
    const varianceProductMap = new Map(varianceProducts.map(product => [product.id, product]));
    const inventory_variances = inventoryCounts
      .filter(count => Math.abs(Number(count.difference)) > 0.0001)
      .map(count => {
        const product = varianceProductMap.get(count.product_id);
        return {
          product_name: product?.name || 'Produit inconnu',
          category_name: product?.category?.name || null,
          theoretical_quantity: Number(count.theoretical_quantity),
          real_quantity: Number(count.real_quantity),
          difference: Number(count.difference),
          unit: product?.unit?.abbreviation || product?.unit?.name || null,
          counted_at: count.created_at,
        };
      });

    // Utilisateurs
    const usersRaw = await prisma.user.findMany({
      select: { id: true, fullName: true, email: true, status: true, createdAt: true,
        userRoles: { select: { role: { select: { name: true } } } } }
    });
    const users = usersRaw.map(u => ({ id: u.id, name: u.fullName, email: u.email,
      role: u.userRoles.map(link => link.role.name).join(', ') || 'Non attribué', created_at: u.createdAt }));
    const userNameMap = new Map(usersRaw.map(u => [u.id, u.fullName]));
    // Rôles
    const roles = await prisma.role.findMany({
      select: { id: true, name: true, createdAt: true }
    });
    // Permissions
    const permissions = await prisma.permission.findMany({
      select: { id: true, name: true, description: true }
    });
    // Catégories
    const categories = await prisma.categories.findMany({
      select: { id: true, name: true, description: true, is_active: true }
    });
    // Fournisseurs
    const suppliers = await prisma.suppliers.findMany({
      select: { id: true, name: true, contact_name: true, is_active: true }
    });
    // Unités
    const units = await prisma.units.findMany({
      select: { id: true, name: true, abbreviation: true }
    });
    // Alertes
    const alerts = await prisma.alerts.findMany({
      select: { id: true, type: true, severity: true, message: true, is_resolved: true, created_at: true }
    });
    // Logs d'activité
    const [legacyActivityLogs, currentActivityLogs] = await Promise.all([
      prisma.activity_logs.findMany({
      select: { id: true, user_id: true, action: true, entity_type: true, entity_id: true, created_at: true }
      }),
      prisma.activityLog.findMany({
        select: { id: true, userId: true, action: true, details: true, createdAt: true },
      }),
    ]);
    const reportActivityLogs = mapReportActivityLogs(legacyActivityLogs, currentActivityLogs, userNameMap);
    const loss_movements_raw = await prisma.stock_movements.findMany({
      where: { type: { in: ['LOSS', 'EXPIRED'] }, created_at: { gte: startOfDay(startDate), lte: endOfDay(endDate) } },
      include: { product: { select: { name: true, unit: { select: { name: true, abbreviation: true } } } }, batch: { select: { purchase_price: true } } },
      orderBy: { created_at: 'desc' },
    });
    const loss_movements = loss_movements_raw.map(m => ({ product_name: m.product.name, quantity: Number(m.quantity),
      unit: m.product.unit.abbreviation || m.product.unit.name, cause: m.reason, type: m.type,
      value: m.batch ? Number(m.quantity) * Number(m.batch.purchase_price) : null, created_at: m.created_at }));
    // Structure de réponse par section
    return NextResponse.json({
      success: true,
      data: {
        kpis,
        stock_by_category,
        inventory_variances,
        inventory_counted_products: inventoryCounts.length,
        daily_consumption,
        consumption_details,
        top_products,
        losses,
        inventory_health,
        movements,
        users,
        roles,
        permissions,
        categories,
        suppliers,
        units,
        alerts,
        loss_movements,
        activity_logs: reportActivityLogs,
      },
    });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
