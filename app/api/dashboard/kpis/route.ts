export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { subDays } from 'date-fns';
import {
  getDashboardKPIs,
  getDailyConsumptionChart,
  getTopConsumedProducts,
  getStockLossesReport,
} from '@/lib/services/dashboardService';
import { errorResponse, successResponse, getAuthUser } from '@/lib/auth/request';
import { prisma } from '@/server/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    // Tout en parallèle — un seul aller-retour DB
    const [kpis, consumptionChart, topProducts, losses, productsRaw, stockByCat] =
      await Promise.all([
        getDashboardKPIs(),
        getDailyConsumptionChart(7),
        getTopConsumedProducts(10),
        getStockLossesReport(),

        // Produits à surveiller (stock bas)
        prisma.products.findMany({
          where: { is_active: true },
          include: { stock_batches: true, category: true },
        }),

        // Valeur du stock par catégorie
        prisma.categories.findMany({
          where: { is_active: true },
          include: { products: { include: { stock_batches: true } } },
        }),
      ]);

    // --- Produits à surveiller ---
    const productsLowStockList = productsRaw
      .map((p) => {
        const stock = p.stock_batches.reduce(
          (sum, b) => sum + Number(b.quantity_remaining),
          0,
        );
        return {
          name: p.name,
          category_name: p.category?.name || '',
          stock,
          minimum_stock: Number(p.minimum_stock),
        };
      })
      .filter((p) => p.stock > 0 && p.stock < p.minimum_stock)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10);

    // --- Tendances de consommation (7j vs 30j) ---
    const now = new Date();
    const [consos7, consos30] = await Promise.all([
      prisma.daily_consumption.findMany({
        where: { created_at: { gte: subDays(now, 7) } },
        select: {
          product_id: true,
          quantity_consumed: true,
        },
      }),
      prisma.daily_consumption.findMany({
        where: { created_at: { gte: subDays(now, 30) } },
        select: {
          product_id: true,
          quantity_consumed: true,
        },
      }),
    ]);

    const prodMap7 = new Map<number, number>();
    consos7.forEach((c) =>
      prodMap7.set(c.product_id, (prodMap7.get(c.product_id) ?? 0) + Number(c.quantity_consumed)),
    );
    const prodMap30 = new Map<number, number>();
    consos30.forEach((c) =>
      prodMap30.set(c.product_id, (prodMap30.get(c.product_id) ?? 0) + Number(c.quantity_consumed)),
    );

    const trendProductIds = [...new Set(consos30.map((consumption) => consumption.product_id))];
    const trendProducts = trendProductIds.length
      ? await prisma.products.findMany({
          where: { id: { in: trendProductIds } },
          select: { id: true, name: true },
        })
      : [];
    const trendProductNames = new Map(trendProducts.map((product) => [product.id, product.name]));

    const trends: { product_name: string; period: string; direction: string; value: number }[] = [];
    prodMap30.forEach((val30, pid) => {
      const avg7 = (prodMap7.get(pid) ?? 0) / 7;
      const avg30 = val30 / 30;
      const value = avg30 ? Math.round(((avg7 - avg30) / avg30) * 100) : 0;
      const name = trendProductNames.get(pid) ?? '';
      trends.push({ product_name: name, period: '7j/30j', direction: avg7 > avg30 ? 'up' : 'down', value });
    });

    // --- Valeur stock par catégorie ---
    const stockValueByCategory: Record<string, number> = {};
    stockByCat.forEach((cat) => {
      stockValueByCategory[cat.name] = cat.products.reduce(
        (sum, p) =>
          sum +
          p.stock_batches.reduce(
            (s, b) => s + Number(b.quantity_remaining) * Number(b.purchase_price),
            0,
          ),
        0,
      );
    });

    return NextResponse.json(
      successResponse({
        ...kpis,
        consumptionChart,
        topProducts,
        losses,
        productsLowStockList,
        trends,
        stockValueByCategory,
      }),
    );
  } catch (error) {
    console.error('Dashboard KPIs API error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}
