import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiUser } from "@/lib/auth/admin-api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!getAdminApiUser(req)) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  try {
    const sessions = await prisma.session.findMany({
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const userIds = [...new Set(sessions.map((session) => session.userId))];
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, fullName: true, status: true },
        })
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));

    return NextResponse.json(sessions.map((session) => ({
      ...session,
      user: usersById.get(session.userId) ?? null,
    })));
  } catch (error) {
    console.error("[GET /api/admin/sessions]", error);
    return NextResponse.json({ error: "Impossible de charger les sessions" }, { status: 500 });
  }
}
