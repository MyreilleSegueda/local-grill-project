import { prisma } from '@/server/db/prisma';
import { Prisma } from '@prisma/client';

export async function logActivity({ user_id, action, entity_type, entity_id, changes, ip_address }: {
  user_id: number;
  action: string;
  entity_type?: string;
  entity_id?: number;
  changes?: any;
  ip_address?: string;
}) {
  return prisma.activity_logs.create({
    data: {
      user_id,
      action,
      entity_type: entity_type || null,
      entity_id: entity_id || null,
      changes: changes === undefined ? undefined : (changes === null ? Prisma.JsonNull : changes),
      ip_address: ip_address || null,
    },
  });
}

export async function getActivityLogs({ entity_type, entity_id, limit = 100 }: { entity_type?: string, entity_id?: number, limit?: number }) {
  return prisma.activity_logs.findMany({
    where: {
      ...(entity_type ? { entity_type } : {}),
      ...(entity_id ? { entity_id } : {}),
    },
    orderBy: { created_at: 'desc' },
    take: limit,
  });
}
