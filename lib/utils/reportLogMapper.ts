export interface ReportActivityLog {
  id: number;
  user_id: number;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  created_at: Date;
}

interface LegacyActivityLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  created_at: Date;
}

interface CurrentActivityLog {
  id: number;
  userId: number;
  action: string;
  details: string | null;
  createdAt: Date;
}

function parseDetails(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export function mapReportActivityLogs(
  legacyLogs: LegacyActivityLog[],
  currentLogs: CurrentActivityLog[],
  userNames: Map<number, string>,
): ReportActivityLog[] {
  const legacy = legacyLogs.map(log => ({
    ...log,
    user_name: userNames.get(log.user_id) ?? null,
  }));
  const current = currentLogs.map(log => {
    const details = parseDetails(log.details);
    const entityId = [details.entity_id, details.entityId, details.movId, details.batchId, details.product_id, details.productId]
      .find(value => typeof value === 'number');
    const entityType = typeof details.entity_type === 'string'
      ? details.entity_type
      : typeof details.entity === 'string'
        ? details.entity
        : typeof details.movId === 'number'
          ? 'Mouvement de stock'
          : typeof details.batchId === 'number'
            ? 'Lot de stock'
            : typeof details.product_id === 'number' || typeof details.productId === 'number'
              ? 'Produit'
              : null;
    return {
      // Separate the IDs of the current and legacy tables for stable React keys.
      id: -log.id,
      user_id: log.userId,
      user_name: userNames.get(log.userId) ?? null,
      action: log.action,
      entity_type: entityType,
      entity_id: typeof entityId === 'number' ? entityId : null,
      created_at: log.createdAt,
    };
  });

  return [...legacy, ...current].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
}
