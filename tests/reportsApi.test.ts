const mockGetDailyConsumptionChart = jest.fn();
const mockGetTopConsumedProducts = jest.fn();
const mockGetStockLossesReport = jest.fn();
const mockGetRecentMovements = jest.fn();
const mockGetInventoryHealth = jest.fn();
const mockGetDashboardKPIs = jest.fn();
const mockModel = () => ({ findMany: jest.fn().mockResolvedValue([]) });
const mockPrisma = {
  daily_consumption: mockModel(),
  stock_movements: mockModel(),
  stock_batches: mockModel(),
  inventory_counts: mockModel(),
  products: mockModel(),
  user: mockModel(),
  role: mockModel(),
  permission: mockModel(),
  categories: mockModel(),
  suppliers: mockModel(),
  units: mockModel(),
  alerts: mockModel(),
  activity_logs: mockModel(),
  activityLog: mockModel(),
};

jest.mock('@/lib/auth/request', () => ({ getAuthUser: jest.fn().mockResolvedValue({ id: 1 }) }));
jest.mock('@/lib/services/dashboardService', () => ({
  getDailyConsumptionChart: (...args: unknown[]) => mockGetDailyConsumptionChart(...args),
  getTopConsumedProducts: (...args: unknown[]) => mockGetTopConsumedProducts(...args),
  getStockLossesReport: (...args: unknown[]) => mockGetStockLossesReport(...args),
  getRecentMovements: (...args: unknown[]) => mockGetRecentMovements(...args),
  getInventoryHealth: (...args: unknown[]) => mockGetInventoryHealth(...args),
  getDashboardKPIs: (...args: unknown[]) => mockGetDashboardKPIs(...args),
}));
jest.mock('@/server/db/prisma', () => ({ prisma: mockPrisma }));

import type { NextRequest } from 'next/server';
import { GET } from '../app/api/reports/route';

describe('GET /api/reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDailyConsumptionChart.mockResolvedValue([{ date: '2026-10-01', total_consumed: 2 }]);
    mockGetTopConsumedProducts.mockResolvedValue([{ product_id: 5, name: 'Riz', category_name: 'Céréales', unit: 'kg', total_consumed: 2, avg_consumption: 2 }]);
    mockGetStockLossesReport.mockResolvedValue({ total_losses: 1, total_loss_value: 10, expired_count: 0, expired_value: 0, loss_percentage: 1 });
    mockGetRecentMovements.mockResolvedValue(Array.from({ length: 21 }, (_, id) => ({
      id, product_id: 5, product_name: 'Riz', quantity: 1, type: 'OUT', created_at: new Date('2026-10-01T12:00:00Z'), user_name: 'Awa',
    })));
    mockGetInventoryHealth.mockResolvedValue({ accuracy_percentage: 100, total_items: 0, discrepancies: 0 });
    mockGetDashboardKPIs.mockResolvedValue({ totalStockValue: 0, totalProducts: 1, criticalAlerts: 0, totalMovements: 21 });
    mockPrisma.user.findMany.mockResolvedValue([{ id: 1, fullName: 'Awa', email: 'awa@example.test', createdAt: new Date(), userRoles: [] }]);
    mockPrisma.stock_movements.findMany
      .mockResolvedValueOnce([{ created_at: new Date('2026-10-01T12:00:00Z'), product_id: 5, quantity: 2 }])
      .mockResolvedValueOnce([]);
    mockPrisma.products.findMany.mockResolvedValue([{ id: 5, name: 'Riz', unit: { name: 'kilogramme', abbreviation: 'kg' } }]);
    mockPrisma.activityLog.findMany.mockResolvedValue([{ id: 3, userId: 1, action: 'CREATE_STOCK_EXIT', details: '{"movId":8}', createdAt: new Date() }]);
  });

  it('returns current logs and full movement scope for the selected date period', async () => {
    const request = new Request('http://localhost/api/reports?start=2026-10-01&end=2026-10-31') as NextRequest;
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetRecentMovements).toHaveBeenCalledWith(null, new Date('2026-10-01'), new Date('2026-10-31'));
    expect(payload.data.movements).toHaveLength(21);
    expect(payload.data.consumption_details[0]).toMatchObject({ product_name: 'Riz', quantity: 2, unit: 'kg' });
    expect(payload.data.activity_logs[0]).toMatchObject({ user_name: 'Awa', entity_type: 'Mouvement de stock', entity_id: 8 });
  });

  it('returns current stock value grouped by product category', async () => {
    mockPrisma.stock_batches.findMany.mockResolvedValue([
      { quantity_remaining: 3, purchase_price: 100, product: { category: { name: 'Viande' } } },
      { quantity_remaining: 2, purchase_price: 50, product: { category: { name: 'Épicerie' } } },
    ]);
    const response = await GET(new Request('http://localhost/api/reports?start=2026-10-01&end=2026-10-31') as NextRequest);
    const payload = await response.json();

    expect(payload.data.stock_by_category).toEqual([
      { name: 'Viande', value: 300 },
      { name: 'Épicerie', value: 100 },
    ]);
  });
});
