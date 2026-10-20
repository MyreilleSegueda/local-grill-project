import { prisma } from './prisma';

export async function getUserRoles(userId: number) {
  return prisma.userRole.findMany({ where: { userId }, include: { role: true } });
}

export async function getRolePermissions(roleId: number) {
  return prisma.rolepermission.findMany({ where: { roleId }, include: { permission: true } });
}

export async function hasPermission(userId: number, permission: string) {
  const roles = await getUserRoles(userId);
  for (const r of roles) {
    const perms = await getRolePermissions(r.roleId);
    if (perms.some(p => p.permission.name === permission)) {
      return true;
    }
  }
  return false;
}
