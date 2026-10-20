/**
 * Template PDF/XLSX Professionnel pour les sorties de stock
 * Header avec logo et coordonnees, footer avec infos legales
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

// Interfaces
export interface ExitExportItem {
  id: number;
  product_name: string;
  category_name?: string;
  unit_name?: string;
  quantity: number;
  type: string;
  reason?: string | null;
  reference_number?: string | null;
  batch_number?: string | null;
  user_name?: string;
  created_at: string;
  purchase_price?: number;
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

function fmtDate(d: string | null | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// PDF Template Class
class ExitsPDFTemplate {
  private doc: jsPDF;
  private currentPage: number = 1;
  private totalPages: number = 1;

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
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
    doc.text(`Genere le ${dateStr}`, W - 8, 30, { align: 'right' });

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

  public generatePDF(items: ExitExportItem[]): Buffer {
    const doc = this.doc;
    const W = doc.internal.pageSize.getWidth();
    
    this.totalPages = Math.max(1, Math.ceil(items.length / 40));

    this.drawHeader('SORTIES DE STOCK', `${items.length} sorties`);

    const dark = BRAND.colors.dark;
    const light = [241, 240, 236] as [number, number, number];
    const white = BRAND.colors.white;
    const accent = BRAND.colors.indigo;

    // Summary cards
    const totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const kpis = [
      { label: 'Total sorties', value: String(items.length), col: light, text: dark, stripe: accent },
      { label: 'Qte totale', value: fmt(totalQty), col: [238, 242, 255] as [number, number, number], text: [55, 48, 163] as [number, number, number], stripe: accent },
    ];

    let cardX = 14;
    const cardY = 45;
    const cardW = (W - 28 - (kpis.length - 1) * 4) / kpis.length;
    const cardH = 18;

    kpis.forEach((k) => {
      doc.setFillColor(...k.col);
      doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, 'F');
      doc.setFillColor(...k.stripe as [number, number, number]);
      doc.roundedRect(cardX, cardY, cardW, 1.5, 0.5, 0.5, 'F');
      doc.setTextColor(...k.text);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(k.label, cardX + 3, cardY + 6);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(k.value, cardX + 3, cardY + 14);
      cardX += cardW + 4;
    });

    // Main table
    autoTable(doc, {
      startY: cardY + cardH + 8,
      head: [['Date', 'Produit', 'Categorie', 'Type', 'Qte', 'Unite', 'Lot', 'Motif', 'Utilisateur']],
      body: items.map(i => [
        fmtDate(i.created_at),
        i.product_name,
        i.category_name || '-',
        i.type,
        fmt(i.quantity),
        i.unit_name || '-',
        i.batch_number || '-',
        i.reason || '-',
        i.user_name || '-'
      ]),
      styles: { fontSize: 8, cellPadding: 2.5, textColor: dark, overflow: 'linebreak' },
      headStyles: {
        fillColor: BRAND.colors.primary,
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      alternateRowStyles: { fillColor: light },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 22 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 15, halign: 'right' },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 20 },
        7: { cellWidth: 'auto' },
        8: { cellWidth: 25 },
      },
      margin: { left: 8, right: 8, top: MARGIN.top, bottom: MARGIN.bottom },
      didParseCell: (h) => {
        if (h.section !== 'body' || h.column.index !== 3) return;
        const v = String(h.cell.raw ?? '');
        if (v === 'ENTREE') h.cell.styles.textColor = [5, 150, 105] as [number, number, number];
        if (v === 'SORTIE') h.cell.styles.textColor = [220, 38, 38] as [number, number, number];
      },
      didDrawPage: () => {
        this.drawFooter();
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.drawHeader('SORTIES DE STOCK', `${items.length} sorties`);
        }
      },
    });

    return Buffer.from(doc.output('arraybuffer'));
  }
}

export function generateExitsPDF(items: ExitExportItem[]): Buffer {
  const template = new ExitsPDFTemplate();
  return template.generatePDF(items);
}

export function generateExitsXLSX(items: ExitExportItem[]): Buffer {
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleDateString('fr-FR');

  // Info sheet
  const infoData = [
    { '': BRAND.name, ' ': '', '  ': '' },
    { '': 'Sorties de stock', ' ': '', '  ': '' },
    { '': `Genere le : ${now}`, ' ': '', '  ': '' },
    { '': `Total sorties : ${items.length}`, ' ': '', '  ': '' },
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

  // Summary sheet
  const totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  const summaryData = [
    { 'Indicateur': 'Total sorties', 'Valeur': items.length },
    { 'Indicateur': 'Quantite totale', 'Valeur': totalQty },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 35 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resume');

  // Data sheet
  const dataRows = items.map(i => ({
    'Date': i.created_at ? new Date(i.created_at).toLocaleDateString('fr-FR') : '-',
    'Produit': i.product_name,
    'Categorie': i.category_name || '-',
    'Type': i.type,
    'Quantite': i.quantity,
    'Unite': i.unit_name || '-',
    'Numero lot': i.batch_number || '-',
    'Motif': i.reason || '-',
    'Reference': i.reference_number || '-',
    'Utilisateur': i.user_name || '-',
    'Prix achat (FCFA)': i.purchase_price || 0,
  }));

  const wsData = XLSX.utils.json_to_sheet(dataRows);
  wsData['!cols'] = [
    { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 },
    { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 30 },
    { wch: 20 }, { wch: 25 }, { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsData, 'Mouvements');

  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(xlsxBuffer);
}
