import { prisma } from '@/server/db/prisma';

export async function getSetting(key: string) {
  return prisma.setting.findUnique({
    where: { key },
  });
}

export async function setSetting(key: string, value: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value, updatedAt: new Date() },
  });
}

export async function getAllSettings() {
  return prisma.setting.findMany({
    orderBy: { key: 'asc' },
  });
}
