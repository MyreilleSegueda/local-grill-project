export const runtime = "nodejs";

/**
 * app/api/dashboard/route.ts
 *
 * Logique identique à doc-11 (sans date-fns/locale, sans eachDayOfInterval) :
 *   • d7ago  = subDays(now, 6)  → 7 jours : j-6 inclus jusqu'à aujourd'hui
 *   • Jours  = boucle manuelle i=6..0, noms via JOURS_FR[getDay()]
 *   • Format = toYMD() maison, aucun import de locale
 *
 * Blocs ajoutés par rapport à doc-11 :
 *   consumptionStats · trends · productsLowStockList · stockValueByCategory · unit
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma }                    from "@/lib/prisma";
import { getUserIdFromRequest }       from "@/lib/services/auditLogService";
import { subDays }                   from "date-fns";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */

interface DayPoint {
  day:            string;   // "lun", "mar", …  (sans point — JOURS_FR)
  date:           string;   // "YYYY-MM-DD"
  total_consumed: number;
  movement_count: number;
}

interface ConsumptionStats {
  total7days:    number;
  avgPerDay:     number;
  peakDay:       DayPoint;
  movementCount: number;
}

interface TopProduct {
  product_id:     number;
  name:           string;
  category_name:  string;
  unit:           string;
  total_consumed: number;
  movement_count: number;
  avg_per_day:    number;
}

interface TrendItem {
  product_id:   number;
  product_name: string;
  period:       string;
  direction:    "up" | "down" | "stable";
  value:        number;
  avg7:         number;
  avg30:        number;
}

interface LowStockItem {
  name:          string;
  category_name: string;
  unit:          string;
  stock:         number;
  minimum_stock: number;
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTES
───────────────────────────────────────────────────────────────────────────── */

const CONSUMPTION_TYPES = ["OUT", "LOSS", "EXPIRED"] as const;

// Indexé par getDay() : 0=dimanche, 1=lundi, …
const JOURS_FR = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"] as const;

/* ─────────────────────────────────────────────────────────────────────────────
   UTILS — identiques à doc-11
───────────────────────────────────────────────────────────────────────────── */

/** Formater une Date en "YYYY-MM-DD" sans aucune dépendance externe. */
function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Construire les 7 derniers jours : j-6 → aujourd'hui (inclus).
 * Même logique que doc-11 : boucle i = 6 → 0.
 */
function buildLast7Days(): Date[] {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(new Date(d));
  }
  return days;
}

