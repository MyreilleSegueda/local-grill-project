/**
 * app/api/admin/auth/logout/route.ts
 * Efface user_token, admin_token et token (compat).
 */
import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ success: true });
  const opts = {
    httpOnly: true, path: "/login/pg-admin", maxAge: 0,
    sameSite: "strict" as const,
    secure:   process.env.NODE_ENV === "production",
  };
  res.cookies.set("user_token",  "", opts);
  res.cookies.set("admin_token", "", opts);
  res.cookies.set("token",       "", opts);
  return res;
}