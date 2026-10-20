/**
 * app/api/stock/movements/route.ts
 *
 * GET  → liste paginée + filtrée des mouvements
 *        (reprend la logique existante, ajoute user via join séparé)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma }                    from "@/lib/prisma";
import { getUserIdFromRequest }      from "@/lib/services/auditLogService";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const p = req.nextUrl.searchParams;

  const search      = p.get("search")      || "";
  const type        = p.get("type")        || undefined;
  const startDate   = p.get("startDate")   ? new Date(p.get("startDate")!)  : undefined;
  const endDate     = p.get("endDate")     ? new Date(p.get("endDate")!)    : undefined;
  const product_id  = p.get("product_id")  ? parseInt(p.get("product_id")!)  : undefined;
  const category_id = p.get("category_id") ? parseInt(p.get("category_id")!) : undefined;
  const user_id     = p.get("user_id")     ? parseInt(p.get("user_id")!)     : undefined;
  const sort        = p.get("sort")  || "created_at";
  const order       = p.get("order") === "asc" ? "asc" : "desc";
  const limit       = p.get("limit")  ? parseInt(p.get("limit")!)  : 50;
  const offset      = p.get("offset") ? parseInt(p.get("offset")!) : 0;

  // ── WHERE ──────────────────────────────────────────────────────────────────
  const where: Record<string, unknown> = {};
  if (type) {
    const types = type.split(",").map((value) => value.trim()).filter(Boolean);
    where.type = types.length > 1 ? { in: types } : types[0];
  }
  if (product_id)  where.product_id = product_id;
  if (user_id)     where.user_id    = user_id;
  if (category_id) where.product    = { is: { category_id } };

  // Plage de dates
  if (startDate || endDate) {
    where.created_at = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate   ? { lte: new Date(endDate.getTime() + 86400000 - 1) } : {}), // fin de journée
    };
  }

  if (search) {
    where.OR = [
      { reason:           { contains: search } },
      { reference_number: { contains: search } },
      { product: { is: { name: { contains: search } } } },
    ];
  }

  try {
    const [total, movements] = await Promise.all([
      prisma.stock_movements.count({ where }),
      prisma.stock_movements.findMany({
        where,
        include: {
          product: {
            select: {
              name: true,
              unit: { select: { abbreviation: true, name: true } },
            },
          },
        },
        orderBy: { [sort]: order },
        skip:    offset,
        take:    limit,
      }),
    ]);

    // Récupérer les users séparément (stock_movements n'a pas de relation User)
    const userIds = [...new Set(movements.map(m => m.user_id).filter(Boolean))];
    const users   = userIds.length > 0
      ? await prisma.user.findMany({
          where:  { id: { in: userIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const usersMap = Object.fromEntries(users.map(u => [u.id, u]));

    const movementsWithUser = movements.map(m => ({
      ...m,
      user: usersMap[m.user_id] ?? null,
    }));

    return NextResponse.json({ success: true, data: { total, movements: movementsWithUser } });
  } catch (err) {
    console.error("[GET /api/stock/movements]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
