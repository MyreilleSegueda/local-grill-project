import * as XLSX from 'xlsx';
import { generateReportsPDF, generateReportsXLSX, ReportExportData } from '../lib/templates/reportsExportTemplate';

const report: ReportExportData = {
  kpis: { totalStockValue: 1200, totalProducts: 1, criticalAlerts: 0, totalMovements: 2 },
  daily_consumption: [],
  consumption_details: [{ date: '2026-10-02T12:00:00.000Z', product_name: 'Poulet', sku: 'VOL-01', quantity: 3, unit: 'kg', unit_cost: 2500, value: 7500 }],
  top_products: [{ product_id: 1, name: 'Poulet', category_name: 'Viande', unit: 'kg', total_consumed: 3, avg_consumption: 1.5 }],
  losses: { total_loss_value: 250, total_losses: 1, expired_count: 0, loss_percentage: 1.2 },
  loss_movements: [{ product_name: 'Poulet', quantity: 1, unit: 'kg', cause: 'Casse', type: 'LOSS', value: null, created_at: '2026-10-02T12:00:00.000Z' }],
  inventory_health: { accuracy_percentage: 98, total_items: 1, discrepancies: 0 },
  movements: [
    { id: 1, product_id: 1, product_name: 'Poulet', sku: 'VOL-01', quantity: 3, unit: 'kg', unit_cost: 2500, movement_value: 7500, type: 'IN', reason: 'Réception', created_at: '2026-10-02T12:00:00.000Z', user_name: 'Awa' },
    { id: 2, product_id: 1, product_name: 'Poulet', quantity: 1, unit: 'kg', type: 'EXPIRED', created_at: '2026-10-03T12:00:00.000Z', user_name: 'Awa' },
  ],
  users: [{ id: 1, name: 'Awa', email: 'awa@example.test', role: 'ADMIN', created_at: '2026-10-01T12:00:00.000Z' }],
  roles: [], permissions: [], categories: [], suppliers: [], units: [],
  alerts: [{ id: 1, type: 'LOW_STOCK', severity: 'WARNING', message: 'Stock faible', is_resolved: false, created_at: '2026-10-02T12:00:00.000Z' }],
  activity_logs: [{ id: 1, user_id: 1, user_name: 'Awa', action: 'STOCK_ADJUSTMENT', entity_type: 'products', entity_id: 1, created_at: '2026-10-02T12:00:00.000Z' }],
};

describe('reports export smoke checks', () => {
  it('generates a readable workbook with the selected report sections', () => {
    const buffer = generateReportsXLSX(report, '2026-10-01', '2026-10-31');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    expect(workbook.SheetNames).toContain('Consommation');
    expect(workbook.SheetNames).toContain('Pertes');
    expect(workbook.SheetNames).toContain('Mouvements globaux');
    const movements = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['Mouvements globaux']);
    expect(movements[0]['Motif']).toBe('Réception');
    expect(movements[0]['Type de mouvement']).toBe('Entrée de stock');
    expect(movements[0]["Valeur au coût d'achat (FCFA)"]).toBe(7500);
    const consumption = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['Consommation']);
    expect(consumption[0]['Référence']).toBe('VOL-01');
    expect(consumption[0]["Coût d'achat consommé (FCFA)"]).toBe(7500);
    const exits = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['Sorties']);
    expect(exits[0]['Type de mouvement']).toBe('Produit périmé');
    const losses = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['Pertes']);
    expect(losses[0]['Valeur (FCFA)']).toBe('');
    const emptyWorkbook = XLSX.read(generateReportsXLSX({ ...report, movements: [] }, '2026-10-01', '2026-10-31'), { type: 'buffer' });
    expect(XLSX.utils.sheet_to_json(emptyWorkbook.Sheets['Entrées'], { header: 1 })[0]).toEqual(['Produit', 'Référence', 'Quantité', 'Unité', "Coût d'achat unitaire (FCFA)", "Valeur au coût d'achat (FCFA)", 'Type de mouvement', 'Date', 'Effectué par', 'Motif']);
  });

  it('generates a PDF and handles empty report sections', () => {
    const buffer = generateReportsPDF({ ...report, movements: [], alerts: [], users: [], activity_logs: [], loss_movements: [] }, '2026-10-01', '2026-10-31');
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(4);
  });

  it('paginates long movement tables in the general PDF', () => {
    const movements = Array.from({ length: 80 }, (_, i) => ({ ...report.movements[0], id: i + 1 }));
    const buffer = generateReportsPDF({ ...report, movements }, '2026-10-01', '2026-10-31');
    const pageCount = buffer.toString('latin1').match(/\/Type \/Page\b/g)?.length ?? 0;
    expect(pageCount).toBeGreaterThan(4);
  });
});
