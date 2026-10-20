/**
 * Template PDF/XLSX Professionnel pour l'export des produits
 * Header avec logo et coordonnées, footer avec infos légales
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Configuration de la marque (même que inventory)
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
    primary: [107, 33, 168] as [number, number, number],      // Violet Local Grill
    secondary: [91, 33, 182] as [number, number, number],    // Violet foncé
    dark: [26, 23, 20] as [number, number, number],
    gray: [107, 101, 96] as [number, number, number],
    lightGray: [232, 228, 221] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    green: [16, 185, 129] as [number, number, number],      // Emerald pour produits
  }
};

// Marges
const MARGIN = { top: 42, left: 8, right: 8, bottom: 35 };

export interface ProductExportItem {
  id: number;
  name: string;
  category_name: string;
  minimum_stock: number;
  is_perishable: boolean;
  unit_name?: string;
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

class ProductsPDFTemplate {
  private doc: jsPDF;
  private currentPage: number = 1;
  private totalPages: number = 1;

  constructor() {
    this.doc = new jsPDF('l', 'mm', 'a4');
  }

  private drawHeader(): void {
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
    doc.text('LISTE DES PRODUITS', W - 8, 16, { align: 'right' });

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

  public generatePDF(items: ProductExportItem[]): Buffer {
    const doc = this.doc;
    this.totalPages = Math.ceil(items.length / 20);

    const tableData = items.map((p, idx) => [
      (idx + 1).toString(),
      p.name,
      p.category_name || '—',
      p.minimum_stock.toString(),
      p.is_perishable ? 'Oui' : 'Non',
      p.unit_name || '—'
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['N°', 'PRODUIT', 'CATÉGORIE', 'STOCK MIN.', 'PÉRISSABLE', 'UNITÉ']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: BRAND.colors.primary,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: BRAND.colors.dark
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 40, halign: 'left' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' }
      },
      margin: MARGIN,
      tableWidth: 'auto',
      styles: { fontSize: 9, cellPadding: 4 },
      didDrawPage: () => {
        this.drawHeader();
        this.drawFooter();
        this.currentPage++;
      }
    });

    return Buffer.from(doc.output('arraybuffer'));
  }
}

export function generateProductsPDF(items: ProductExportItem[]): Buffer {
  const template = new ProductsPDFTemplate();
  return template.generatePDF(items);
}

export function generateProductsXLSX(items: ProductExportItem[]): Buffer {
  const wb = XLSX.utils.book_new();
  const now = new Date();
  const nowStr = now.toLocaleDateString('fr-FR');

  // Feuille principale
  const wsData: (string | number)[][] = [
    [BRAND.name, '', '', '', '', ''],
    ['Liste des produits', '', '', '', '', ''],
    [`Généré le ${nowStr}`, '', '', '', '', ''],
    [],
    ['N°', 'PRODUIT', 'CATÉGORIE', 'STOCK MIN.', 'PÉRISSABLE', 'UNITÉ'],
    ...items.map((p, i) => [
      i + 1,
      p.name,
      p.category_name || '—',
      p.minimum_stock,
      p.is_perishable ? 'Oui' : 'Non',
      p.unit_name || '—'
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }
  ];

  // Styles pour le header
  const headerStyle = {
    font: { bold: true, sz: 14 },
    fill: { fgColor: { rgb: '6B21A8' } },
    alignment: { horizontal: 'center' }
  };

  XLSX.utils.book_append_sheet(wb, ws, 'Produits');

  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(xlsxBuffer);
}
