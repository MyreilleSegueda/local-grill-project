/**
 * API Route pour l'export professionnel des produits
 * GET /api/exports/products?format=pdf|xlsx
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/request";
import { generateProductsPDF, generateProductsXLSX, ProductExportItem } from "@/lib/templates/productsExportTemplate";

/**
 * GET - Génère et retourne l'export PDF ou Excel des produits
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Vérifier l'authentification
    const user = await getAuthUser(req);
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier la permission PRODUCTS_VIEW
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: { include: { rolepermission: { include: { permission: true } } } } }
    });

    const userPermissions = await prisma.userpermission.findMany({
      where: { userId: user.id },
      include: { permission: true }
    });

    const hasProductsView = 
      userPermissions.some(up => up.permission.name === 'PRODUCTS_VIEW') ||
      userRoles.some(ur => 
        ur.role.rolepermission.some(rp => rp.permission.name === 'PRODUCTS_VIEW')
      );

    if (!hasProductsView) {
      return NextResponse.json(
        { success: false, error: "Permission PRODUCTS_VIEW requise" },
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

    // Récupérer les produits avec leurs relations
    const products = await prisma.products.findMany({
      where: { is_active: true },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucun produit trouvé" },
        { status: 404 }
      );
    }

    // Convertir en ProductExportItem
    const exportItems: ProductExportItem[] = products.map(p => ({
      id: p.id,
      name: p.name,
      category_name: p.category?.name || "Non catégorisé",
      minimum_stock: p.minimum_stock ? Number(p.minimum_stock) : 0,
      is_perishable: p.is_perishable || false,
      unit_name: p.unit?.name
    }));

    // Générer le fichier
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR").replace(/\//g, "-");
    
    if (format === "pdf") {
      const pdfBuffer = generateProductsPDF(exportItems);
      
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="LocalGrill_Produits_${dateStr}.pdf"`,
          "Cache-Control": "no-cache"
        }
      });
    } else {
      const xlsxBuffer = generateProductsXLSX(exportItems);
      
      return new NextResponse(new Uint8Array(xlsxBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="LocalGrill_Produits_${dateStr}.xlsx"`,
          "Cache-Control": "no-cache"
        }
      });
    }

  } catch (error) {
    console.error("[GET /api/exports/products] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur lors de la génération de l'export" },
      { status: 500 }
    );
  }
}
