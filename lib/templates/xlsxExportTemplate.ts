/**
 * Template Excel Professionnel pour Local Grill
 * Header avec logo et coordonnées, footer avec infos légales
 */

import * as XLSX from 'xlsx';

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
  ]
};

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
 * Styles pour les cellules Excel
 */
const STYLES = {
  headerBrand: {
    font: { bold: true, size: 16, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "7C3AED" }, patternType: "solid" as const },
    alignment: { horizontal: "left" as const, vertical: "center" as const }
  },
  headerInfo: {
    font: { size: 9, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "7C3AED" }, patternType: "solid" as const },
    alignment: { horizontal: "left" as const, vertical: "center" as const }
  },
  title: {
    font: { bold: true, size: 14, color: { rgb: "7C3AED" } },
    alignment: { horizontal: "center" as const, vertical: "center" as const }
  },
  subtitle: {
    font: { size: 11, color: { rgb: "666666" } },
    alignment: { horizontal: "center" as const, vertical: "center" as const }
  },
  tableHeader: {
    font: { bold: true, size: 10, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "7C3AED" }, patternType: "solid" as const },
    alignment: { horizontal: "center" as const, vertical: "center" as const },
    border: {
      top: { style: "thin", color: { rgb: "5B21B6" } },
      bottom: { style: "thin", color: { rgb: "5B21B6" } },
      left: { style: "thin", color: { rgb: "5B21B6" } },
      right: { style: "thin", color: { rgb: "5B21B6" } }
    }
  },
  tableCell: {
    font: { size: 10 },
    alignment: { horizontal: "left" as const, vertical: "center" as const },
    border: {
      top: { style: "thin", color: { rgb: "E8E4DD" } },
      bottom: { style: "thin", color: { rgb: "E8E4DD" } },
      left: { style: "thin", color: { rgb: "E8E4DD" } },
      right: { style: "thin", color: { rgb: "E8E4DD" } }
    }
  },
  tableCellCenter: {
    font: { size: 10 },
    alignment: { horizontal: "center" as const, vertical: "center" as const },
    border: {
      top: { style: "thin", color: { rgb: "E8E4DD" } },
      bottom: { style: "thin", color: { rgb: "E8E4DD" } },
      left: { style: "thin", color: { rgb: "E8E4DD" } },
      right: { style: "thin", color: { rgb: "E8E4DD" } }
    }
  },
  tableCellRight: {
    font: { size: 10 },
    alignment: { horizontal: "right" as const, vertical: "center" as const },
    border: {
      top: { style: "thin", color: { rgb: "E8E4DD" } },
      bottom: { style: "thin", color: { rgb: "E8E4DD" } },
      left: { style: "thin", color: { rgb: "E8E4DD" } },
      right: { style: "thin", color: { rgb: "E8E4DD" } }
    }
  },
  statusOk: {
    font: { bold: true, size: 10, color: { rgb: "065946" } },
    fill: { fgColor: { rgb: "ECFDF5" }, patternType: "solid" as const },
    alignment: { horizontal: "center" as const, vertical: "center" as const }
  },
  statusWarning: {
    font: { bold: true, size: 10, color: { rgb: "92400E" } },
    fill: { fgColor: { rgb: "FEF3C7" }, patternType: "solid" as const },
    alignment: { horizontal: "center" as const, vertical: "center" as const }
  },
  statusDanger: {
    font: { bold: true, size: 10, color: { rgb: "991B1B" } },
    fill: { fgColor: { rgb: "FEE2E2" }, patternType: "solid" as const },
    alignment: { horizontal: "center" as const, vertical: "center" as const }
  },
  footer: {
    font: { size: 8, color: { rgb: "666666" } },
    alignment: { horizontal: "left" as const, vertical: "center" as const }
  },
  footerRight: {
    font: { size: 8, color: { rgb: "666666" } },
    alignment: { horizontal: "right" as const, vertical: "center" as const }
  },
  alternateRow: {
    fill: { fgColor: { rgb: "FAF8F5" }, patternType: "solid" as const }
  }
};

