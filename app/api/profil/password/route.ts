/**
 * app/api/profil/password/route.ts
 *
 * POST → change le mot de passe de l'utilisateur connecté
 * Body : { currentPassword, newPassword, confirmPassword }
 *
 * Log dans ActivityLog (@@map("activity_log")) — action "PASSWORD_CHANGE"
 * N'utilise PAS AuditLog (pas de champ details/userAgent dans le schéma).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma }                    from "@/lib/prisma";
import {
  verifyJwt,
  verifyPassword,
  hashPassword,
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const raw = extractToken(req);
    if (!raw) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const payload = verifyJwt(raw);
    if (!payload?.id) return NextResponse.json({ error: "Token invalide" }, { status: 401 });

    // ── Lecture body ──────────────────────────────────────────────────────
    const body            = await req.json();
    const currentPassword = String(body?.currentPassword ?? "");
    const newPassword     = String(body?.newPassword     ?? "");
    const confirmPassword = String(body?.confirmPassword ?? "");

    // ── Validations ───────────────────────────────────────────────────────
    if (!currentPassword || !newPassword || !confirmPassword)
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });

    if (newPassword.length < 8)
      return NextResponse.json(
        { error: "Le nouveau mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );

    if (!/[A-Z]/.test(newPassword))
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins une majuscule" },
        { status: 400 }
      );

    if (!/[0-9]/.test(newPassword))
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins un chiffre" },
        { status: 400 }
      );

    if (newPassword !== confirmPassword)
      return NextResponse.json(
        { error: "Les mots de passe ne correspondent pas" },
        { status: 400 }
      );

    if (currentPassword === newPassword)
      return NextResponse.json(
        { error: "Le nouveau mot de passe doit être différent de l'actuel" },
        { status: 400 }
      );

    // ── Récupérer l'utilisateur ───────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where:  { id: payload.id },
      select: { id: true, passwordHash: true },
    });
    if (!user)
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // ── Vérifier l'ancien mot de passe ────────────────────────────────────
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid)
      return NextResponse.json(
        { error: "Mot de passe actuel incorrect" },
        { status: 401 }
      );

    // ── Hasher et enregistrer ─────────────────────────────────────────────
    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: payload.id },
      data:  { passwordHash: newHash, updatedAt: new Date() },
    });

    // ── Log ActivityLog ───────────────────────────────────────────────────
    // Utilise ActivityLog (@@map("activity_log")) qui a bien :
    //   action String, details Text?, ipAddress String?, userAgent Text?
    await prisma.activityLog.create({
      data: {
        userId:    payload.id,
        action:    "PASSWORD_CHANGE",
        details:   JSON.stringify({ success: true }),
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
        userAgent: req.headers.get("user-agent") ?? null,
      },
    }).catch((e) => console.warn("[ActivityLog] PASSWORD_CHANGE skip:", e));

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[POST /api/profil/password]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}