/* ─────────────────────────────────────────────────────────────────────────────
   GET
───────────────────────────────────────────────────────────────────────────── */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const now = new Date();

    // ── Même valeur que doc-11 ──
    // subDays(now, 6) : la fenêtre commence à j-6 00:00 → 7 jours : j-6…j
    const d7ago  = subDays(now, 6);
    const d30ago = subDays(now, 30);

    /* ── Requêtes DB en parallèle ─────────────────────────────────────── */

    const [
      totalProducts,
      stockSnapshots,
      activeAlerts,
      criticalAlerts,
      movements7,
      movements30,
      lossMovements,
      lowStockProducts,
      stockValueCategories,
    ] = await Promise.all([

      // Produits actifs
      prisma.products.count({ where: { is_active: true } }),

      // Snapshots inventaire pour détecter les ruptures
      prisma.inventory_snapshots.findMany({
        select: { product_id: true, theoretical_quantity: true },
      }),

      // Alertes non résolues
      prisma.alerts.count({ where: { is_resolved: false } }),

      // Alertes critiques
      prisma.alerts.count({
        where: { is_resolved: false, severity: "CRITICAL" },
      }),

      // Mouvements consommation — 7 derniers jours (graphique)
      // gte: d7ago = subDays(now, 6) — identique à doc-11
      prisma.stock_movements.findMany({
        where: {
          type:       { in: CONSUMPTION_TYPES as unknown as ("OUT" | "LOSS" | "EXPIRED")[] },
          created_at: { gte: d7ago },
        },
        select: {
          quantity:   true,
          created_at: true,
          product_id: true,
          product: {
            select: {
              name:     true,
              category: { select: { name: true } },
              unit:     { select: { abbreviation: true } },
            },
          },
        },
      }),

      // Mouvements consommation — 30 derniers jours (top + tendances)
      prisma.stock_movements.findMany({
        where: {
          type:       { in: CONSUMPTION_TYPES as unknown as ("OUT" | "LOSS" | "EXPIRED")[] },
          created_at: { gte: d30ago },
        },
        select: {
          quantity:   true,
          product_id: true,
          product: {
            select: {
              name:     true,
              category: { select: { name: true } },
              unit:     { select: { abbreviation: true } },
            },
          },
        },
      }),

      // LOSS + EXPIRED pour valeur des pertes 30j
      prisma.stock_movements.findMany({
        where: {
          type:       { in: ["LOSS", "EXPIRED"] as ("LOSS" | "EXPIRED")[] },
          created_at: { gte: d30ago },
        },
        select: {
          quantity: true,
          batch:    { select: { purchase_price: true } },
        },
      }),

      // Produits avec lots — stock bas
      prisma.products.findMany({
        where: { is_active: true },
        select: {
          id:            true,
          name:          true,
          minimum_stock: true,
          category:      { select: { name: true } },
          unit:          { select: { abbreviation: true } },
          stock_batches: { select: { quantity_remaining: true } },
        },
      }),

      // Catégories + lots — valeur par catégorie
      prisma.categories.findMany({
        where: { is_active: true },
        select: {
          name:     true,
          products: {
            where: { is_active: true },
            select: {
              stock_batches: {
                select: { quantity_remaining: true, purchase_price: true },
              },
            },
          },
        },
      }),
    ]);

    /* ── KPIs globaux ─────────────────────────────────────────────────── */

    const productsOutOfStock = stockSnapshots.filter(
      s => Number(s.theoretical_quantity) <= 0,
    ).length;

    const totalLossValue = lossMovements.reduce(
      (sum, m) => sum + Number(m.quantity) * Number(m.batch?.purchase_price ?? 0),
      0,
    );

    const totalStockValue = stockValueCategories.reduce(
      (sumCat, cat) =>
        sumCat + cat.products.reduce(
          (sumProd, p) =>
            sumProd + p.stock_batches.reduce(
              (sumBatch, b) =>
                sumBatch + Number(b.quantity_remaining) * Number(b.purchase_price),
              0,
            ),
          0,
        ),
      0,
    );

    const losses = {
      total_loss_value: Math.round(totalLossValue),
      loss_percentage:  totalStockValue > 0
        ? Number(((totalLossValue / totalStockValue) * 100).toFixed(2))
        : 0,
      expired_count: lossMovements.length,
    };

    /* ── Graphique consommation 7j ────────────────────────────────────── */

    // Tableau des 7 jours — MÊME logique que doc-11 (boucle manuelle)
    const days7 = buildLast7Days();

    // Grouper par date YYYY-MM-DD — toYMD() maison, aucune locale
    const byDate = new Map<string, { qty: number; count: number }>();
    movements7.forEach(m => {
      const key = toYMD(new Date(m.created_at));
      const cur = byDate.get(key) ?? { qty: 0, count: 0 };
      byDate.set(key, { qty: cur.qty + Number(m.quantity), count: cur.count + 1 });
    });

    // JOURS_FR[getDay()] — identique à doc-11 (pas de date-fns/locale)
    const consumptionChart: DayPoint[] = days7.map(day => {
      const key  = toYMD(day);
      const data = byDate.get(key) ?? { qty: 0, count: 0 };
      return {
        day:            JOURS_FR[day.getDay()],
        date:           key,
        total_consumed: Number(data.qty.toFixed(2)),
        movement_count: data.count,
      };
    });

    const totalConsumed7 = consumptionChart.reduce((sum, d) => sum + d.total_consumed, 0);
    const avgPerDay7     = consumptionChart.length > 0 ? totalConsumed7 / consumptionChart.length : 0;
    const peakDay7       = consumptionChart.reduce(
      (best, d) => d.total_consumed > best.total_consumed ? d : best,
      consumptionChart[0] ?? { day: "—", date: "", total_consumed: 0, movement_count: 0 },
    );

    const consumptionStats: ConsumptionStats = {
      total7days:    Number(totalConsumed7.toFixed(2)),
      avgPerDay:     Number(avgPerDay7.toFixed(2)),
      peakDay:       peakDay7,
      movementCount: movements7.length,
    };

    /* ── Top produits consommés — 30j ─────────────────────────────────── */

    const prodMap30 = new Map<number, {
      name: string; category: string; unit: string; qty: number; count: number;
    }>();

    movements30.forEach(m => {
      const cur = prodMap30.get(m.product_id);
      if (cur) {
        cur.qty   += Number(m.quantity);
        cur.count += 1;
      } else {
        prodMap30.set(m.product_id, {
          name:     m.product?.name               ?? "—",
          category: m.product?.category?.name    ?? "—",
          unit:     m.product?.unit?.abbreviation ?? "",
          qty:      Number(m.quantity),
          count:    1,
        });
      }
    });

    const topProducts: TopProduct[] = Array.from(prodMap30.entries())
      .map(([pid, d]) => ({
        product_id:     pid,
        name:           d.name,
        category_name:  d.category,
        unit:           d.unit,
        total_consumed: Number(d.qty.toFixed(2)),
        movement_count: d.count,
        avg_per_day:    Number((d.qty / 30).toFixed(2)),
      }))
      .sort((a, b) => b.total_consumed - a.total_consumed)
      .slice(0, 10);

    /* ── Tendances 7j vs 30j ──────────────────────────────────────────── */

    const prodMap7 = new Map<number, number>();
    movements7.forEach(m =>
      prodMap7.set(m.product_id, (prodMap7.get(m.product_id) ?? 0) + Number(m.quantity)),
    );

    const trends: TrendItem[] = [];
    prodMap30.forEach((d, pid) => {
      const qty7  = prodMap7.get(pid) ?? 0;
      const avg7  = qty7  / 7;
      const avg30 = d.qty / 30;
      const value = avg30 > 0 ? Math.round(((avg7 - avg30) / avg30) * 100) : 0;
      trends.push({
        product_id:   pid,
        product_name: d.name,
        period:       "7j vs 30j",
        direction:    avg7 > avg30 * 1.05 ? "up" : avg7 < avg30 * 0.95 ? "down" : "stable",
        value,
        avg7:  Number(avg7.toFixed(2)),
        avg30: Number(avg30.toFixed(2)),
      });
    });
    trends.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    /* ── Produits à surveiller (stock < minimum) ──────────────────────── */

    const productsLowStockList: LowStockItem[] = lowStockProducts
      .map(p => ({
        name:          p.name,
        category_name: p.category?.name    ?? "—",
        unit:          p.unit?.abbreviation ?? "",
        stock:         Number(
          p.stock_batches.reduce((s, b) => s + Number(b.quantity_remaining), 0).toFixed(2),
        ),
        minimum_stock: Number(p.minimum_stock),
      }))
      .filter(p => p.stock >= 0 && p.stock < p.minimum_stock)
      .sort((a, b) => (a.stock / (a.minimum_stock || 1)) - (b.stock / (b.minimum_stock || 1)))
      .slice(0, 10);

    /* ── Valeur du stock par catégorie ────────────────────────────────── */

    const stockValueByCategory: Record<string, number> = {};
    stockValueCategories.forEach(cat => {
      const val = cat.products.reduce(
        (s, p) => s + p.stock_batches.reduce(
          (sb, b) => sb + Number(b.quantity_remaining) * Number(b.purchase_price),
          0,
        ),
        0,
      );
      if (val > 0) stockValueByCategory[cat.name] = Math.round(val);
    });

    /* ── Réponse ──────────────────────────────────────────────────────── */

    return NextResponse.json({
      success: true,
      data: {
        totalProducts,
        productsOutOfStock,
        activeAlerts,
        criticalAlerts,
        losses,
        consumptionChart,
        consumptionStats,
        topProducts,
        trends,
        productsLowStockList,
        stockValueByCategory,
      },
    });

  } catch (err) {
    console.error("[GET /api/dashboard]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}