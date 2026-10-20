/**
 * app/api/auth/login/route.ts
 *
 * POST → authentifie un utilisateur, retourne token + userData
 *
 * ── Logs enregistrés ─────────────────────────────────────────────────────────
 *
 *  Cas 1 — Mot de passe incorrect :
 *    activityLog → action: "LOGIN_FAILED", details: { email }
 *    (ActivityLog car on veut logger les détails — AuditLog ne supporte pas "details")
 *
 *  Cas 2 — Connexion réussie :
 *    auditLog   → action: AuditAction.LOGIN   (table AuditLog, enum strict, pour l'audit RBAC)
 *    activityLog → action: "LOGIN"             (table ActivityLog, avec détails email + rôles)
 *
 * On écrit dans LES DEUX tables pour la connexion réussie :
 *   • AuditLog     = trace de conformité RBAC (qui s'est connecté, quand)
 *   • ActivityLog  = trace opérationnelle enrichie (email, rôles, ip, userAgent)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma }                     from "@/lib/prisma";
import {
  verifyPassword,
  signJwt,
  loadUserWithPermissions,
  buildUserData,
}                                     from "@/server/services/authService";
import {
  auditAuth,       // → AuditLog (enum AuditAction)
  activityLog,     // → ActivityLog (String libre + details)
} from "@/lib/services/auditLogService";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body     = await req.json();
    const email    = (body?.email    ?? "").trim().toLowerCase();
    const password =  body?.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 },
      );
    }

    /* ── Trouver l'utilisateur ──────────────────────────────────────────── */
    const userBasic = await prisma.user.findUnique({
      where:  { email },
      select: { id: true, passwordHash: true, status: true },
    });

    if (!userBasic) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 },
      );
    }

    if (userBasic.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Compte désactivé ou suspendu" },
        { status: 403 },
      );
    }

    /* ── Vérifier le mot de passe ───────────────────────────────────────── */
    const valid = await verifyPassword(password, userBasic.passwordHash);

    if (!valid) {
      // ActivityLog : on veut logger les détails (email) → String libre
      await activityLog(req, {
        userId:  userBasic.id,
        action:  "LOGIN_FAILED",
        details: { email },
      });
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 },
      );
    }

    /* ── Charger les données complètes ─────────────────────────────────── */
    const userFull = await loadUserWithPermissions(userBasic.id);
    if (!userFull) {
      return NextResponse.json({ error: "Erreur de chargement" }, { status: 500 });
    }

    const { userData, jwtPayload } = buildUserData(userFull);
    const token = signJwt(jwtPayload);
    await prisma.session.create({
      data: {
        userId: userFull.id,
        token,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: req.headers.get("user-agent"),
      },
    });

    /* ── Logs de connexion réussie ──────────────────────────────────────── */

    // 1. AuditLog (enum strict) — trace de conformité RBAC
    await auditAuth.login(req, userFull.id);

    // 2. ActivityLog (String libre) — trace opérationnelle avec détails
    await activityLog(req, {
      userId:  userFull.id,
      action:  "LOGIN",
      details: { email, roles: userData.roles },
    });

    /* ── Cookie + réponse ───────────────────────────────────────────────── */
    const cookieOpts = [
      "HttpOnly",
      "Path=/",
      "SameSite=Strict",
      `Max-Age=${8 * 3600}`,
      process.env.NODE_ENV === "production" ? "Secure" : "",
    ].filter(Boolean).join("; ");

    const res = NextResponse.json({ success: true, token, user: userData });
    res.headers.append("Set-Cookie", `user_token=${token}; ${cookieOpts}`);
    res.headers.append("Set-Cookie", `token=${token}; ${cookieOpts}`);
    return res;

  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
