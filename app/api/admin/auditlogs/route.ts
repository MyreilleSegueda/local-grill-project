import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiUser } from "@/lib/auth/admin-api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!getAdminApiUser(req)) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  try {
    const [adminRows, activityRows] = await Promise.all([
      prisma.auditlog.findMany({ orderBy: { timestamp: "desc" }, take: 100 }),
      prisma.activity_logs.findMany({ orderBy: { created_at: "desc" }, take: 100 }),
    ]);
    const userIds = [...new Set([
      ...adminRows.map((row) => row.userId),
      ...activityRows.map((row) => row.user_id),
    ])];
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, fullName: true },
        })
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));

    const logs = [
      ...adminRows.map((row) => ({
        id: `admin-${row.id}`,
        userId: row.userId,
        action: String(row.action),
        entity: row.entity,
        entityId: row.entityId,
        ip: row.ip,
        timestamp: row.timestamp,
        user: usersById.get(row.userId) ?? null,
      })),
      ...activityRows.map((row) => ({
        id: `activity-${row.id}`,
        userId: row.user_id,
        action: row.action,
        entity: row.entity_type ?? "Activité",
        entityId: row.entity_id,
        ip: row.ip_address,
        timestamp: row.created_at,
        user: usersById.get(row.user_id) ?? null,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100);

    return NextResponse.json(logs);
  } catch (error) {
    console.error("[GET /api/admin/auditlogs]", error);
    return NextResponse.json({ error: "Impossible de charger les journaux" }, { status: 500 });
  }
}
