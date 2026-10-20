import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { getAuthUser } from '@/lib/auth/request';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // On suppose que le user a un tableau tenantUsers (relation User <-> TenantUser)
    // et qu'il est toujours rattaché à un tenant (multi-tenant SaaS)
    const membership = await prisma.tenantuser.findFirst({
      where: { userId: user.id },
      select: { tenantId: true },
    });
    const tenantId = membership?.tenantId;
    if (!tenantId) {
      return NextResponse.json([], { status: 200 });
    }
    // On ne retourne que les rôles liés à ce tenant
    const tenantRoles = await prisma.tenantrole.findMany({
      where: { tenantId },
      select: { roleId: true },
    });
    const roles = await prisma.role.findMany({
      where: { id: { in: tenantRoles.map((tr) => tr.roleId) } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(roles);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la récupération des rôles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const role = await prisma.role.create({ data: { name: body.name } });
    return NextResponse.json(role);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la création du rôle' }, { status: 500 });
  }
}
