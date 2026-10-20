/**
 * app/api/admin/auth/verify-otp/route.ts
 *
 * Étape 2 du 2FA admin :
 *   1. Vérifie l'OTP
 *   2. Recharge user + rôles + permissions depuis la DB
 *   3. Signe un JWT complet (roles + permissions embarqués)
 *   4. Pose le cookie  admin_token  (HttpOnly, 8h)
 *   5. Retourne { success, token, user }
 *
 * AuthContext appelle ensuite login() pour stocker le token dans localStorage.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  verifyOtp,
  loadUserWithPermissions,
  buildUserData,
  signJwt,
} from "@/server/services/authService";
import { prisma } from "@/lib/prisma";

const COOKIE_OPTS = {
  httpOnly: true,
  path:     "/",
  maxAge:   60 * 60 * 8,
  sameSite: "strict"  as const,
  secure:   process.env.NODE_ENV === "production",
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body   = await req.json();
    const userId = Number(body?.userId);
    const code   = (body?.code ?? "").trim();

    if (!userId || !code)
      return NextResponse.json({ error: "userId et code requis" }, { status: 400 });

    // ── 1. Vérifier OTP ───────────────────────────────────────────────────
    const otpValid = await verifyOtp(userId, code);
    if (!otpValid)
      return NextResponse.json({ error: "Code OTP invalide ou expiré" }, { status: 401 });

    // ── 2. Recharger user complet (permissions fraîches) ──────────────────
    const userFull = await loadUserWithPermissions(userId);
    if (!userFull)
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    if (userFull.status !== "ACTIVE")
      return NextResponse.json({ error: "Compte désactivé." }, { status: 403 });

    // ── 3. Double-check rôle ADMIN ────────────────────────────────────────
    const { userData, jwtPayload } = buildUserData(userFull);
    if (!jwtPayload.roles.some(role => role.toUpperCase() === "ADMIN"))
      return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });

    // ── 4. Signer JWT (roles + permissions complets) ──────────────────────
    const token = signJwt(jwtPayload);
    await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: req.headers.get("user-agent"),
      },
    });

    // ── 5. Réponse + cookie admin_token ───────────────────────────────────
    const res = NextResponse.json({ success: true, token, user: userData });

    // admin_token → logique admin (/admin/dashboard + SidebarLayoutAdmin)
    res.cookies.set("admin_token", token, COOKIE_OPTS);
    // token       → compat middleware Edge
    res.cookies.set("token",       token, COOKIE_OPTS);

    return res;

  } catch (err) {
    console.error("[POST /api/admin/auth/verify-otp]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
