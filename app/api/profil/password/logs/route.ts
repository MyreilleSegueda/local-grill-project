/**
 * app/api/profil/logs/route.ts
 *
 * GET → logs d'activité depuis ActivityLog (@@map("activity_log"))
 *
 * Pourquoi ActivityLog et PAS AuditLog :
 *   ✓ ActivityLog a : action String (libre), details Text, ipAddress, userAgent, createdAt
 *   ✗ AuditLog a    : action AuditAction (enum strict), PAS de details, PAS de userAgent
 *
 * Query params :
 *   page    (default 1)
 *   limit   (default 15, max 100)
 *   action  (filtre libre ex: "LOGIN", "PASSWORD_CHANGE", "PROFILE_UPDATE")
 *   from    (date ISO début)
 *   to      (date ISO fin)
 *   search  (recherche dans details / ipAddress / action)
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyJwt }                 from "@/server/services/authService";
import { prisma }                    from "@/lib/prisma";

function extractToken(req: NextRequest): string | null {
  const c =
    req.cookies.get("user_token")?.value  ??
    req.cookies.get("admin_token")?.value ??
    req.cookies.get("token")?.value       ??
    null;
  if (c) return c;
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const raw = extractToken(req);
    if (!raw) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const payload = verifyJwt(raw);
    if (!payload?.id) return NextResponse.json({ error: "Token invalide" }, { status: 401 });

    // ── Paramètres ────────────────────────────────────────────────────────
    const sp    = req.nextUrl.searchParams;
    const page  = Math.max(1, parseInt(sp.get("page")  ?? "1",  10));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "15", 10)));
    const action = sp.get("action")?.trim() || undefined;
    const search = sp.get("search")?.trim() || undefined;

    let from: Date | undefined;
    let to:   Date | undefined;
    if (sp.get("from")) { from = new Date(sp.get("from")!); if (isNaN(from.getTime())) from = undefined; }
    if (sp.get("to"))   { to   = new Date(sp.get("to")!);   if (isNaN(to.getTime()))   to   = undefined; }
    // Pour "to", inclure toute la journée
    if (to) { to.setHours(23, 59, 59, 999); }

    // ── Filtres Prisma (ActivityLog: userId, action String, createdAt) ─────
    // ActivityLog a : id, userId, action, details, ipAddress, userAgent, createdAt
    const where = {
      userId: payload.id,
      ...(action ? { action } : {}),
      ...(from || to ? {
        createdAt: {
          ...(from ? { gte: from } : {}),
          ...(to   ? { lte: to   } : {}),
        },
      } : {}),
      ...(search ? {
        OR: [
          { action:    { contains: search } },
          { details:   { contains: search } },
          { ipAddress: { contains: search } },
        ],
      } : {}),
    };

    // ── Requêtes parallèles ────────────────────────────────────────────────
    const [logs, total, actionCounts] = await Promise.all([
      // Logs paginés
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          id:        true,
          action:    true,
          details:   true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
        },
      }),
      // Total pour la pagination
      prisma.activityLog.count({ where }),
      // Comptage par type d'action (sans les autres filtres) pour les badges
      prisma.activityLog.groupBy({
        by:      ["action"],
        where:   { userId: payload.id },
        _count:  { action: true },
        orderBy: { _count: { action: "desc" } },
      }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages:   Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      actionCounts: actionCounts.map(a => ({
        action: a.action,
        count:  a._count.action,
      })),
    });

  } catch (err) {
    console.error("[GET /api/profil/logs]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}