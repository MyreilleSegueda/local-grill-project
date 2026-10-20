import { prisma } from '@/server/db/prisma';
import bcrypt from 'bcryptjs';

export async function getUsers({ tenantId, role, search, skip = 0, take = 20 }: { tenantId?: number, role?: string, search?: string, skip?: number, take?: number }) {
  const tenantUserLinks = tenantId === undefined
    ? []
    : await prisma.tenantuser.findMany({ where: { tenantId }, select: { userId: true } });
  const tenantUserIds = new Set(tenantUserLinks.map((link) => link.userId));
  const users = await prisma.user.findMany({
    where: {
      ...(tenantId === undefined ? {} : { id: { in: [...tenantUserIds] } }),
      ...(role ? { userRoles: { some: { role: { name: role } } } } : {}),
    },
    include: {
      userRoles: { include: { role: true } },
      userpermission: { include: { permission: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  let filtered = users;
  if (search) {
    const s = search.toLowerCase();
    filtered = users.filter(u =>
      u.email.toLowerCase().includes(s) ||
      u.fullName.toLowerCase().includes(s)
    );
  }
  const page = filtered.slice(skip, skip + take);
  const tenantIdsByUser = new Map<number, number[]>();
  if (page.length) {
    const links = await prisma.tenantuser.findMany({ where: { userId: { in: page.map((user) => user.id) } } });
    for (const link of links) {
      tenantIdsByUser.set(link.userId, [...(tenantIdsByUser.get(link.userId) ?? []), link.tenantId]);
    }
  }
  const tenantIds = [...new Set([...tenantIdsByUser.values()].flat())];
  const tenants = tenantIds.length
    ? await prisma.tenant.findMany({ where: { id: { in: tenantIds } } })
    : [];
  const tenantsById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  return page.map((user) => ({
    ...user,
    tenantUsers: (tenantIdsByUser.get(user.id) ?? []).map((id) => ({ tenantId: id, tenant: tenantsById.get(id) ?? null })),
    userPermissions: user.userpermission,
  }));
}

export async function createUser({ email, password, fullName, status, tenantId, roles, permissions }: { email: string, password: string, fullName: string, status: string, tenantId?: number, roles?: string[], permissions?: string[] }) {
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      fullName,
      status: status as any,
      userRoles: roles ? { create: roles.map(name => ({ role: { connect: { name } } })) } : undefined,
      userpermission: permissions ? { create: permissions.map(name => ({ permission: { connect: { name } } })) } : undefined,
    },
    include: {
      userRoles: { include: { role: true } },
      userpermission: { include: { permission: true } },
    },
  });
  const tenantUser = tenantId === undefined
    ? null
    : await prisma.tenantuser.create({ data: { tenantId, userId: user.id } });
  return { ...user, tenantUsers: tenantUser ? [tenantUser] : [], userPermissions: user.userpermission };
}

export async function updateUser({ id, email, fullName, status, password, roles, permissions }: { id: number, email?: string, fullName?: string, status?: string, password?: string, roles?: string[], permissions?: string[] }) {
  return prisma.user.update({
    where: { id },
    data: {
      ...(email && { email }),
      ...(fullName && { fullName }),
      ...(status && { status: status as any }),
      ...(password && { passwordHash: await bcrypt.hash(password, 10) }),
      ...(roles && { userRoles: { deleteMany: {}, create: roles.map(name => ({ role: { connect: { name } } })) } }),
      ...(permissions && { userpermission: { deleteMany: {}, create: permissions.map(name => ({ permission: { connect: { name } } })) } }),
    },
    include: {
      userRoles: { include: { role: true } },
      userpermission: { include: { permission: true } },
    },
  });
}

export async function deleteUser(id: number) {
  await prisma.tenantuser.deleteMany({ where: { userId: id } });
  return prisma.user.delete({ where: { id } });
}

export async function toggleUserStatus(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');
  return prisma.user.update({ where: { id }, data: { status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } });
}
