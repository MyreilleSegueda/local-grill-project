/**
 * Template PDF Professionnel pour Local Grill
 * Header avec logo et coordonnées, footer avec infos légales, pagination
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    primary: [124, 58, 237] as [number, number, number],    // Violet
    secondary: [0, 155, 77] as [number, number, number],      // Vert
    dark: [26, 23, 20] as [number, number, number],            // Noir
    gray: [107, 101, 96] as [number, number, number],          // Gris
    lightGray: [232, 228, 221] as [number, number, number],    // Gris clair
    white: [255, 255, 255] as [number, number, number],
    red: [220, 38, 38] as [number, number, number],
    amber: [245, 158, 11] as [number, number, number],
    green: [6, 95, 70] as [number, number, number]
  }
};

// Marges et dimensions - réduites pour maximiser l'espace du tableau
const MARGIN = { top: 45, bottom: 40, left: 8, right: 8 };

/**
 * Charge le logo en base64 depuis le fichier
 */
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

/**
 * Interface pour les données d'inventaire
 */
export interface InventoryExportItem {
  product_id: number;
  product_name: string;
  category_name: string;
  physical_quantity: number;
  theoretical_quantity: number;
  unit_abbreviation?: string | null;
  unit_name?: string | null;
  minimum_stock?: number | null;
  variance?: number;
  variance_percentage?: number;
  last_count_date?: string | null;
  total_value?: number;
}

/**
 * Classe principale pour la génération PDF
 */
export class PDFExportTemplate {
  private doc: jsPDF;
  private currentPage: number = 1;
  private totalPages: number = 1;

  constructor() {
    this.doc = new jsPDF('l', 'mm', 'a4'); // Landscape pour plus de colonnes
  }

