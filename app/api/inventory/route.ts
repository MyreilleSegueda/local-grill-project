/**
 * app/api/inventory/route.ts
 *
 * GET → liste complète de l'inventaire avec variance calculée
 *       = join inventory_snapshots + products + categories + units
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma }                    from "@/lib/prisma";
import { getUserIdFromRequest }      from "@/lib/services/auditLogService";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    // Les snapshots et comptages ont product_id, mais aucune relation Prisma
    // n'est déclarée sur products : on les charge séparément.
    const products = await prisma.products.findMany({
      where:   { is_active: true },
      include: {
        category: { select: { id: true, name: true } },
        unit:     { select: { id: true, name: true, abbreviation: true } },
      },
      orderBy: { name: "asc" },
    });
    const productIds = products.map((product) => product.id);
    const snapshots = productIds.length
      ? await prisma.inventory_snapshots.findMany({ where: { product_id: { in: productIds } } })
      : [];
    const snapshotByProductId = new Map(snapshots.map((snapshot) => [snapshot.product_id, snapshot]));

    // Totaux Cuisine par produit pour rendre visible le stock en cours de traitement.
    const kitchenLines = productIds.length
      ? await prisma.kitchen_dispatch_lines.findMany({
          where: { product_id: { in: productIds } },
          select: { product_id: true, sent_quantity: true, served_quantity: true, returned_quantity: true },
        })
      : [];
    const kitchenByProduct = new Map<number, { sent: number; consumed: number; returned: number }>();
    for (const line of kitchenLines) {
      const totals = kitchenByProduct.get(line.product_id) ?? { sent: 0, consumed: 0, returned: 0 };
      totals.sent += Number(line.sent_quantity);
      totals.consumed += Number(line.served_quantity);
      totals.returned += Number(line.returned_quantity);
      kitchenByProduct.set(line.product_id, totals);
    }

    // Récupérer la date du dernier comptage par produit
    const lastCounts = await prisma.inventory_counts.findMany({
      distinct: ["product_id"],
      orderBy:  { created_at: "desc" },
      select:   { product_id: true, created_at: true },
    });
    const lastCountMap = Object.fromEntries(lastCounts.map(c => [c.product_id, c.created_at]));

    const items = products.map(product => {
      const snap = snapshotByProductId.get(product.id) ?? null;

      const theoreticalQty = snap ? Number(snap.theoretical_quantity) : 0;
      const realQty        = snap ? Number(snap.real_quantity)        : 0;
      const variance       = realQty - theoreticalQty;
      const variancePct    = theoreticalQty !== 0
        ? (variance / theoreticalQty) * 100
        : 0;

      return {
        product_id:            product.id,
        product_name:          product.name,
        category_name:         product.category?.name ?? "—",
        physical_quantity:     realQty,
        theoretical_quantity:  theoreticalQty,
        unit_abbreviation:     product.unit?.abbreviation ?? null,
        unit_name:             product.unit?.name ?? null,
        minimum_stock:         product.minimum_stock ? Number(product.minimum_stock) : null,
        variance,
        variance_percentage:   Number(variancePct.toFixed(2)),
        last_count_date:       lastCountMap[product.id]?.toISOString() ?? null,
        total_value:           snap ? Number(snap.total_value) : 0,
      };
    });

    const kitchen = products.flatMap(product => {
      const totals = kitchenByProduct.get(product.id);
      if (!totals) return [];
      return [{
        product_id: product.id,
        product_name: product.name,
        unit_abbreviation: product.unit?.abbreviation ?? product.unit?.name ?? null,
        ...totals,
        remaining: Math.max(0, totals.sent - totals.consumed - totals.returned),
      }];
    });

    return NextResponse.json({ success: true, data: { items, kitchen } });

  } catch (err) {
    console.error("[GET /api/inventory]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
