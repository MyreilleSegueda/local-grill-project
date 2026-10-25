import { mapReportActivityLogs } from '../lib/utils/reportLogMapper';

describe('report activity log mapping', () => {
  it('combines the active and legacy log models and exposes only known entity IDs', () => {
    const userNames = new Map([[8, 'Awa']]);
    const logs = mapReportActivityLogs(
      [{ id: 1, user_id: 8, action: 'OLD_ACTION', entity_type: 'products', entity_id: 3, created_at: new Date('2026-10-01T10:00:00Z') }],
      [
        { id: 1, userId: 8, action: 'CREATE_STOCK_EXIT', details: JSON.stringify({ movId: 42, product_id: 7 }), createdAt: new Date('2026-10-02T10:00:00Z') },
        { id: 2, userId: 99, action: 'UNKNOWN_ACTION', details: 'not json', createdAt: new Date('2026-10-03T10:00:00Z') },
      ],
      userNames,
    );

    expect(logs).toEqual([
      { id: -2, user_id: 99, user_name: null, action: 'UNKNOWN_ACTION', entity_type: null, entity_id: null, created_at: new Date('2026-10-03T10:00:00Z') },
      { id: -1, user_id: 8, user_name: 'Awa', action: 'CREATE_STOCK_EXIT', entity_type: 'Mouvement de stock', entity_id: 42, created_at: new Date('2026-10-02T10:00:00Z') },
      { id: 1, user_id: 8, user_name: 'Awa', action: 'OLD_ACTION', entity_type: 'products', entity_id: 3, created_at: new Date('2026-10-01T10:00:00Z') },
    ]);
  });
});