/**
 * Classe principale pour la génération Excel
 */
export class XLSXExportTemplate {
  private workbook: XLSX.WorkBook;

  constructor() {
    this.workbook = XLSX.utils.book_new();
  }

  /**
   * Crée l'en-tête de page dans les données
   */
  private createHeaderRows(title: string, subtitle?: string): any[][] {
    const rows: any[][] = [];

    // Ligne 1-2: En-tête brand (violet)
    rows.push([BRAND.name, '', '', '', '', '', '', '', '', '']);
    rows.push([title, '', '', '', '', '', '', '', '', '']);

    // Lignes 3-6: Coordonnées
    rows.push([BRAND.address, '', '', '', '', '', '', '', '', '']);
    rows.push([BRAND.phone, '', '', '', '', '', '', '', '', '']);
    rows.push([BRAND.location, '', '', '', '', '', '', '', '', '']);
    rows.push([BRAND.sector, '', '', '', '', '', '', '', '', '']);

    // Ligne vide
    rows.push(['', '', '', '', '', '', '', '', '', '']);

    // Date
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    rows.push([`Généré le ${dateStr}`, '', '', '', '', '', '', '', '', '']);

    // Ligne vide avant le tableau
    rows.push(['', '', '', '', '', '', '', '', '', '']);

    return rows;
  }

