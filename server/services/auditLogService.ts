import { prisma } from '../db/prisma';

type LogAuditParams = {
  userId: number;
  action: string;
  entityType?: string;
  entityId?: number;
  changes?: any;
  ipAddress?: string;
};

export async function logAuditEvent({
  userId,
  action,
  entityType,
  entityId,
  changes,
  ipAddress,
}: LogAuditParams) {
  return prisma.activity_logs.create({
    data: {
      user_id: userId,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      changes: changes ?? null,
      ip_address: ipAddress ?? null,
    },
  });
}

export async function getAuditLogs(limit = 100) {
  return prisma.activity_logs.findMany({
    orderBy: { created_at: 'desc' },
    take: limit,
  });
}