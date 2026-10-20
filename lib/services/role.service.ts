import { prisma } from '@/server/db/prisma';

export async function getRoles({ tenantId, search }: { tenantId?: number, search?: string }) {
  const tenantRoleLinks = tenantId === undefined
    ? []
    : await prisma.tenantrole.findMany({ where: { tenantId }, select: { roleId: true } });
  const tenantRoleIds = new Set(tenantRoleLinks.map((link) => link.roleId));
  const roles = await prisma.role.findMany({
    include: {
      rolepermission: { include: { permission: true } },
      userRoles: { include: { user: true } },
    },
    orderBy: { name: 'asc' },
  });
  const filteredRoles = tenantId === undefined ? roles : roles.filter((role) => tenantRoleIds.has(role.id));
  if (search) {
    return filteredRoles.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  }
  return filteredRoles;
}

export async function createRole({ name, tenantId, permissions }: { name: string, tenantId?: number, permissions?: string[] }) {
  const role = await prisma.role.create({
    data: {
      name,
      rolepermission: permissions ? { create: permissions.map(name => ({ permission: { connect: { name } } })) } : undefined,
    },
    include: {
      rolepermission: { include: { permission: true } },
    },
  });
  const tenantRole = tenantId === undefined
    ? null
    : await prisma.tenantrole.create({ data: { tenantId, roleId: role.id } });
  return { ...role, tenantRoles: tenantRole ? [tenantRole] : [] };
}

export async function updateRole({ id, name, permissions }: { id: number, name?: string, permissions?: string[] }) {
  return prisma.role.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(permissions && { rolepermission: { deleteMany: {}, create: permissions.map(name => ({ permission: { connect: { name } } })) } }),
    },
    include: {
      rolepermission: { include: { permission: true } },
    },
  });
}

export async function deleteRole(id: number) {
  return prisma.role.delete({ where: { id } });
}
