export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAdminApiUser } from '@/lib/auth/admin-api';

const prisma = new PrismaClient();

// -------------------- PUT Update Role --------------------
export async function PUT(req: NextRequest) {
  if (!getAdminApiUser(req)) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  try {
    const { id, name, permissions } = await req.json();

    if (!id)        return NextResponse.json({ error: 'id requis' },   { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: 'name requis' }, { status: 400 });

    // Vérifier que le rôle existe
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 });

    // Vérifier unicité du nom (sauf lui-même)
    const duplicate = await prisma.role.findFirst({
      where: { name: name.trim(), id: { not: id } },
    });
    if (duplicate) {
      return NextResponse.json({ error: `Un rôle « ${name} » existe déjà` }, { status: 409 });
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        name: name.trim(),
        rolepermission: permissions
          ? { deleteMany: {}, create: permissions.map((pid: number) => ({ permissionId: pid })) }
          : undefined,
      },
      include: {
        rolepermission: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    });

    return NextResponse.json({
      ...updated,
      permissions: updated.rolepermission.map((rp) => rp.permission),
      userCount: updated._count.userRoles,
    });
  } catch (err: any) {
    console.error('[PUT /api/admin/roles/edit]', err);
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Ce nom de rôle est déjà utilisé' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

// -------------------- DELETE Role --------------------
export async function DELETE(req: NextRequest) {
  if (!getAdminApiUser(req)) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 });

    // Bloquer si des utilisateurs sont rattachés
    const userCount = await prisma.userRole.count({ where: { roleId: id } });
    if (userCount > 0) {
      return NextResponse.json({
        error: `Impossible de supprimer : ${userCount} utilisateur(s) ont ce rôle.`,
      }, { status: 400 });
    }

    await prisma.role.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/roles/edit]', err);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
