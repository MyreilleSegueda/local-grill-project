export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAdminApiUser } from '@/lib/auth/admin-api';

const prisma = new PrismaClient();

// -------------------- GET All Roles --------------------
export async function GET(req: NextRequest) {
  if (!getAdminApiUser(req)) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  try {
    const roles = await prisma.role.findMany({
      include: {
        rolepermission: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Normaliser : aplatir les permissions pour le frontend
    const normalized = roles.map((role) => ({
      ...role,
      permissions: role.rolepermission.map((rp) => rp.permission),
      userCount: role._count.userRoles,
    }));

    return NextResponse.json(normalized);
  } catch (err) {
    console.error('[GET /api/admin/roles]', err);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

// -------------------- POST Create Role --------------------
export async function POST(req: NextRequest) {
  if (!getAdminApiUser(req)) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  try {
    const { name, permissions } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Le nom du rôle est requis' }, { status: 400 });
    }

    // Vérifier unicité du nom
    const existing = await prisma.role.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: `Un rôle « ${name} » existe déjà` }, { status: 409 });
    }

    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        rolepermission: permissions && Array.isArray(permissions) && permissions.length > 0
          ? { create: permissions.map((pid: number) => ({ permissionId: pid })) }
          : undefined,
      },
      include: {
        rolepermission: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    });

    return NextResponse.json({
      ...role,
      permissions: role.rolepermission.map((rp) => rp.permission),
      userCount: role._count.userRoles,
    }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/admin/roles]', err);
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Ce nom de rôle est déjà utilisé' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
