const mockFindMovements = jest.fn();
const mockFindProducts = jest.fn();
const mockFindUsers = jest.fn();

jest.mock('@/server/db/prisma', () => ({
  prisma: {
    stock_movements: { findMany: (...args: unknown[]) => mockFindMovements(...args) },
    products: { findMany: (...args: unknown[]) => mockFindProducts(...args) },
    user: { findMany: (...args: unknown[]) => mockFindUsers(...args) },
  },
}));

import { getDailyConsumptionChart, getRecentMovements, getTopConsumedProducts } from '../lib/services/dashboardService';

describe('report data sources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds consumption rows from the stock movements written by stock consumption', async () => {
    mockFindMovements.mockResolvedValue([
      { created_at: new Date('2026-10-01T10:00:00Z'), quantity: 2 },
      { created_at: new Date('2026-10-01T14:00:00Z'), quantity: 3 },
    ]);

    await expect(getDailyConsumptionChart(30, new Date('2026-10-01'), new Date('2026-10-01')))
      .resolves.toEqual([{ date: '2026-10-01', total_consumed: 5 }]);
    expect(mockFindMovements).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        type: { in: ['OUT', 'LOSS', 'EXPIRED'] },
        created_at: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
      }),
    }));
  });

  it('aggregates the top products using stock movement quantities, units and the selected dates', async () => {
    mockFindMovements.mockResolvedValue([
      { product_id: 4, quantity: 2 },
      { product_id: 4, quantity: 3 },
    ]);
    mockFindProducts.mockResolvedValue([{
      id: 4, name: 'Poulet', category: { name: 'Viande' }, unit: { name: 'kilogramme', abbreviation: 'kg' },
    }]);

    await expect(getTopConsumedProducts(10, new Date('2026-10-01'), new Date('2026-10-31')))
      .resolves.toEqual([{
        product_id: 4, name: 'Poulet', category_name: 'Viande', unit: 'kg',
        total_consumed: 5, consumption_count: 2, avg_consumption: 2.5,
      }]);
    expect(mockFindMovements).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        type: { in: ['OUT', 'LOSS', 'EXPIRED'] },
        created_at: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
      }),
      select: { product_id: true, quantity: true },
    }));
  });

  it('does not limit the movement set when the report requests the full selected period', async () => {
    mockFindMovements.mockResolvedValue([]);
    mockFindUsers.mockResolvedValue([]);

    await getRecentMovements(null, new Date('2026-10-01'), new Date('2026-10-31'));

    const query = mockFindMovements.mock.calls[0][0];
    expect(query).not.toHaveProperty('take');
    expect(query.where.created_at).toEqual({ gte: expect.any(Date), lte: expect.any(Date) });
  });

  it('returns reference and purchase cost only when the movement has a valued batch', async () => {
    mockFindMovements.mockResolvedValue([{
      id: 12, product_id: 4, type: 'OUT', quantity: 2, reason: null, user_id: 8,
      created_at: new Date('2026-10-03T12:00:00Z'),
      product: { name: 'Riz', sku: 'RIZ-01', unit: { name: 'kilogramme', abbreviation: 'kg' } },
      batch: { batch_number: 'LOT-1', purchase_price: 1250 },
    }]);
    mockFindUsers.mockResolvedValue([{ id: 8, fullName: 'Awa' }]);

    await expect(getRecentMovements(20)).resolves.toMatchObject([{
      sku: 'RIZ-01', unit: 'kg', unit_cost: 1250, movement_value: 2500,
    }]);
  });
});
