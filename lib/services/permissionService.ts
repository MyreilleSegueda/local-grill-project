import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function getAllPermissions() {
  return prisma.permission.findMany({
    include: {
      rolepermission: { include: { role: true } },
      userpermission: { include: { user: true } },
    },
  });
}

export async function createPermission(data: any) {
  return prisma.permission.create({ data });
}

export async function assignPermissionToRole(permissionId: number, roleId: number) {
  return prisma.rolepermission.create({ data: { permissionId, roleId } });
}

export async function assignPermissionToUser(permissionId: number, userId: number) {
  return prisma.userpermission.create({ data: { permissionId, userId } });
}
