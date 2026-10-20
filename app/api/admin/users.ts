import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { getAuthUser } from '@/lib/auth/request';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json([], { status: 401 });
    }
    const users = await prisma.user.findMany({
      include: {
        userRoles: { include: { role: true } },
      },
    });
    return NextResponse.json(users.map(u => ({
      ...u,
      role: u.userRoles[0]?.role?.name || 'USER',
      status: u.status,
    })));
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const created = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: body.password, // hash in real app
        fullName: body.fullName,
        status: body.status,
        userRoles: { create: [{ role: { connect: { id: Number(body.roleId) } } }] },
      },
      include: { userRoles: { include: { role: true } } },
    });
    return NextResponse.json({ ...created, role: created.userRoles[0]?.role?.name || 'USER' });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur création utilisateur' }, { status: 500 });
  }
}