  /**
   * Dessine l'en-tête sur la page courante
   */
  private drawHeader(title: string, subtitle?: string): void {
    const doc = this.doc;
    const W = doc.internal.pageSize.getWidth();
    const logoData = loadLogoBase64();

    // Rectangle de fond violet pour le header
    doc.setFillColor(...BRAND.colors.primary);
    doc.rect(0, 0, W, 35, 'F');

    // Logo - soit l'image réelle soit le placeholder
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', 8, 5, 25, 25);
      } catch {
        // Fallback au placeholder si l'image ne charge pas
        this.drawLogoPlaceholder(doc);
      }
    } else {
      this.drawLogoPlaceholder(doc);
    }

    // Nom de l'entreprise (décalé si logo présent)
    const textX = logoData ? 40 : 45;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(BRAND.name, textX, 14);

    // Coordonnées (colonne gauche sous le nom)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(BRAND.address, textX, 20);
    doc.text(BRAND.phone, textX, 24);
    doc.text(BRAND.location, textX, 28);
    doc.text(BRAND.sector, textX, 32);

    // Titre du document (colonne droite)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, W - 8, 16, { align: 'right' });

    if (subtitle) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, W - 8, 23, { align: 'right' });
    }

    // Date de génération
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    doc.setFontSize(9);
    doc.text(`Généré le ${dateStr}`, W - 8, 30, { align: 'right' });

    // Ligne de séparation
    doc.setDrawColor(...BRAND.colors.secondary);
    doc.setLineWidth(1);
    doc.line(8, 37, W - 8, 37);
  }

  /**
   * Dessine le logo placeholder (cercle avec LG)
   */
  private drawLogoPlaceholder(doc: jsPDF): void {
    doc.setFillColor(255, 255, 255);
    doc.circle(25, 17, 8, 'F');
    doc.setTextColor(...BRAND.colors.primary);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LG', 25, 20, { align: 'center' });
  }

  /**
   * Dessine le pied de page sur la page courante
   */
  private drawFooter(): void {
    const doc = this.doc;
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Ligne de séparation
    doc.setDrawColor(...BRAND.colors.lightGray);
    doc.setLineWidth(0.3);
    doc.line(8, H - 25, W - 8, H - 25);

    // Section infos légales (3 colonnes)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.colors.gray);

    // Colonne 1: RCCM et IFU
    doc.text(BRAND.rccm, 8, H - 20);
    doc.text(BRAND.ifu, 8, H - 16);

    // Colonne 2: Régime fiscal
    doc.text(BRAND.taxRegime, W / 2, H - 20, { align: 'center' });

    // Colonne 3: Comptes bancaires
    doc.text('Comptes bancaires :', W - 8, H - 20, { align: 'right' });
    doc.text(BRAND.bankAccounts[0], W - 8, H - 16, { align: 'right' });
    doc.text(BRAND.bankAccounts[1], W - 8, H - 12, { align: 'right' });

    // Pagination (centrée en bas)
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.colors.dark);
    doc.text(`Page ${this.currentPage} / ${this.totalPages}`, W / 2, H - 8, { align: 'center' });

    // Mention confidentielle
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.colors.gray);
    doc.text('Document confidentiel - Usage interne uniquement', W / 2, H - 4, { align: 'center' });
  }

  /**
   * Calcule le nombre total de pages nécessaires
   */
  private calculateTotalPages(items: InventoryExportItem[]): number {
    // Environ 15 lignes par page avec le header/footer
    const rowsPerPage = 15;
    return Math.ceil(items.length / rowsPerPage);
  }

  /**
   * Génère le PDF d'inventaire complet
   */
  public generateInventoryPDF(items: InventoryExportItem[]): Buffer {
    const doc = this.doc;
    const monthYear = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    this.totalPages = this.calculateTotalPages(items);

    // Préparer les données pour le tableau
    const tableData = items.map((item, idx) => {
      const variance = item.variance ?? 0;
      const variancePct = item.variance_percentage ?? 0;
      const physicalQty = item.physical_quantity ?? 0;
      const minStock = item.minimum_stock;

      // Déterminer le statut
      let status = 'OK';
      let statusColor = BRAND.colors.green;
      if (physicalQty <= 0) {
        status = 'ÉPUISÉ';
        statusColor = BRAND.colors.red;
      } else if (minStock && physicalQty <= minStock) {
        status = 'STOCK BAS';
        statusColor = BRAND.colors.amber;
      }

      return {
        row: [
          (idx + 1).toString(),
          item.product_name,
          item.category_name,
          physicalQty.toString(),
          (item.theoretical_quantity ?? 0).toString(),
          item.unit_abbreviation || item.unit_name || '-',
          variance > 0 ? `+${variance}` : variance.toString(),
          `${variancePct.toFixed(1)}%`,
          status,
          item.total_value && item.total_value > 0
            ? item.total_value.toLocaleString('fr-FR') + ' FCFA'
            : '—'
        ],
        statusColor
      };
    });

    // Ajouter le tableau avec autoTable
    // margin.top réserve l'espace pour le header sur toutes les pages
    autoTable(doc, {
      startY: 42,
      head: [['N°', 'PRODUIT', 'CATÉGORIE', 'QTÉ PHYS.', 'QTÉ THÉOR.', 'UNITÉ', 'ÉCART', 'ÉCART %', 'STATUT', 'VALEUR']],
      body: tableData.map(d => d.row),
      theme: 'grid',
      headStyles: {
        fillColor: BRAND.colors.primary,
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: BRAND.colors.dark,
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },   // N°
        1: { cellWidth: 'auto', halign: 'left' },   // Produit - auto pour prendre l'espace dispo
        2: { cellWidth: 35, halign: 'left' },   // Catégorie
        3: { cellWidth: 20, halign: 'center' }, // Qté Phys
        4: { cellWidth: 20, halign: 'center' }, // Qté Théor
        5: { cellWidth: 15, halign: 'center' }, // Unité
        6: { cellWidth: 18, halign: 'right' },  // Écart
        7: { cellWidth: 15, halign: 'center' }, // Écart %
        8: { cellWidth: 20, halign: 'center' }, // Statut
        9: { cellWidth: 30, halign: 'right' }   // Valeur
      },
      alternateRowStyles: {
        fillColor: [250, 248, 245]
      },
      margin: { top: 42, left: 8, right: 8, bottom: 35 },
      tableWidth: 'auto',
      didParseCell: (data) => {
        // Colorer le statut
        if (data.section === 'body' && data.column.index === 8) {
          const status = data.cell.text[0];
          if (status === 'ÉPUISÉ') {
            data.cell.styles.textColor = BRAND.colors.red;
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'STOCK BAS') {
            data.cell.styles.textColor = BRAND.colors.amber;
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = BRAND.colors.green;
          }
        }
      },
      styles: {
        fontSize: 9,  // Augmenter légèrement la taille de police
        cellPadding: 4,  // Plus d'espace dans les cellules
        overflow: 'linebreak'
      },
      didDrawPage: (data) => {
        // Dessiner le header dans l'espace réservé par margin.top
        this.drawHeader('RAPPORT D\'INVENTAIRE', monthYear.toUpperCase());
        // Dessiner le footer
        this.drawFooter();
        this.currentPage++;
      }
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  /**
   * Génère un PDF simple avec titre et tableau personnalisé
   */
  public generateSimplePDF(
    title: string,
    subtitle: string,
    headers: string[],
    data: string[][]
  ): Buffer {
    const doc = this.doc;

    this.totalPages = Math.ceil(data.length / 20);
    if (this.totalPages < 1) this.totalPages = 1;

    this.drawHeader(title, subtitle);

    autoTable(doc, {
      startY: 42,
      head: [headers],
      body: data,
      theme: 'grid',
      headStyles: {
        fillColor: BRAND.colors.primary,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: BRAND.colors.dark
      },
      margin: { left: 8, right: 8, bottom: 35 },
      tableWidth: 'auto',
      didDrawPage: () => {
        this.drawHeader(title, subtitle);
        this.drawFooter();
        this.currentPage++;
      }
    });

    if (this.totalPages === 1) {
      this.drawFooter();
    }

    return Buffer.from(doc.output('arraybuffer'));
  }
}

/**
 * Fonction utilitaire pour générer le PDF d'inventaire
 */
export function generateInventoryPDF(items: InventoryExportItem[]): Buffer {
  const template = new PDFExportTemplate();
  return template.generateInventoryPDF(items);
}
