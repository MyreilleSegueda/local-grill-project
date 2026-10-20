/**
 * API Route pour l'export professionnel des rapports complets
 * POST /api/exports/reports?format=pdf|xlsx
 * 
 * Accepte les données de rapport dans le body et génère un export professionnel
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/request";
import { generateReportsPDF, generateReportsXLSX, ReportExportData } from "@/lib/templates/reportsExportTemplate";

/**
 * POST - Génère et retourne l'export PDF ou Excel du rapport
 * Les données sont envoyées dans le body car elles sont déjà chargées côté client
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Vérifier l'authentification
    const user = await getAuthUser(req);
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier la permission REPORTS_VIEW (ou équivalent)
    // Note: La permission exacte dépend de votre système RBAC
    
    // Récupérer le format demandé
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "pdf";

    if (format !== "pdf" && format !== "xlsx") {
      return NextResponse.json(
        { success: false, error: "Format invalide. Utilisez 'pdf' ou 'xlsx'" },
        { status: 400 }
      );
    }

    // Récupérer les données du rapport depuis le body
    const body = await req.json();
    const { data, start, end } = body as { 
      data: ReportExportData; 
      start: string; 
      end: string;
    };

    if (!data || !start || !end) {
      return NextResponse.json(
        { success: false, error: "Données manquantes (data, start, end requis)" },
        { status: 400 }
      );
    }

    // Générer le fichier
    const dateStr = new Date().toLocaleDateString("fr-FR").replace(/\//g, "-");
    
    if (format === "pdf") {
      const pdfBuffer = generateReportsPDF(data, start, end);
      
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="LocalGrill_Rapport_${start}_${end}.pdf"`,
          "Cache-Control": "no-cache"
        }
      });
    } else {
      const xlsxBuffer = generateReportsXLSX(data, start, end);
      
      return new NextResponse(new Uint8Array(xlsxBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="LocalGrill_Rapport_${start}_${end}.xlsx"`,
          "Cache-Control": "no-cache"
        }
      });
    }

  } catch (error) {
    console.error("[POST /api/exports/reports] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur lors de la génération de l'export" },
      { status: 500 }
    );
  }
}
