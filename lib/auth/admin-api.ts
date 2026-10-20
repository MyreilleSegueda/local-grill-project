import { NextRequest } from "next/server";
import { verifyJwt, type JwtPayload } from "@/server/services/authService";

/** Return the authenticated administrator from a bearer token or auth cookie. */
export function getAdminApiUser(request: NextRequest): JwtPayload | null {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : request.cookies.get("admin_token")?.value
      ?? request.cookies.get("user_token")?.value
      ?? request.cookies.get("token")?.value;
  if (!token) return null;

  const user = verifyJwt(token);
  return user?.roles?.some((role) => role.trim().toUpperCase() === "ADMIN") ? user : null;
}
