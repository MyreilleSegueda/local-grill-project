/**
 * middleware.ts
 * RBAC aligné sur les nouvelles permissions granulaires
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyJwtEdge, JwtPayload } from "@/lib/auth-edge";

const PUBLIC_PATHS = [
  "/", "/login/pg-admin", "/unauthorized",
  "/api/auth/login", "/api/auth/logout", "/api/auth/me",
  "/api/admin/auth/login", "/api/admin/auth/verify-otp",
];

type RbacRule =
  | { type: "role";       value: string }
  | { type: "permission"; value: string }
  | { type: "any" };

// Aligné sur SIDEBAR_PERMISSIONS dans lib/constants/permissions.ts
const RBAC_RULES: { prefix: string; rule: RbacRule }[] = [
  { prefix: "/admin",      rule: { type: "role",       value: "ADMIN"          } },
  { prefix: "/produits",   rule: { type: "permission", value: "PRODUCTS_VIEW"  } },
  { prefix: "/entrees",    rule: { type: "permission", value: "STOCK_VIEW"   } },
  { prefix: "/sorties",    rule: { type: "permission", value: "STOCK_VIEW"   } },
  { prefix: "/cuisine",    rule: { type: "permission", value: "CUISINE_VIEW" } },
  { prefix: "/materiels",  rule: { type: "permission", value: "STOCK_VIEW"   } },
  { prefix: "/inventaire", rule: { type: "permission", value: "INVENTORY_VIEW" } },
  { prefix: "/alertes",    rule: { type: "permission", value: "ALERTS_VIEW"    } },
  { prefix: "/rapports",   rule: { type: "permission", value: "REPORTS_VIEW"   } },
  { prefix: "/dashboard",  rule: { type: "any" } },
  { prefix: "/profil",     rule: { type: "any" } },
];

function isPublic(p: string) {
  return PUBLIC_PATHS.some(pp => p === pp || p.startsWith(pp + "/"));
}
function hasRole(payload: JwtPayload, role: string) {
  const expected = role.toUpperCase();
  return payload.roles?.some((assigned) => assigned.toUpperCase() === expected) ?? false;
}
function hasPermission(payload: JwtPayload, perm: string) {
  if (hasRole(payload, "ADMIN")) return true;
  const expected = perm.toUpperCase();
  return payload.permissions?.some((assigned) => assigned.toUpperCase() === expected) ?? false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/medias") || pathname === "/favicon.ico")
    return NextResponse.next();

  if (isPublic(pathname)) {
    const raw = req.cookies.get("user_token")?.value ?? req.cookies.get("admin_token")?.value ?? req.cookies.get("token")?.value;
    if (raw && (pathname === "/" || pathname === "/login/pg-admin")) {
      const p = await verifyJwtEdge(raw);
      if (p) return NextResponse.redirect(new URL(p.roles?.includes("ADMIN") ? "/admin/dashboard" : "/dashboard", req.url));
    }
    return NextResponse.next();
  }

  const raw = req.cookies.get("user_token")?.value ?? req.cookies.get("admin_token")?.value ?? req.cookies.get("token")?.value;
  if (!raw) return NextResponse.redirect(new URL("/", req.url));

  const payload = await verifyJwtEdge(raw);
  if (!payload?.id) {
    const res = NextResponse.redirect(new URL("/", req.url));
    ["user_token","admin_token","token"].forEach(c => res.cookies.delete(c));
    return res;
  }

  const matched = RBAC_RULES.find(r => pathname.startsWith(r.prefix));
  if (matched) {
    const { rule } = matched;
    const allowed =
      rule.type === "any"        ? true :
      rule.type === "role"       ? hasRole(payload, rule.value) :
      rule.type === "permission" ? hasPermission(payload, rule.value) : false;

    if (!allowed) {
      const url = new URL("/unauthorized", req.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-user-id",         String(payload.id));
  reqHeaders.set("x-user-roles",      JSON.stringify(payload.roles ?? []));
  reqHeaders.set("x-user-permissions",JSON.stringify(payload.permissions ?? []));
  return NextResponse.next({ request: { headers: reqHeaders } });
}

export const config = {
  matcher: ["/((?!_next|api|public|medias|favicon.ico).*)"],
};
