export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST — récupère les permissions d'un rôle donné
export async function POST(req: NextRequest) {
  try {
    const { roleId } = await req.json();
    if (!roleId) {
      return NextResponse.json({ error: 'roleId requis' }, { status: 400 });
    }

    const rolePermissions = await prisma.rolepermission.findMany({
      where: { roleId: Number(roleId) },
      include: { permission: true },
    });

    // Retourner directement les objets permission (pas l'objet intermédiaire)
    const permissions = rolePermissions.map((rp) => rp.permission);
    return NextResponse.json({ permissions });
  } catch (err) {
    console.error('[POST /api/admin/rbac/get-permissions]', err);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}
