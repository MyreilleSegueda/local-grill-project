import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest) {
  const { id, name, permissions } = await req.json();
  if (!id || !name) return NextResponse.json({ error: 'id and name required' }, { status: 400 });
  const updated = await prisma.role.update({
    where: { id },
    data: {
      name,
      rolepermission: permissions
        ? {
            deleteMany: {},
            create: permissions.map((pid: number) => ({ permissionId: pid })),
          }
        : undefined,
    },
    include: { rolepermission: { include: { permission: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  // Vérifie s’il y a des utilisateurs rattachés à ce rôle
  const userCount = await prisma.userRole.count({ where: { roleId: id } });
  if (userCount > 0) {
    return NextResponse.json({ error: 'Impossible de supprimer ce rôle : des utilisateurs y sont rattachés.' }, { status: 400 });
  }
  await prisma.role.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
