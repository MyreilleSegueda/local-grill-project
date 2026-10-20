/**
 * app/api/admin/auth/login/route.ts
 *
 * Étape 1 du 2FA admin :
 *   1. Vérifie email + mot de passe
 *   2. Vérifie rôle ADMIN
 *   3. Génère + envoie OTP par email
 *   4. Retourne { success, userId }  — PAS de token à ce stade
 *
 * Le token admin_token est posé UNIQUEMENT par verify-otp après validation OTP.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  loadUserByEmail,
  verifyPassword,
  generateOtp,
} from "@/server/services/authService";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body     = await req.json();
    const email    = (body?.email    ?? "").trim().toLowerCase();
    const password = (body?.password ?? "");

    if (!email || !password)
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });

    // ── 1. Charger user avec rôles ────────────────────────────────────────
    const user = await loadUserByEmail(email);

    if (!user || !user.passwordHash)
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });

    // ── 2. Statut ─────────────────────────────────────────────────────────
    if (user.status === "INACTIVE")
      return NextResponse.json(
        { error: "Votre compte est désactivé. Contactez un administrateur." },
        { status: 403 }
      );
    if (user.status === "SUSPENDED")
      return NextResponse.json(
        { error: "Votre compte est suspendu." },
        { status: 403 }
      );

    // ── 3. Mot de passe ───────────────────────────────────────────────────
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid)
      return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });

    // ── 4. Vérifier rôle ADMIN ────────────────────────────────────────────
    const roles = user.userRoles.map(ur => ur.role.name);
    if (!roles.some(role => role.toUpperCase() === "ADMIN"))
      return NextResponse.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );

    // En développement local, conserver le contrôle du mot de passe et du
    // rôle ADMIN, mais permettre de tester l'espace admin sans dépendre de l'e-mail.
    const localHost = ["localhost", "127.0.0.1"].includes(req.nextUrl.hostname);
    if (process.env.NODE_ENV === "development" && localHost) {
      return NextResponse.json({ success: true, userId: user.id, skipOtp: true });
    }

    // ── 5. Générer + envoyer OTP ──────────────────────────────────────────
    await generateOtp(user.id, user.email);

    return NextResponse.json({ success: true, userId: user.id });

  } catch (err) {
    console.error("[POST /api/admin/auth/login]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
