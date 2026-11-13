import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiUser } from "@/lib/auth/admin-api";

const STORE_PERMISSIONS = [
  "STORE_VIEW",
  "STORE_TRANSFER",
  "STORE_RECEIVE",
  "STORE_RETURN_STOCK",
] as const;

type Context = { params: Promise<{ id: string }> };

async function readUserId(context: Context) {
  const id = Number((await context.params).id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(req: NextRequest, context: Context) {
  if (!getAdminApiUser(req)) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }
  const userId = await readUserId(context);
  if (!userId) return NextResponse.json({ error: "Identifiant utilisateur invalide" }, { status: 400 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userpermission: { where: { permission: { name: { in: [...STORE_PERMISSIONS] } } }, select: { permission: { select: { name: true } } } },
      },
    });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    return NextResponse.json({ permissions: user.userpermission.map((item) => item.permission.name) });
  } catch (error) {
    console.error("[GET /api/admin/users/:id/store-permissions]", error);
    return NextResponse.json({ error: "Impossible de charger les permissions Magasin" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: Context) {
  if (!getAdminApiUser(req)) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }
  const userId = await readUserId(context);
  if (!userId) return NextResponse.json({ error: "Identifiant utilisateur invalide" }, { status: 400 });

  let body: { permissions?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  if (!Array.isArray(body.permissions) ||
      body.permissions.some((name) => typeof name !== "string" || !STORE_PERMISSIONS.includes(name as typeof STORE_PERMISSIONS[number]))) {
    return NextResponse.json({ error: "Liste de permissions Magasin invalide" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    const permissions = await prisma.permission.findMany({
      where: { name: { in: body.permissions as string[] } },
      select: { id: true },
    });
    if (permissions.length !== new Set(body.permissions).size) {
      return NextResponse.json({ error: "Certaines permissions Magasin n’ont pas encore été initialisées" }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userpermission.deleteMany({
        where: { userId, permission: { name: { in: [...STORE_PERMISSIONS] } } },
      });
      if (permissions.length > 0) {
        await tx.userpermission.createMany({
          data: permissions.map((permission) => ({ userId, permissionId: permission.id })),
        });
      }
    });
    return NextResponse.json({ success: true, permissions: body.permissions });
  } catch (error) {
    console.error("[PUT /api/admin/users/:id/store-permissions]", error);
    return NextResponse.json({ error: "Impossible de mettre à jour les permissions Magasin" }, { status: 500 });
  }
}
