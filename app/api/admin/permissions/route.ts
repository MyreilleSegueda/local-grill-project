/**
 * app/api/admin/permissions/route.ts
 *
 * GET  → liste toutes les permissions avec leurs rôles associés
 * POST → créer une nouvelle permission (ADMIN uniquement)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma }                    from "@/lib/prisma";
import { verifyJwt }                 from "@/server/services/authService";

function getToken(req: NextRequest): string | null {
  const c =
    req.cookies.get("admin_token")?.value ??
    req.cookies.get("user_token")?.value  ??
    req.cookies.get("token")?.value       ?? null;
  if (c) return c;
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

// ── GET : toutes les permissions ──────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const raw = getToken(req);
    if (!raw)
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const payload = verifyJwt(raw);
    if (!payload?.roles?.some((role) => role.toUpperCase() === "ADMIN"))
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const permissions = await prisma.permission.findMany({
      orderBy: { id: "asc" },
      select: {
        id:          true,
        name:        true,
        description: true,
        createdAt:   true,
        updatedAt:   true,
        rolepermission: {
          select: {
            role: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Aplatir pour faciliter l'usage côté client
    const result = permissions.map(p => ({
      id:          p.id,
      name:        p.name,
      description: p.description,
      createdAt:   p.createdAt,
      updatedAt:   p.updatedAt,
      roles:       p.rolepermission.map(rp => rp.role),
      users:       [],
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/admin/permissions]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ── POST : créer une permission ───────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw = getToken(req);
    if (!raw)
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const payload = verifyJwt(raw);
    if (!payload?.roles?.some((role) => role.toUpperCase() === "ADMIN"))
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const body        = await req.json();
    const name        = (body?.name        ?? "").trim().toUpperCase();
    const description = (body?.description ?? "").trim() || null;

    if (!name)
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });

    // Valider le format : MODULE_ACTION
    if (!/^[A-Z]+_[A-Z]+$/.test(name))
      return NextResponse.json(
        { error: "Format invalide — attendu : MODULE_ACTION (ex: STOCK_VIEW)" },
        { status: 400 }
      );

    // Vérifier unicité
    const existing = await prisma.permission.findUnique({ where: { name } });
    if (existing)
      return NextResponse.json(
        { error: `La permission « ${name} » existe déjà` },
        { status: 409 }
      );

    const permission = await prisma.permission.create({
      data: { name, description },
      select: { id: true, name: true, description: true, createdAt: true },
    });

    return NextResponse.json(permission, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/permissions]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
