/**
 * API Route pour l'export professionnel de l'inventaire
 * GET /api/exports/inventory?format=pdf|xlsx
 * 
 * Génère des exports PDF et Excel professionnels avec :
 * - Header: Logo, LOCAL GRILL SARL, coordonnées complètes
 * - Footer: RCCM, IFU, régime fiscal, comptes bancaires
 * - Pagination pour PDF
 * - Feuilles Excel stylisées
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/request";
import { generateInventoryPDF, InventoryExportItem } from "@/lib/templates/pdfExportTemplate";
import { generateInventoryXLSX } from "@/lib/templates/xlsxExportTemplate";

// The PDF template reads the logo from disk and both generators use Node buffers.
export const runtime = "nodejs";

/**
 * Récupère l'inventaire complet avec les données calculées
 */
async function getInventoryData(): Promise<InventoryExportItem[]> {
  const products = await prisma.products.findMany({
    where: { is_active: true },
    include: {
      category: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true, abbreviation: true } },
    },
    orderBy: { name: "asc" },
  });

  const productIds = products.map((product) => product.id);
  const snapshots = productIds.length
    ? await prisma.inventory_snapshots.findMany({ where: { product_id: { in: productIds } } })
    : [];
  const snapshotByProductId = new Map(snapshots.map((snapshot) => [snapshot.product_id, snapshot]));

  const lastCounts = await prisma.inventory_counts.findMany({
    orderBy: { created_at: "desc" },
    select: { product_id: true, created_at: true },
  });

  const lastCountMap: Record<number, Date> = {};
  lastCounts.forEach((c) => {
    if (!lastCountMap[c.product_id]) {
      lastCountMap[c.product_id] = c.created_at;
    }
  });

  const items: InventoryExportItem[] = products.map((product) => {
    const snap = snapshotByProductId.get(product.id);
    const theoreticalQty = snap ? Number(snap.theoretical_quantity) : 0;
    const physicalQty = snap ? Number(snap.real_quantity) : theoreticalQty;
    const variance = physicalQty - theoreticalQty;
    const variancePct = theoreticalQty !== 0
      ? (variance / theoreticalQty) * 100
      : 0;

    return {
      product_id: product.id,
      product_name: product.name,
      category_name: product.category?.name || "Non catégorisé",
      physical_quantity: physicalQty,
      theoretical_quantity: theoreticalQty,
      unit_abbreviation: product.unit?.abbreviation,
      unit_name: product.unit?.name,
      minimum_stock: product.minimum_stock ? Number(product.minimum_stock) : null,
      variance: Number(variance.toFixed(2)),
      variance_percentage: Number(variancePct.toFixed(2)),
      last_count_date: lastCountMap[product.id]?.toISOString() ?? null,
      total_value: snap ? Number(snap.total_value) : 0,
    };
  });

  return items;
}

/**
 * GET - Génère et retourne l'export PDF ou Excel
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  let stage = "authentication";
  try {
    // Vérifier l'authentification
    const user = await getAuthUser(req);
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier la permission INVENTORY_VIEW
    stage = "permission lookup";
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: { include: { rolepermission: { include: { permission: true } } } } }
    });

    const userPermissions = await prisma.userpermission.findMany({
      where: { userId: user.id },
      include: { permission: true }
    });

    const isAdmin = userRoles.some(
      (ur) => ur.role.name.trim().toUpperCase() === "ADMIN",
    );
    const hasInventoryView =
      isAdmin ||
      userPermissions.some((up) => up.permission.name.toUpperCase() === "INVENTORY_VIEW") ||
      userRoles.some((ur) =>
        ur.role.rolepermission.some((rp) => rp.permission.name.toUpperCase() === "INVENTORY_VIEW"),
      );

    if (!hasInventoryView) {
      return NextResponse.json(
        { success: false, error: "Permission INVENTORY_VIEW requise" },
        { status: 403 }
      );
    }

    // Récupérer le format demandé
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "pdf";

    if (format !== "pdf" && format !== "xlsx") {
      return NextResponse.json(
        { success: false, error: "Format invalide. Utilisez 'pdf' ou 'xlsx'" },
        { status: 400 }
      );
    }

    // Récupérer les données
    stage = "inventory data lookup";
    const items = await getInventoryData();

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucune donnée d'inventaire disponible" },
        { status: 404 }
      );
    }

    // Générer le fichier
    const now = new Date();
    const monthYear = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).replace(/\s/g, "_");
    
    if (format === "pdf") {
      stage = "PDF generation";
      const pdfBuffer = generateInventoryPDF(items);
      
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Inventaire_${monthYear}.pdf"`,
          "Cache-Control": "no-cache"
        }
      });
    } else {
      stage = "XLSX generation";
      const xlsxBuffer = generateInventoryXLSX(items);
      
      return new NextResponse(new Uint8Array(xlsxBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Inventaire_${monthYear}.xlsx"`,
          "Cache-Control": "no-cache"
        }
      });
    }

  } catch (error) {
    console.error(`[GET /api/exports/inventory] Failure during ${stage}:`, error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur lors de la génération de l'export" },
      { status: 500 }
    );
  }
}
