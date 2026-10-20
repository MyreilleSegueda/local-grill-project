
import { prisma } from '@/server/db/prisma';

export async function createRole(name: string) {
  return prisma.role.create({ data: { name } });
}

export async function updateRole(id: number, data: any) {
  return prisma.role.update({ where: { id }, data });
}

export async function getRoles() {
  return prisma.role.findMany();
}

export async function deleteRole(id: number) {
  return prisma.role.delete({ where: { id } });
}
