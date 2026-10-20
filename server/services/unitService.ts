import { prisma } from '@/server/db/prisma';

export async function getUnits() {
  return prisma.units.findMany({ orderBy: { name: 'asc' } });
}

export async function createUnit({ name, abbreviation, description }: { name: string; abbreviation: string; description?: string }) {
  return prisma.units.create({
    data: { name, abbreviation, description: description || null },
  });
}

export async function updateUnit(id: number, { name, abbreviation, description }: { name: string; abbreviation: string; description?: string }) {
  return prisma.units.update({
    where: { id },
    data: { name, abbreviation, description: description || null },
  });
}

export async function deleteUnit(id: number) {
  await prisma.units.delete({ where: { id } });
  return true;
}
