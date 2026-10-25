/**
 * Template PDF/XLSX Professionnel pour les rapports complets
 * Header avec logo et coordonnées, footer avec infos légales
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Configuration de la marque
const BRAND = {
  name: "LOCAL GRILL SARL",
  address: "01 BP : 5270 Ouagadougou 01",
  phone: "Tél : (226) 72 21 08 08 / 66 16 48 48",
  location: "Boulevard Joly - Hôtel Ouaga2000",
  sector: "Secteur 52 – Arrondissement 12 - Lot 20 – Parcelle 07 – SECT° F",
  rccm: "RCCM n° BFOUA2021B4338",
  ifu: "IFU n° 00156558B",
  taxRegime: "Régime d'imposition : CME, Division fiscale Ouaga 08",
  bankAccounts: [
    "BSIC n° 01002 000100114622 36",
    "ATLANTIQUE n° 01002 01005 052680850009 23"
  ],
  colors: {
    primary: [107, 33, 168] as [number, number, number],
    secondary: [91, 33, 182] as [number, number, number],
    dark: [26, 23, 20] as [number, number, number],
    gray: [107, 101, 96] as [number, number, number],
    lightGray: [232, 228, 221] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    red: [220, 38, 38] as [number, number, number],
    amber: [245, 158, 11] as [number, number, number],
    green: [6, 95, 70] as [number, number, number],
    indigo: [79, 70, 229] as [number, number, number]
  }
};

const MARGIN = { top: 42, left: 8, right: 8, bottom: 35 };

// Interfaces
interface DailyConsumption { date: string; total_consumed: number; }
interface ConsumptionDetail { date: string; product_name: string | null; sku?: string | null; quantity: number; unit: string | null; unit_cost?: number | null; value?: number | null; }
interface TopProduct { product_id: number; name: string; category_name: string | null; unit?: string | null; total_consumed: number; avg_consumption: number; }
interface Losses { total_loss_value: number; total_losses?: number; expired_count: number; loss_percentage: number; }
interface InventoryHealth { accuracy_percentage: number; total_items: number; discrepancies: number; }
interface Movement { id: number; product_id?: number; product_name: string; sku?: string | null; quantity: number; unit?: string | null; unit_cost?: number | null; movement_value?: number | null; type: string; reason?: string | null; created_at: string; user_name: string; }
interface AppUser { id: number; name: string; email: string; role: string; created_at: string; }
interface Role { id: number; name: string; description: string; }
interface Permission { id: number; name: string; description: string; }
interface Category { id: number; name: string; }
interface Supplier { id: number; name: string; email: string; phone: string; }
interface Unit { id: number; name: string; symbol: string; }
interface AlertItem { id: number; type: string; severity: string; message: string; is_resolved: boolean; created_at: string; }
interface ActivityLog { id: number; user_id: number; user_name?: string | null; action: string; entity_type: string | null; entity_id?: number | null; created_at: string; }
interface KPIs { totalStockValue: number; totalProducts: number; criticalAlerts: number; totalMovements: number; }

export interface ReportExportData {
  kpis: KPIs;
  daily_consumption: DailyConsumption[];
  consumption_details?: ConsumptionDetail[];
  loss_movements?: Array<{ product_name: string; quantity: number; unit: string | null; cause: string | null; type: string; value: number | null; created_at: string }>;
  top_products: TopProduct[];
  losses: Losses;
  inventory_health: InventoryHealth;
  movements: Movement[];
  users: AppUser[];
  roles: Role[];
  permissions: Permission[];
  categories: Category[];
  suppliers: Supplier[];
  units: Unit[];
  alerts: AlertItem[];
  activity_logs: ActivityLog[];
}

function loadLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'medias', 'images', 'logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }
    return null;
  } catch {
    return null;
  }
}

function fmt(n: number, dec = 0): string {
  return n?.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) ?? '0';
}

function fmtDate(d: string): string {
  return d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}
const movementLabel = (type: string) => ({ IN: 'Entrée de stock', OUT: 'Sortie de stock', LOSS: 'Perte', EXPIRED: 'Produit périmé', ADJUSTMENT: 'Ajustement de stock' }[type] ?? type);
const severityLabel = (value: string) => ({ CRITICAL: 'Critique', WARNING: 'Avertissement', INFO: 'Information' }[value] ?? value);
const alertTypeLabel = (value: string) => ({ LOW_STOCK: 'Stock faible', EXPIRED: 'Produit périmé', EXPIRING_SOON: 'Péremption proche', RUPTURE: 'Rupture de stock', EXCESS: 'Stock excédentaire' }[value] ?? value);
const actionLabel = (value: string) => ({ STOCK_ADJUSTMENT: 'Ajustement du stock', STOCK_IN: 'Entrée de stock', STOCK_OUT: 'Sortie de stock', LOGIN: 'Connexion', LOGOUT: 'Déconnexion' }[value] ?? value.replaceAll('_', ' ').toLowerCase());
const roleLabel = (value: string) => ({ ADMIN: 'Administrateur', ADMINISTRATOR: 'Administrateur', GERANT: 'Gerant', MANAGER: 'Responsable', STOCK_MANAGER: 'Responsable stock', USER: 'Utilisateur', UTILISATEUR: 'Utilisateur', COOK: 'Cuisinier', CASHIER: 'Caissier' }[value.toUpperCase()] ?? value);

// PDF Template Class
class ReportsPDFTemplate {
  private doc: jsPDF;
  private currentPage: number = 1;
  private totalPages: number = 1;

  constructor() {
    this.doc = new jsPDF('l', 'mm', 'a4');
  }

  private drawHeader(title: string, subtitle?: string): void {
    const doc = this.doc;
    const W = doc.internal.pageSize.getWidth();
    const logoData = loadLogoBase64();

    doc.setFillColor(...BRAND.colors.primary);
    doc.rect(0, 0, W, 35, 'F');

    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', 8, 5, 25, 25);
      } catch {
        this.drawLogoPlaceholder(doc);
      }
    } else {
      this.drawLogoPlaceholder(doc);
    }

    const textX = logoData ? 40 : 45;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(BRAND.name, textX, 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(BRAND.address, textX, 20);
    doc.text(BRAND.phone, textX, 24);
    doc.text(BRAND.location, textX, 28);
    doc.text(BRAND.sector, textX, 32);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, W - 8, 16, { align: 'right' });

    if (subtitle) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, W - 8, 23, { align: 'right' });
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFontSize(9);
    doc.text(`Généré le ${dateStr}`, W - 8, 30, { align: 'right' });

    doc.setDrawColor(...BRAND.colors.secondary);
    doc.setLineWidth(1);
    doc.line(8, 37, W - 8, 37);
  }

  private drawLogoPlaceholder(doc: jsPDF): void {
    doc.setFillColor(255, 255, 255);
    doc.circle(25, 17, 8, 'F');
    doc.setTextColor(...BRAND.colors.primary);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LG', 25, 20, { align: 'center' });
  }

  private drawFooter(): void {
    const doc = this.doc;
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    doc.setDrawColor(...BRAND.colors.lightGray);
    doc.setLineWidth(0.3);
    doc.line(8, H - 25, W - 8, H - 25);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.colors.gray);

    doc.text(BRAND.rccm, 8, H - 20);
    doc.text(BRAND.ifu, 8, H - 16);
    doc.text(BRAND.taxRegime, W / 2, H - 20, { align: 'center' });
    doc.text('Comptes bancaires :', W - 8, H - 20, { align: 'right' });
    doc.text(BRAND.bankAccounts[0], W - 8, H - 16, { align: 'right' });
    doc.text(BRAND.bankAccounts[1], W - 8, H - 12, { align: 'right' });

    doc.setFontSize(8);
    doc.setTextColor(...BRAND.colors.dark);
    doc.text(`Page ${this.currentPage} / ${this.totalPages}`, W / 2, H - 8, { align: 'center' });

    doc.setFontSize(7);
    doc.setTextColor(...BRAND.colors.gray);
    doc.text('Document confidentiel - Usage interne uniquement', W / 2, H - 4, { align: 'center' });
  }

  public generatePDF(data: ReportExportData, start: string, end: string): Buffer {
    const doc = this.doc;
    const W = doc.internal.pageSize.getWidth();
    
    this.totalPages = 1;

    // Page 1 - Cover + KPIs
    this.drawHeader('RAPPORT DE GESTION', `Periode: ${start} → ${end}`);

    const accent = BRAND.colors.indigo;
    const dark = BRAND.colors.dark;
    const light = [241, 240, 236] as [number, number, number];
    const white = BRAND.colors.white;

    // KPI Cards
    const kpis = [
      { label: 'Valeur stock', value: `${fmt(data.kpis.totalStockValue)} FCFA`, col: light, text: dark, stripe: accent },
      { label: 'Produits actifs', value: String(data.kpis.totalProducts), col: [238, 242, 255] as [number, number, number], text: [55, 48, 163] as [number, number, number], stripe: accent },
      { label: 'Alertes critiques', value: String(data.kpis.criticalAlerts), col: [254, 242, 242] as [number, number, number], text: [153, 27, 27] as [number, number, number], stripe: [220, 38, 38] },
      { label: 'Sante inventaire', value: `${data.inventory_health.accuracy_percentage}%`, col: [236, 253, 245] as [number, number, number], text: [6, 95, 70] as [number, number, number], stripe: [5, 150, 105] },
      { label: 'Pertes totales', value: `${fmt(data.losses.total_loss_value)} FCFA`, col: [255, 251, 235] as [number, number, number], text: [146, 64, 14] as [number, number, number], stripe: [217, 119, 6] },
    ];

    let cardX = 14;
    const cardY = 45;
    const cardW = (W - 28 - (kpis.length - 1) * 4) / kpis.length;
    const cardH = 20;

    kpis.forEach((k) => {
      doc.setFillColor(...k.col);
      doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, 'F');
      doc.setFillColor(...k.stripe as [number, number, number]);
      doc.roundedRect(cardX, cardY, cardW, 1.5, 0.5, 0.5, 'F');
      doc.setTextColor(...k.text);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(k.label, cardX + 3, cardY + 6);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(k.value, cardX + 3, cardY + 15);
      cardX += cardW + 4;
    });

    // Tables
    doc.setTextColor(...dark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Consommation quotidienne', 14, cardY + cardH + 10);
    doc.text('Top produits consommes', W / 2 + 4, cardY + cardH + 10);

    autoTable(doc, {
      startY: cardY + cardH + 13,
      head: data.consumption_details?.length ? [['Date', 'Produit', 'Référence', 'Quantité consommée', 'Unité', "Coût d'achat unitaire (FCFA)", "Coût d'achat consommé (FCFA)"]] : [['Date', 'Consommation totale (quantité)']],
      body: data.consumption_details?.length ? data.consumption_details.map(d => [fmtDate(d.date), d.product_name ?? '—', d.sku || '—', fmt(d.quantity), d.unit || '—', d.unit_cost == null ? '—' : fmt(d.unit_cost, 2), d.value == null ? '—' : fmt(d.value, 2)]) : data.daily_consumption.map(d => [fmtDate(d.date), fmt(d.total_consumed)]),
      styles: { fontSize: 8, cellPadding: 3, textColor: dark },
      headStyles: {
        fillColor: BRAND.colors.primary,
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      alternateRowStyles: { fillColor: light },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 14, right: W / 2 + 4 },
      tableWidth: W / 2 - 18,
    });

    autoTable(doc, {
      startY: cardY + cardH + 13,
      head: [['Rang', 'Produit', 'Catégorie', 'Quantité totale consommée', 'Moyenne par relevé']],
      body: data.top_products.map((p, i) => [i + 1, p.name || '', p.category_name ?? '', `${fmt(p.total_consumed)}${p.unit ? ` ${p.unit}` : ''}`, `${p.avg_consumption.toFixed(2)}${p.unit ? ` ${p.unit}` : ''}`]),
      styles: { fontSize: 8, cellPadding: 3, textColor: dark },
      headStyles: { fillColor: accent, textColor: white, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: light },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: W / 2 + 4, right: 14 },
      tableWidth: W / 2 - 18,
    });

    // Page 2 - Movements & Alerts
    doc.addPage();
    this.drawHeader('MOUVEMENTS & ALERTES', `Periode: ${start} → ${end}`);
    this.currentPage++;

    autoTable(doc, {
      startY: 45,
      head: [['Produit', 'Référence', 'Quantité', 'Unité', "Coût d'achat unitaire (FCFA)", "Valeur au coût d'achat (FCFA)", 'Type de mouvement', 'Date', 'Utilisateur', 'Motif']],
body: data.movements.map(m => {
  return [
    m.product_name || '',
    m.sku || '—',
    fmt(m.quantity),
    m.unit || '—',
    m.unit_cost == null ? '—' : fmt(m.unit_cost, 2),
    m.movement_value == null ? '—' : fmt(m.movement_value, 2),
    movementLabel(m.type),
    fmtDate(m.created_at),
    m.user_name || '',
    m.reason || 'Non renseigné',
  ];
}),
      styles: { fontSize: 8, cellPadding: 3, textColor: dark },
      headStyles: {
        fillColor: BRAND.colors.primary,
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      alternateRowStyles: { fillColor: light },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
      margin: { left: 14, right: 14 },
      tableWidth: W - 28,
      didParseCell: (h) => {
  if (h.section !== 'body' || h.column.index !== 3) return;

  const type = String(h.cell.raw ?? '');

  if (type === movementLabel('IN')) {
    h.cell.styles.textColor = [5, 150, 105];
    h.cell.styles.fontStyle = 'bold';
  } else if (type === movementLabel('OUT')) {
    h.cell.styles.textColor = [37, 99, 235];
    h.cell.styles.fontStyle = 'bold';
  } else if (type === movementLabel('LOSS') || type === movementLabel('EXPIRED')) {
    h.cell.styles.textColor = [220, 38, 38];
    h.cell.styles.fontStyle = 'bold';
  } else if (type === movementLabel('ADJUSTMENT')) {
    h.cell.styles.textColor = [124, 58, 237];
    h.cell.styles.fontStyle = 'bold';
  }
 },
    });

    const movementEndY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 45;
    autoTable(doc, {
      startY: movementEndY + 8,
      head: [["Type d’alerte", 'Gravité', 'Description', 'État', 'Date']],
      body: data.alerts.map(a => [alertTypeLabel(a.type), severityLabel(a.severity), a.message, a.is_resolved ? 'Résolue' : 'Non résolue', fmtDate(a.created_at)]),
      styles: { fontSize: 8, cellPadding: 3, textColor: dark },
      headStyles: { fillColor: [217, 119, 6] as [number, number, number], textColor: white, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: light },
      columnStyles: { 3: { halign: 'center' } },
      margin: { left: 14, right: 14 },
      tableWidth: W - 28,
    });

    // Page 3 - Users & Logs
    doc.addPage();
    this.drawHeader('UTILISATEURS & LOGS', `Periode: ${start} → ${end}`);
    this.currentPage++;

    autoTable(doc, {
      startY: 45,
      head: [['Nom', 'E-mail', 'Rôle', 'Création du compte']],
      body: data.users.map(u => [u.name, u.email, roleLabel(u.role), fmtDate(u.created_at)]),
      styles: { fontSize: 8, cellPadding: 3, textColor: dark },
      headStyles: {
        fillColor: BRAND.colors.primary,
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      alternateRowStyles: { fillColor: light },
      margin: { left: 14, right: W / 2 + 4 },
      tableWidth: W / 2 - 18,
    });

    autoTable(doc, {
      startY: 45,
      head: [['Utilisateur', 'Action', 'Élément concerné', 'Date']],
      body: data.activity_logs.map(l => [l.user_name || `Utilisateur #${l.user_id}`, actionLabel(l.action), l.entity_type ? `${l.entity_type}${l.entity_id ? ` #${l.entity_id}` : ''}` : '', fmtDate(l.created_at)]),
      styles: { fontSize: 8, cellPadding: 3, textColor: dark },
      headStyles: { fillColor: accent, textColor: white, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: light },
      margin: { left: W / 2 + 4, right: 14 },
      tableWidth: W / 2 - 18,
    });

    doc.addPage();
    this.currentPage++;
    this.drawHeader('PERTES & GASPILLAGE', `Periode : ${start} - ${end}`);
    autoTable(doc, {
      startY: 45,
      head: data.loss_movements?.length
        ? [['Produit', 'Quantite perdue', 'Unite', 'Cause', 'Valeur (FCFA)', 'Type', 'Date']]
        : [['Valeur totale des pertes (FCFA)', 'Mouvements de perte', 'Mouvements de produits expires', 'Pertes / valeur du stock (%)']],
      body: data.loss_movements?.length
        ? data.loss_movements.map(loss => [loss.product_name, `${fmt(loss.quantity)}${loss.unit ? ` ${loss.unit}` : ''}`, loss.unit ?? '', loss.cause ?? '', loss.value === null ? '—' : fmt(loss.value), movementLabel(loss.type), fmtDate(loss.created_at)])
        : [[fmt(data.losses.total_loss_value), data.losses.total_losses ?? 0, data.losses.expired_count, `${data.losses.loss_percentage.toFixed(2)} %`]],
      styles: { fontSize: 8, cellPadding: 3, textColor: dark },
      headStyles: { fillColor: BRAND.colors.primary, textColor: white, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: light },
      margin: { left: 14, right: 14 },
    });

    this.totalPages = (doc.internal as unknown as { pages: unknown[] }).pages.length - 1;
    for (let page = 1; page <= this.totalPages; page++) {
      this.currentPage = page;
      doc.setPage(page);
      this.drawFooter();
    }
    return Buffer.from(doc.output('arraybuffer'));
  }
}

export function generateReportsPDF(data: ReportExportData, start: string, end: string): Buffer {
  const template = new ReportsPDFTemplate();
  return template.generatePDF(data, start, end);
}

export function generateReportsXLSX(data: ReportExportData, start: string, end: string): Buffer {
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleDateString('fr-FR');

  const addSheet = (rows: Record<string, string | number | boolean>[], name: string, headers?: string[]) => {
    const ws = rows.length
      ? XLSX.utils.json_to_sheet(rows)
      : headers?.length
        ? XLSX.utils.aoa_to_sheet([headers])
        : XLSX.utils.json_to_sheet([{ 'Information': 'Aucune donnée disponible pour cette période.' }]);
    if (headers?.length && rows.length === 0) ws['!cols'] = headers.map(k => ({ wch: Math.max(k.length + 4, 16) }));
    else if (rows.length) ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  // Info sheet with merged header
  const infoData = [
    { '': BRAND.name, ' ': '', '  ': '', '   ': '', '    ': '' },
    { '': 'Rapport complet de gestion', ' ': '', '  ': '', '   ': '', '    ': '' },
    { '': `Genere le : ${now}`, ' ': '', '  ': '', '   ': '', '    ': '' },
    { '': `Periode : ${start} → ${end}`, ' ': '', '  ': '', '   ': '', '    ': '' },
    { '': '', ' ': '', '  ': '', '   ': '', '    ': '' },
    { '': BRAND.address, ' ': '', '  ': '', '   ': '', '    ': '' },
    { '': BRAND.phone, ' ': '', '  ': '', '   ': '', '    ': '' },
    { '': BRAND.rccm, ' ': '', '  ': '', '   ': '', '    ': '' },
    { '': BRAND.ifu, ' ': '', '  ': '', '   ': '', '    ': '' },
  ];
  const wsInfo = XLSX.utils.json_to_sheet(infoData);
  wsInfo['!cols'] = [{ wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  wsInfo['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Infos');

  // KPIs sheet
  addSheet([{
    'Valeur stock (FCFA)': data.kpis.totalStockValue,
    'Produits actifs': data.kpis.totalProducts,
    'Alertes critiques': data.kpis.criticalAlerts,
    'Mouvements': data.kpis.totalMovements,
    'Sante inventaire (%)': data.inventory_health.accuracy_percentage,
    'Pertes totales (FCFA)': data.losses.total_loss_value,
  }], 'KPIs');

  // Data sheets
  addSheet(data.consumption_details?.length ? data.consumption_details.map(d => ({ 'Date': fmtDate(d.date), 'Produit': d.product_name ?? '', 'Référence': d.sku ?? '—', 'Quantité consommée': d.quantity, 'Unité': d.unit ?? '—', "Coût d'achat unitaire (FCFA)": d.unit_cost ?? '—', "Coût d'achat consommé (FCFA)": d.value ?? '—' })) : data.daily_consumption.map(d => ({ 'Date': fmtDate(d.date), 'Consommation totale (quantité)': d.total_consumed })), 'Consommation');
  addSheet(data.top_products.map((p, i) => ({ 'Rang': i + 1, 'Produit': p.name || '', 'Catégorie': p.category_name ?? '', 'Quantité totale consommée': p.total_consumed, 'Unité': p.unit ?? '', 'Moyenne par relevé': +p.avg_consumption.toFixed(2), 'Unité moyenne': p.unit ?? '' })), 'Top Produits');
  // Préparer les mouvements selon leur type réel
const movementRows = data.movements.map(m => {
  return {
    'Produit': m.product_name || '',
    'Référence': m.sku ?? '—',
    'Quantité': m.quantity,
    'Unité': m.unit ?? '—',
    "Coût d'achat unitaire (FCFA)": m.unit_cost ?? '—',
    "Valeur au coût d'achat (FCFA)": m.movement_value ?? '—',
    'Type de mouvement': movementLabel(m.type),
    'Date': fmtDate(m.created_at),
    'Effectué par': m.user_name,
    'Motif': m.reason ?? '',
  };
});

// Feuille des entrées de stock
const movementHeaders = ['Produit', 'Référence', 'Quantité', 'Unité', "Coût d'achat unitaire (FCFA)", "Valeur au coût d'achat (FCFA)", 'Type de mouvement', 'Date', 'Effectué par', 'Motif'];
addSheet(movementRows.filter(m => m['Type de mouvement'] === movementLabel('IN')), 'Entrées', movementHeaders);

addSheet(
  movementRows.filter(m => ['OUT', 'LOSS', 'EXPIRED'].map(movementLabel).includes(m['Type de mouvement'])),
  'Sorties',
  movementHeaders
);

addSheet(movementRows, 'Mouvements globaux');
  addSheet(data.alerts.map(a => ({ 'Type alerte': alertTypeLabel(a.type), 'Gravité': severityLabel(a.severity), 'Description': a.message, 'État': a.is_resolved ? 'Résolue' : 'Non résolue', 'Date': fmtDate(a.created_at) })), 'Alertes');
  addSheet(data.loss_movements?.length ? data.loss_movements.map(l => ({ 'Produit': l.product_name, 'Quantité perdue': l.quantity, 'Unité': l.unit ?? '', 'Cause': l.cause ?? '', 'Valeur (FCFA)': l.value ?? '', 'Type': movementLabel(l.type), 'Date': fmtDate(l.created_at) })) : [{ 'Valeur totale des pertes (FCFA)': data.losses.total_loss_value, 'Nombre de mouvements de perte': data.losses.total_losses ?? 0, 'Nombre de mouvements de produits expirés': data.losses.expired_count, 'Pertes / valeur du stock (%)': +data.losses.loss_percentage.toFixed(2) }], 'Pertes');
  addSheet(data.users.map(u => ({ 'Nom': u.name, 'E-mail': u.email, 'Rôle': roleLabel(u.role), 'Création du compte': fmtDate(u.created_at) })), 'Utilisateurs');
  addSheet(data.activity_logs.map(l => ({ 'Utilisateur': l.user_name || `Utilisateur #${l.user_id}`, 'Action': actionLabel(l.action), 'Élément concerné': l.entity_type ?? '', 'Date': fmtDate(l.created_at) })), 'Logs');
  addSheet(data.categories.map(c => ({ 'ID': c.id, 'Categorie': c.name })), 'Categories');
  addSheet(data.suppliers.map(s => ({ 'Nom': s.name, 'Email': s.email, 'Tel': s.phone })), 'Fournisseurs');
  addSheet(data.units.map(u => ({ 'Unite': u.name, 'Symbole': u.symbol })), 'Unites');
  addSheet(data.roles.map(r => ({ 'Role': r.name, 'Description': r.description })), 'Roles');

  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(xlsxBuffer);
}