  /**
   * Applique les styles à l'en-tête
   */
  private applyHeaderStyles(ws: XLSX.WorkSheet, headerRowCount: number): void {
    if (!ws['!cols']) ws['!cols'] = [];

    // Largeurs des colonnes
    const colWidths = [
      { wch: 5 },   // A - N°
      { wch: 35 },  // B - Produit
      { wch: 22 },  // C - Catégorie
      { wch: 14 },  // D - Qté Phys
      { wch: 14 },  // E - Qté Théor
      { wch: 10 },  // F - Unité
      { wch: 12 },  // G - Écart
      { wch: 10 },  // H - Écart %
      { wch: 14 },  // I - Statut
      { wch: 20 }   // J - Valeur
    ];
    ws['!cols'] = colWidths;

    // Merges pour l'en-tête
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },  // Nom entreprise
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },  // Titre
      { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },  // Adresse
      { s: { r: 3, c: 0 }, e: { r: 3, c: 9 } },  // Tél
      { s: { r: 4, c: 0 }, e: { r: 4, c: 9 } },  // Location
      { s: { r: 5, c: 0 }, e: { r: 5, c: 9 } },  // Secteur
      { s: { r: 7, c: 0 }, e: { r: 7, c: 9 } },  // Date
    ];

    // Appliquer les styles aux cellules d'en-tête
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:J10');

    for (let R = 0; R <= 1; R++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: 0 });
      if (!ws[cellRef]) ws[cellRef] = {};
      ws[cellRef].s = R === 0 ? STYLES.headerBrand : STYLES.title;
    }

    // Styles pour les coordonnées (lignes 3-6)
    for (let R = 2; R <= 5; R++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: 0 });
      if (!ws[cellRef]) ws[cellRef] = {};
      ws[cellRef].s = STYLES.headerInfo;
    }
  }

  /**
   * Ajoute le pied de page aux dernières lignes
   */
  private addFooterRows(wsData: any[][]): any[][] {
    const footerRows: any[][] = [];

    // Ligne vide
    footerRows.push(['', '', '', '', '', '', '', '', '', '']);

    // Footer: 3 colonnes
    footerRows.push([
      BRAND.rccm,
      '',
      '',
      BRAND.taxRegime,
      '',
      '',
      '',
      '',
      'Comptes bancaires :',
      ''
    ]);
    footerRows.push([
      BRAND.ifu,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      BRAND.bankAccounts[0],
      ''
    ]);
    footerRows.push([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      BRAND.bankAccounts[1],
      ''
    ]);

    // Mention confidentielle
    footerRows.push(['', '', '', '', '', '', '', '', '', '']);
    footerRows.push([
      'Document confidentiel - Usage interne uniquement',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ]);

    return [...wsData, ...footerRows];
  }

  /**
   * Génère la feuille Excel d'inventaire détaillé
   */
  public generateInventoryXLSX(items: InventoryExportItem[]): Buffer {
    const monthYear = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const title = `RAPPORT D'INVENTAIRE - ${monthYear.toUpperCase()}`;

    // Créer les données
    let wsData = this.createHeaderRows(title);

    // En-têtes du tableau
    const tableHeaders = ['N°', 'PRODUIT', 'CATÉGORIE', 'QTÉ PHYS.', 'QTÉ THÉOR.', 'UNITÉ', 'ÉCART', 'ÉCART %', 'STATUT', 'VALEUR'];
    wsData.push(tableHeaders);

    // Données
    items.forEach((item, idx) => {
      const variance = item.variance ?? 0;
      const variancePct = item.variance_percentage ?? 0;
      const physicalQty = item.physical_quantity ?? 0;
      const minStock = item.minimum_stock;

      let status = 'OK';
      if (physicalQty <= 0) {
        status = 'ÉPUISÉ';
      } else if (minStock && physicalQty <= minStock) {
        status = 'STOCK BAS';
      }

      wsData.push([
        idx + 1,
        item.product_name,
        item.category_name,
        physicalQty,
        item.theoretical_quantity ?? 0,
        item.unit_abbreviation || item.unit_name || '-',
        variance,
        `${variancePct.toFixed(1)}%`,
        status,
        item.total_value && item.total_value > 0 ? item.total_value : 0
      ]);
    });

    // Ajouter le footer
    wsData = this.addFooterRows(wsData);

    // Créer la feuille
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Appliquer les styles
    this.applyHeaderStyles(ws, 9);

    // Styles pour les cellules de données
    const headerRowIndex = 9;
    const dataStartRow = headerRowIndex + 1;
    const dataEndRow = dataStartRow + items.length - 1;

    // En-têtes du tableau
    for (let C = 0; C < 10; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
      if (!ws[cellRef]) ws[cellRef] = {};
      ws[cellRef].s = STYLES.tableHeader;
    }

    // Données
    for (let R = dataStartRow; R <= dataEndRow; R++) {
      const isAlternate = (R - dataStartRow) % 2 === 1;

      for (let C = 0; C < 10; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) ws[cellRef] = {};

        // Style de base selon la colonne
        if (C === 0 || C === 3 || C === 4 || C === 5 || C === 8) {
          ws[cellRef].s = { ...STYLES.tableCellCenter };
        } else if (C === 6 || C === 9) {
          ws[cellRef].s = { ...STYLES.tableCellRight };
        } else {
          ws[cellRef].s = { ...STYLES.tableCell };
        }

        // Ligne alternée
        if (isAlternate) {
          ws[cellRef].s = { ...ws[cellRef].s, ...STYLES.alternateRow };
        }

        // Style spécial pour le statut (colonne 8)
        if (C === 8) {
          const status = ws[cellRef].v;
          if (status === 'ÉPUISÉ') {
            ws[cellRef].s = STYLES.statusDanger;
          } else if (status === 'STOCK BAS') {
            ws[cellRef].s = STYLES.statusWarning;
          } else {
            ws[cellRef].s = STYLES.statusOk;
          }
        }

        // Format nombre pour la valeur
        if (C === 9 && ws[cellRef].v > 0) {
          ws[cellRef].z = '#,##0.00 "FCFA"';
        }
      }
    }

    // Styles pour le footer
    const footerStartRow = dataEndRow + 2;
    for (let R = footerStartRow; R < wsData.length; R++) {
      for (let C = 0; C < 10; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) ws[cellRef] = {};

        if (C === 0) {
          ws[cellRef].s = STYLES.footer;
        } else if (C >= 8) {
          ws[cellRef].s = STYLES.footerRight;
        }
      }
    }

    // Merges pour le footer
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push(
      { s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 9 } }
    );

    // Ajouter la feuille au workbook
    XLSX.utils.book_append_sheet(this.workbook, ws, 'Inventaire détaillé');

    // Générer le fichier
    return Buffer.from(XLSX.write(this.workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  /**
   * Génère un fichier Excel avec feuille de synthèse par catégorie
   */
  public generateInventoryWithSummary(items: InventoryExportItem[]): Buffer {
    // D'abord générer la feuille détaillée
    this.generateInventoryXLSX(items);

    // Créer la feuille de synthèse
    const monthYear = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const title = `RÉSUMÉ PAR CATÉGORIE - ${monthYear.toUpperCase()}`;

    let wsData = this.createHeaderRows(title);

    // Agréger par catégorie
    const byCategory: Record<string, {
      produits: number;
      qtyPhysique: number;
      qtyTheorique: number;
      variance: number;
      epuises: number;
      stockBas: number;
      valeur: number;
    }> = {};

    items.forEach((item) => {
      const cat = item.category_name;
      if (!byCategory[cat]) {
        byCategory[cat] = {
          produits: 0,
          qtyPhysique: 0,
          qtyTheorique: 0,
          variance: 0,
          epuises: 0,
          stockBas: 0,
          valeur: 0
        };
      }
      byCategory[cat].produits++;
      byCategory[cat].qtyPhysique += item.physical_quantity ?? 0;
      byCategory[cat].qtyTheorique += item.theoretical_quantity ?? 0;
      byCategory[cat].variance += item.variance ?? 0;
      byCategory[cat].valeur += item.total_value ?? 0;

      if ((item.physical_quantity ?? 0) <= 0) {
        byCategory[cat].epuises++;
      } else if (
        item.minimum_stock &&
        item.physical_quantity > 0 &&
        item.physical_quantity <= item.minimum_stock
      ) {
        byCategory[cat].stockBas++;
      }
    });

    // En-têtes
    wsData.push(['CATÉGORIE', 'PRODUITS', 'QTÉ PHYS.', 'QTÉ THÉOR.', 'ÉCART', 'ÉPUISÉS', 'STOCK BAS', 'VALEUR TOTALE']);

    // Données
    Object.entries(byCategory).forEach(([cat, d]) => {
      wsData.push([
        cat,
        d.produits,
        d.qtyPhysique,
        d.qtyTheorique,
        d.variance,
        d.epuises,
        d.stockBas,
        d.valeur
      ]);
    });

    // Footer
    wsData = this.addFooterRows(wsData);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Appliquer largeurs de colonnes
    ws['!cols'] = [
      { wch: 25 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 18 }
    ];

    // Merges en-tête
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 7 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: 7 } },
    ];

    // Styles
    for (let R = 0; R <= 1; R++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: 0 });
      if (!ws[cellRef]) ws[cellRef] = {};
      ws[cellRef].s = R === 0 ? STYLES.headerBrand : STYLES.title;
    }

    for (let R = 2; R <= 5; R++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: 0 });
      if (!ws[cellRef]) ws[cellRef] = {};
      ws[cellRef].s = STYLES.headerInfo;
    }

    const headerRowIndex = 9;
    for (let C = 0; C < 8; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
      if (!ws[cellRef]) ws[cellRef] = {};
      ws[cellRef].s = STYLES.tableHeader;
    }

    XLSX.utils.book_append_sheet(this.workbook, ws, 'Par catégorie');

    return Buffer.from(XLSX.write(this.workbook, { type: 'buffer', bookType: 'xlsx' }));
  }
}

/**
 * Fonction utilitaire pour générer l'Excel d'inventaire
 */
export function generateInventoryXLSX(items: InventoryExportItem[]): Buffer {
  const template = new XLSXExportTemplate();
  return template.generateInventoryWithSummary(items);
}
