import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiUser } from "@/lib/auth/admin-api";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!getAdminApiUser(req)) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Identifiant de session invalide" }, { status: 400 });
  }

  try {
    const result = await prisma.session.deleteMany({ where: { id } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/sessions/:id/revoke]", error);
    return NextResponse.json({ error: "Impossible de révoquer cette session" }, { status: 500 });
  }
}
