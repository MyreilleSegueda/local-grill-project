import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const tenants = await prisma.tenant.findMany({
    orderBy: { name: 'asc' },
  });
  const [userLinks, roleLinks] = await Promise.all([
    prisma.tenantuser.findMany(),
    prisma.tenantrole.findMany(),
  ]);
  const userIds = [...new Set(userLinks.map((link) => link.userId))];
  const roleIds = [...new Set(roleLinks.map((link) => link.roleId))];
  const [users, roles] = await Promise.all([
    userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } } }) : [],
    roleIds.length ? prisma.role.findMany({ where: { id: { in: roleIds } } }) : [],
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const rolesById = new Map(roles.map((role) => [role.id, role]));
  return NextResponse.json(tenants.map((tenant) => ({
    ...tenant,
    users: userLinks
      .filter((link) => link.tenantId === tenant.id)
      .map((link) => ({ ...link, user: usersById.get(link.userId) ?? null })),
    roles: roleLinks
      .filter((link) => link.tenantId === tenant.id)
      .map((link) => ({ ...link, role: rolesById.get(link.roleId) ?? null })),
  })));
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  // Validation à ajouter
  const tenant = await prisma.tenant.create({
    data,
  });
  return NextResponse.json(tenant);
}
