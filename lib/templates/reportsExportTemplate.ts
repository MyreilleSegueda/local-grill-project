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
interface TopProduct { product_id: number; name: string; category_name: string; total_consumed: number; avg_consumption: number; }
interface Losses { total_loss_value: number; expired_count: number; loss_percentage: number; }
interface InventoryHealth { accuracy_percentage: number; total_items: number; discrepancies: number; }
interface Movement { id: number; product_name: string; quantity: number; type: string; created_at: string; user_name: string; }
interface AppUser { id: number; name: string; email: string; role: string; created_at: string; }
interface Role { id: number; name: string; description: string; }
interface Permission { id: number; name: string; description: string; }
interface Category { id: number; name: string; }
interface Supplier { id: number; name: string; email: string; phone: string; }
interface Unit { id: number; name: string; symbol: string; }
interface AlertItem { id: number; type: string; severity: string; message: string; is_resolved: boolean; created_at: string; }
interface ActivityLog { id: number; user_id: number; action: string; entity_type: string; created_at: string; }
interface KPIs { totalStockValue: number; totalProducts: number; criticalAlerts: number; totalMovements: number; }

export interface ReportExportData {
  kpis: KPIs;
  daily_consumption: DailyConsumption[];
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
    
    this.totalPages = 3;

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
      head: [['Date', 'Consommation']],
      body: data.daily_consumption.map(d => [d.date, fmt(d.total_consumed)]),
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
      head: [['Produit', 'Categorie', 'Total', 'Moy.']],
      body: data.top_products.map(p => [p.name, p.category_name, fmt(p.total_consumed), p.avg_consumption.toFixed(1)]),
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
    this.drawFooter();
    this.currentPage++;

    autoTable(doc, {
      startY: 45,
      head: [['Produit', 'Qte', 'Type', 'Date', 'Utilisateur']],
      body: data.movements.map(m => [m.product_name, m.quantity, m.type, fmtDate(m.created_at), m.user_name]),
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
      margin: { left: 14, right: W / 2 + 4 },
      tableWidth: W / 2 - 18,
      didParseCell: (h) => {
        if (h.section !== 'body' || h.column.index !== 2) return;
        const v = String(h.cell.raw ?? '');
        if (v === 'ENTREE') h.cell.styles.textColor = [5, 150, 105] as [number, number, number];
        if (v === 'SORTIE') h.cell.styles.textColor = [220, 38, 38] as [number, number, number];
      },
    });

    autoTable(doc, {
      startY: 45,
      head: [['Type', 'Severite', 'Message', 'Resolue']],
      body: data.alerts.map(a => [a.type, a.severity, a.message.slice(0, 38), a.is_resolved ? 'Oui' : 'Non']),
      styles: { fontSize: 8, cellPadding: 3, textColor: dark },
      headStyles: { fillColor: [217, 119, 6] as [number, number, number], textColor: white, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: light },
      columnStyles: { 3: { halign: 'center' } },
      margin: { left: W / 2 + 4, right: 14 },
      tableWidth: W / 2 - 18,
    });

    // Page 3 - Users & Logs
    doc.addPage();
    this.drawHeader('UTILISATEURS & LOGS', `Periode: ${start} → ${end}`);
    this.drawFooter();
    this.currentPage++;

    autoTable(doc, {
      startY: 45,
      head: [['Nom', 'Email', 'Role', 'Depuis']],
      body: data.users.map(u => [u.name, u.email, u.role, fmtDate(u.created_at)]),
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
      head: [['User ID', 'Action', 'Entite', 'Date']],
      body: data.activity_logs.map(l => [l.user_id, l.action, l.entity_type, fmtDate(l.created_at)]),
      styles: { fontSize: 8, cellPadding: 3, textColor: dark },
      headStyles: { fillColor: accent, textColor: white, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: light },
      margin: { left: W / 2 + 4, right: 14 },
      tableWidth: W / 2 - 18,
    });

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

  const addSheet = (rows: Record<string, string | number | boolean>[], name: string) => {
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length + 4, 16) }));
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
  addSheet(data.daily_consumption.map(d => ({ 'Date': d.date, 'Consommation': d.total_consumed })), 'Consommation');
  addSheet(data.top_products.map(p => ({ 'Produit': p.name, 'Categorie': p.category_name, 'Total': p.total_consumed, 'Moyenne': +p.avg_consumption.toFixed(2) })), 'Top Produits');
  addSheet(data.movements.map(m => ({ 'Produit': m.product_name, 'Quantite': m.quantity, 'Type': m.type, 'Date': fmtDate(m.created_at), 'Utilisateur': m.user_name })), 'Mouvements');
  addSheet(data.alerts.map(a => ({ 'Type': a.type, 'Severite': a.severity, 'Message': a.message, 'Resolue': a.is_resolved ? 'Oui' : 'Non', 'Date': fmtDate(a.created_at) })), 'Alertes');
  addSheet([{ 'Pertes (FCFA)': data.losses.total_loss_value, 'Expires': data.losses.expired_count, '% perte': +data.losses.loss_percentage.toFixed(2) }], 'Pertes');
  addSheet(data.users.map(u => ({ 'Nom': u.name, 'Email': u.email, 'Role': u.role, 'Depuis': fmtDate(u.created_at) })), 'Utilisateurs');
  addSheet(data.activity_logs.map(l => ({ 'User ID': l.user_id, 'Action': l.action, 'Entite': l.entity_type, 'Date': fmtDate(l.created_at) })), 'Logs');
  addSheet(data.categories.map(c => ({ 'ID': c.id, 'Categorie': c.name })), 'Categories');
  addSheet(data.suppliers.map(s => ({ 'Nom': s.name, 'Email': s.email, 'Tel': s.phone })), 'Fournisseurs');
  addSheet(data.units.map(u => ({ 'Unite': u.name, 'Symbole': u.symbol })), 'Unites');
  addSheet(data.roles.map(r => ({ 'Role': r.name, 'Description': r.description })), 'Roles');

  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(xlsxBuffer);
}
