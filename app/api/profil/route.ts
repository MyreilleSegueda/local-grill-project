/**
 * app/api/profil/route.ts
 *
 * GET  → retourne les infos complètes du compte connecté (User + roles + permissions)
 * PATCH → met à jour fullName et/ou email, log dans ActivityLog (table activity_log)
 *
 * Schema utilisé :
 *   - User (id, email, passwordHash, fullName, status, createdAt, updatedAt)
 *   - UserRole → Role
 *   - RolePermission → Permission (@@map("permission"))
 *   - UserPermission → Permission
 *   - ActivityLog (@@map("activity_log")) : action String, details Text, ipAddress, userAgent
 *
 * NE PAS utiliser AuditLog ici : il n'a pas de champ details ni userAgent dans le schéma.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma }                    from "@/lib/prisma";
import {
  verifyJwt,
  loadUserWithPermissions,
  buildUserData,
} from "@/server/services/authService";

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

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const raw = extractToken(req);
    if (!raw) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const payload = verifyJwt(raw);
    if (!payload?.id) return NextResponse.json({ error: "Token invalide" }, { status: 401 });

    const userFull = await loadUserWithPermissions(payload.id);
    if (!userFull) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const { userData } = buildUserData(userFull);
    return NextResponse.json({
      ...userData,
      createdAt: userFull.createdAt,
      updatedAt: userFull.updatedAt,
    });
  } catch (err) {
    console.error("[GET /api/profil]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const raw = extractToken(req);
    if (!raw) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const payload = verifyJwt(raw);
    if (!payload?.id) return NextResponse.json({ error: "Token invalide" }, { status: 401 });

    const body     = await req.json();
    const fullName = (body?.fullName ?? "").trim();
    const email    = (body?.email    ?? "").trim().toLowerCase();

    if (!fullName && !email)
      return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
    if (fullName && fullName.length < 2)
      return NextResponse.json({ error: "Le nom doit contenir au moins 2 caractères" }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== payload.id)
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    const current = await prisma.user.findUnique({
      where:  { id: payload.id },
      select: { fullName: true, email: true },
    });
    if (!current)
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const updated = await prisma.user.update({
      where: { id: payload.id },
      data: {
        ...(fullName ? { fullName } : {}),
        ...(email    ? { email }    : {}),
        updatedAt: new Date(),
      },
      select: { fullName: true, email: true, updatedAt: true },
    });

    // Log dans ActivityLog (@@map("activity_log")) — a les champs details + userAgent
    const changedFields = [
      fullName && fullName !== current.fullName ? "fullName" : null,
      email    && email    !== current.email    ? "email"    : null,
    ].filter(Boolean);

    await prisma.activityLog.create({
      data: {
        userId:    payload.id,
        action:    "PROFILE_UPDATE",
        details:   JSON.stringify({
          changedFields,
          before: { fullName: current.fullName, email: current.email },
          after:  { fullName: updated.fullName, email: updated.email },
        }),
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
        userAgent: req.headers.get("user-agent") ?? null,
      },
    }).catch((e) => console.warn("[ActivityLog] skip:", e));

    return NextResponse.json({
      success:   true,
      fullName:  updated.fullName,
      email:     updated.email,
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    console.error("[PATCH /api/profil]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}