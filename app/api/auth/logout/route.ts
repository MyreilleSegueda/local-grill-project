/**
 * app/api/auth/logout/route.ts
 * Efface user_token, admin_token et token (compat).
 */
import { NextRequest, NextResponse } from "next/server";
import { auditAuth, getUserIdFromRequest } from "@/lib/services/auditLogService";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userId = getUserIdFromRequest(req);
  const res = NextResponse.json({ success: true });
  const opts = {
    httpOnly: true, path: "/", maxAge: 0,
    sameSite: "strict" as const,
    secure:   process.env.NODE_ENV === "production",
  };
  res.cookies.set("user_token",  "", opts);
  res.cookies.set("admin_token", "", opts);
  res.cookies.set("token",       "", opts);
  if (userId) await auditAuth.logout(req, userId);
  return res;
}