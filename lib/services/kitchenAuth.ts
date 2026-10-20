import { NextRequest, NextResponse } from "next/server";
import { verifyJwt, loadUserWithPermissions } from "@/server/services/authService";

export async function authorizeKitchen(
  req: NextRequest,
  permission: "CUISINE_VIEW" | "CUISINE_SERVE" | "CUISINE_RETURN",
) {
  return authorize(req, permission, true);
}

/** Uses the same stock-exit permission as the page and honors ADMIN access. */
export async function authorizeStockExit(req: NextRequest) {
  return authorize(req, "SORTIE_STOCK_CREATE", true);
}

/** Retained for Cuisine dispatch callers; it checks the same stock permission. */
export async function authorizeKitchenDispatch(req: NextRequest) {
  return authorize(req, "SORTIE_STOCK_CREATE", true);
}

export async function authorizePermission(
  req: NextRequest,
  permission: string,
) {
  return authorize(req, permission, false);
}

async function authorize(req: NextRequest, permission: string, allowAdmin: boolean) {
  const bearer = req.headers.get("authorization") ?? "";
  const token = bearer.startsWith("Bearer ")
    ? bearer.slice(7)
    : req.cookies.get("user_token")?.value ?? req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;
  if (!payload?.id) {
    return { userId: null, response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }

  const user = await loadUserWithPermissions(payload.id);
  if (!user || user.status !== "ACTIVE") {
    return { userId: null, response: NextResponse.json({ error: "Compte inactif ou introuvable" }, { status: 403 }) };
  }
  // The ADMIN exception is limited to Cuisine and uses roles loaded from the database.
  const isAdmin = allowAdmin && user.userRoles.some((ur) =>
    ur.role.name.trim().toUpperCase() === "ADMIN",
  );
  const hasPermission = user.userRoles.some((ur) =>
    ur.role.rolepermission.some((rp) => rp.permission.name.toUpperCase() === permission),
  ) || user.userpermission.some((up) => up.permission.name.toUpperCase() === permission);

  if (!isAdmin && !hasPermission) {
    return { userId: null, response: NextResponse.json({ error: "Permission requise" }, { status: 403 }) };
  }
  return { userId: user.id, response: null };
}
