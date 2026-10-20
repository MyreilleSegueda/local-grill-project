/**
 * Template PDF/XLSX Professionnel pour les alertes
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const BRAND = {
  name: "LOCAL GRILL SARL",
  address: "01 BP : 5270 Ouagadougou 01",
  phone: "Tel : (226) 72 21 08 08 / 66 16 48 48",
  location: "Boulevard Joly - Hotel Ouaga2000",
  sector: "Secteur 52 - Arrondissement 12 - Lot 20 - Parcelle 07 - SECT F",
  rccm: "RCCM n BFOUA2021B4338",
  ifu: "IFU n 00156558B",
  taxRegime: "Regime d'imposition : CME, Division fiscale Ouaga 08",
  bankAccounts: [
    "BSIC n 01002 000100114622 36",
    "ATLANTIQUE n 01002 01005 052680850009 23"
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

export interface AlertExportItem {
  id: number;
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  product_name: string;
  is_resolved: boolean;
  created_at: string;
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
  if (n === null || n === undefined) return '0';
  const num = Number(n);
  if (isNaN(num)) return '0';
  const str = num.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return str.replace(/\u202F/g, ' ');
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('fr-FR');
  } catch {
    return String(d);
  }
}

class AlertsPDFTemplate {
  private doc: jsPDF;
  private currentPage = 1;
  private totalPages = 1;

  constructor() {
    this.doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    this.doc.setProperties({ title: 'Alertes', creator: BRAND.name });
  }

  private drawHeader(title: string, subtitle: string) {
    const doc = this.doc;
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(...BRAND.colors.lightGray);
    doc.rect(0, 0, W, MARGIN.top, 'F');

    const logoBase64 = loadLogoBase64();
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', MARGIN.left, 8, 28, 28);
      } catch {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...BRAND.colors.primary);
    doc.text(BRAND.name, 44, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.colors.gray);
    doc.text(BRAND.address, 44, 26);
    doc.text(BRAND.phone, 44, 31);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...BRAND.colors.dark);
    doc.text(title, W - MARGIN.right, 20, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.colors.gray);
    doc.text(subtitle, W - MARGIN.right, 27, { align: 'right' });

    doc.setDrawColor(...BRAND.colors.primary);
    doc.setLineWidth(0.8);
    doc.line(MARGIN.left, 38, W - MARGIN.right, 38);
  }

  private drawFooter() {
    const doc = this.doc;
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    doc.setFillColor(...BRAND.colors.lightGray);
    doc.rect(0, H - MARGIN.bottom, W, MARGIN.bottom, 'F');

    doc.setDrawColor(...BRAND.colors.primary);
    doc.setLineWidth(0.5);
    doc.line(MARGIN.left, H - MARGIN.bottom + 1, W - MARGIN.right, H - MARGIN.bottom + 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.colors.gray);
    doc.text(`${BRAND.rccm} · ${BRAND.ifu}`, W / 2, H - 12, { align: 'center' });
    doc.text(`Page ${this.currentPage} / ${this.totalPages}`, W - MARGIN.right, H - 12, { align: 'right' });
    doc.setTextColor(...BRAND.colors.gray);
    doc.text('Document confidentiel - Usage interne uniquement', W / 2, H - 4, { align: 'center' });
  }

  public generatePDF(items: AlertExportItem[]): Buffer {
    const doc = this.doc;
    const W = doc.internal.pageSize.getWidth();

    this.totalPages = Math.max(1, Math.ceil(items.length / 30));

    this.drawHeader('ALERTES', `${items.length} alertes`);

    const dark = BRAND.colors.dark;
    const light = [241, 240, 236] as [number, number, number];
    const white = BRAND.colors.white;

    const criticalCount = items.filter(i => i.severity === 'CRITICAL').length;
    const warningCount = items.filter(i => i.severity === 'WARNING').length;
    const infoCount = items.filter(i => i.severity === 'INFO').length;
    const resolvedCount = items.filter(i => i.is_resolved).length;

    const kpis = [
      { label: 'Total alertes', value: String(items.length), col: light, text: dark, stripe: BRAND.colors.indigo },
      { label: 'Critiques', value: String(criticalCount), col: [254, 242, 242] as [number, number, number], text: [153, 27, 27] as [number, number, number], stripe: BRAND.colors.red },
      { label: 'Avertissements', value: String(warningCount), col: [255, 251, 235] as [number, number, number], text: [146, 64, 14] as [number, number, number], stripe: BRAND.colors.amber },
      { label: 'Infos', value: String(infoCount), col: [236, 253, 245] as [number, number, number], text: [6, 95, 70] as [number, number, number], stripe: BRAND.colors.green },
      { label: 'Resolues', value: String(resolvedCount), col: [238, 242, 255] as [number, number, number], text: [55, 48, 163] as [number, number, number], stripe: BRAND.colors.indigo },
    ];

    const cardWidth = (W - MARGIN.left - MARGIN.right - (kpis.length - 1) * 4) / kpis.length;
    let cx = MARGIN.left;

    for (const kpi of kpis) {
      doc.setFillColor(...kpi.col);
      doc.setDrawColor(...kpi.stripe);
      doc.setLineWidth(0.8);
      doc.roundedRect(cx, 44, cardWidth, 18, 2, 2, 'FD');
      doc.setDrawColor(...kpi.stripe);
      doc.line(cx + 0.5, 52, cx + cardWidth - 0.5, 52);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...kpi.text);
      doc.text(String(kpi.value), cx + cardWidth / 2, 50, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.colors.gray);
      doc.text(kpi.label, cx + cardWidth / 2, 58, { align: 'center' });

      cx += cardWidth + 4;
    }

    const body = items.map(a => [
      a.type,
      a.severity,
      a.product_name,
      a.message,
      a.is_resolved ? 'Oui' : 'Non',
      fmtDate(a.created_at),
    ]);

    const head = [['Type', 'Gravite', 'Produit', 'Message', 'Resolue', 'Date']];

    autoTable(doc, {
      startY: 68,
      head,
      body,
      theme: 'grid',
      headStyles: {
        fillColor: BRAND.colors.dark,
        textColor: BRAND.colors.white,
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: dark,
        valign: 'middle',
      },
      alternateRowStyles: { fillColor: [250, 250, 249] },
      columnStyles: {
        0: { cellWidth: 30, halign: 'left' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 45, halign: 'left' },
        3: { cellWidth: 'auto', halign: 'left' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' },
      },
      margin: { left: MARGIN.left, right: MARGIN.right, bottom: MARGIN.bottom + 5 },
      didParseCell: (h) => {
        if (h.section !== 'body') return;
        // Color severity column (index 1)
        if (h.column.index === 1) {
          const v = String(h.cell.raw ?? '');
          if (v === 'CRITICAL') h.cell.styles.textColor = [220, 38, 38];
          if (v === 'WARNING') h.cell.styles.textColor = [245, 158, 11];
          if (v === 'INFO') h.cell.styles.textColor = [5, 150, 105];
        }
      },
      didDrawPage: () => {
        this.drawFooter();
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.drawHeader('ALERTES', `${items.length} alertes`);
        }
      },
    });

    return Buffer.from(doc.output('arraybuffer'));
  }
}

export function generateAlertsPDF(items: AlertExportItem[]): Buffer {
  const template = new AlertsPDFTemplate();
  return template.generatePDF(items);
}

export function generateAlertsXLSX(items: AlertExportItem[]): Buffer {
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleString('fr-FR');

  const criticalCount = items.filter(i => i.severity === 'CRITICAL').length;
  const warningCount = items.filter(i => i.severity === 'WARNING').length;
  const infoCount = items.filter(i => i.severity === 'INFO').length;
  const resolvedCount = items.filter(i => i.is_resolved).length;

  const infoData = [
    { '': BRAND.name, ' ': '', '  ': '' },
    { '': 'Alertes', ' ': '', '  ': '' },
    { '': `Genere le : ${now}`, ' ': '', '  ': '' },
    { '': `Total alertes : ${items.length}`, ' ': '', '  ': '' },
    {},
    { '': BRAND.address, ' ': '', '  ': '' },
    { '': BRAND.phone, ' ': '', '  ': '' },
    { '': BRAND.rccm, ' ': '', '  ': '' },
    { '': BRAND.ifu, ' ': '', '  ': '' },
  ];
  const wsInfo = XLSX.utils.json_to_sheet(infoData);
  wsInfo['!cols'] = [{ wch: 50 }, { wch: 20 }, { wch: 20 }];
  wsInfo['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Infos');

  const summaryData = [
    { 'Indicateur': 'Total alertes', 'Valeur': items.length },
    { 'Indicateur': 'Critiques', 'Valeur': criticalCount },
    { 'Indicateur': 'Avertissements', 'Valeur': warningCount },
    { 'Indicateur': 'Infos', 'Valeur': infoCount },
    { 'Indicateur': 'Resolues', 'Valeur': resolvedCount },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resume');

  const detailData = items.map(a => ({
    'Type': a.type,
    'Gravite': a.severity,
    'Produit': a.product_name,
    'Message': a.message,
    'Resolue': a.is_resolved ? 'Oui' : 'Non',
    'Date creation': fmtDate(a.created_at),
  }));
  const wsDetail = XLSX.utils.json_to_sheet(detailData);
  wsDetail['!cols'] = [
    { wch: 20 }, { wch: 12 }, { wch: 35 }, { wch: 50 },
    { wch: 12 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Alertes');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
