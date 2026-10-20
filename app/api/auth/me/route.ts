/**
 * app/api/auth/me/route.ts
 *
 * CRITIQUE : Recharge les permissions depuis la DB à chaque appel.
 * Sans ça, le refresh de page retourne les permissions du JWT (qui peut
 * être périmé) au lieu des permissions réelles actuelles.
 *
 * Retourne UserData avec permissions[] = noms bruts DB :
 *   ["READ_STOCK", "WRITE_STOCK", "READ_ALERTS", ...]
 */
import { NextRequest, NextResponse }  from "next/server";
import {
  verifyJwt,
  loadUserWithPermissions,
  buildUserData,
} from "@/server/services/authService";

function extractToken(req: NextRequest): string | null {
  // 1. Cookie (priorité)
  const fromCookie =
    req.cookies.get("user_token")?.value  ??
    req.cookies.get("admin_token")?.value ??
    req.cookies.get("token")?.value       ??
    null;
  if (fromCookie) return fromCookie;

  // 2. Header Authorization: Bearer <token>
  const auth = req.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const rawToken = extractToken(req);
    if (!rawToken) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const payload = verifyJwt(rawToken);
    if (!payload?.id) {
      return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });
    }

    // ── Recharger depuis la DB (permissions toujours à jour) ─────────────
    const userFull = await loadUserWithPermissions(payload.id);

    if (!userFull) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (userFull.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Compte désactivé ou suspendu" },
        { status: 403 }
      );
    }

    const { userData } = buildUserData(userFull);
    return NextResponse.json(userData);

  } catch (err) {
    console.error("[GET /api/auth/me]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}