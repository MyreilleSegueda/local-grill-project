import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { getAuthUser } from '@/lib/auth/request';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const updated = await prisma.user.update({
      where: { id: Number(params.id) },
      data: {
        email: body.email,
        fullName: body.fullName,
        status: body.status,
        ...(body.password ? { passwordHash: body.password } : {}),
        userRoles: {
          deleteMany: {},
          create: [{ role: { connect: { name: body.role } } }],
        },
      },
      include: { userRoles: { include: { role: true } } },
    });
    return NextResponse.json({ ...updated, role: updated.userRoles[0]?.role?.name || 'USER' });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur modification utilisateur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await prisma.user.delete({ where: { id: Number(params.id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur suppression utilisateur' }, { status: 500 });
  }
}
