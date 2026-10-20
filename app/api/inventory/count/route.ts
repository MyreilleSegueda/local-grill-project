/**
 * app/api/inventory/count/route.ts — Next.js 15
 *
 * POST → enregistre un comptage physique
 *        Si qty ≠ théorique → crée un mouvement ADJUSTMENT pour la traçabilité
 *        Met à jour inventory_snapshots atomiquement via recordInventoryCount
 */
import { NextRequest, NextResponse }        from "next/server";
import { getUserIdFromRequest }             from "@/lib/services/auditLogService";
import { recordInventoryCount }             from "@/lib/services/inventoryService";
import { prisma }                           from "@/lib/prisma";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const body = await req.json() as {
      product_id?:        number;
      physical_quantity?: number;
      notes?:             string;
    };

    // ── Validation ──────────────────────────────────────────────────────────
    const errors: Record<string, string> = {};
    if (!body.product_id || isNaN(Number(body.product_id)))
      errors.product_id = "product_id requis";
    if (body.physical_quantity === undefined || isNaN(Number(body.physical_quantity)) || Number(body.physical_quantity) < 0)
      errors.physical_quantity = "Quantité physique invalide (≥ 0)";

    if (Object.keys(errors).length > 0)
      return NextResponse.json({ error: "Données invalides", fields: errors }, { status: 400 });

    // Vérifier que le produit existe
    const product = await prisma.products.findUnique({
      where:  { id: Number(body.product_id) },
      select: { id: true, name: true },
    });
    if (!product)
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

    // ── Comptage via le service central ────────────────────────────────────
    const count = await recordInventoryCount(
      {
        product_id:    Number(body.product_id),
        real_quantity: Number(body.physical_quantity),
        notes:         body.notes,
      },
      userId,
    );

    return NextResponse.json({
      success: true,
      data: {
        countId:           count.id,
        product_id:        count.product_id,
        physical_quantity: count.real_quantity,
      },
    });

  } catch (err) {
    console.error("[POST /api/inventory/count]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}