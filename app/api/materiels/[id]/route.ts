/**
 * API Route: /api/materiels/[id]
 * GET    → détail d'un matériel
 * PUT    → modifier un matériel
 * DELETE → supprimer un matériel
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/services/auditLogService";
import { Decimal } from "@prisma/client/runtime/library";

// GET /api/materiels/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const materiel = await prisma.materiels.findUnique({ where: { id } });

    if (!materiel) {
      return NextResponse.json(
        { error: "Matériel non trouvé" },
        { status: 404 }
      );
    }

    const [category, movements] = await Promise.all([
      prisma.categories_materiels.findUnique({ where: { id: materiel.category_id } }),
      prisma.materiel_movements.findMany({ where: { materiel_id: id }, orderBy: { created_at: "desc" } }),
    ]);
    const userIds = [...new Set(movements.map((movement) => movement.user_id))];
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } })
      : [];
    const userById = new Map(users.map((item) => [item.id, item]));

    return NextResponse.json({
      success: true,
      data: {
        materiel: {
          ...materiel,
          category,
          mouvements: movements.map((movement) => ({ ...movement, user: userById.get(movement.user_id) ?? null })),
        },
      },
    });
  } catch (err) {
    console.error("[GET /api/materiels/[id]]", err);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du matériel" },
      { status: 500 }
    );
  }
}

// PUT /api/materiels/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      category_id,
      reference,
      description,
      minimum_stock,
      unit,
      location,
      purchase_price,
      purchase_date,
      supplier,
      is_active,
    } = body;

    // Check if materiel exists
    const existing = await prisma.materiels.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Matériel non trouvé" },
        { status: 404 }
      );
    }

    // Check if new reference conflicts
    if (reference && reference !== existing.reference) {
      const conflict = await prisma.materiels.findFirst({
        where: { reference, NOT: { id } },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "Cette référence existe déjà" },
          { status: 409 }
        );
      }
    }

    // Update materiel
    const materiel = await prisma.materiels.update({
      where: { id },
      data: {
        name: name?.trim() || existing.name,
        category_id: category_id ? parseInt(category_id) : existing.category_id,
        reference: reference !== undefined ? reference?.trim() || null : existing.reference,
        description: description !== undefined ? description?.trim() || null : existing.description,
        minimum_stock: minimum_stock !== undefined
          ? new Decimal(minimum_stock)
          : existing.minimum_stock,
        unit: unit?.trim() || existing.unit,
        location: location !== undefined ? location?.trim() || null : existing.location,
        purchase_price: purchase_price !== undefined && purchase_price !== null
          ? new Decimal(purchase_price)
          : existing.purchase_price,
        purchase_date: purchase_date !== undefined
          ? purchase_date ? new Date(purchase_date) : null
          : existing.purchase_date,
        supplier: supplier !== undefined ? supplier?.trim() || null : existing.supplier,
        is_active: is_active !== undefined ? is_active : existing.is_active,
      },
    });
    const category = await prisma.categories_materiels.findUnique({ where: { id: materiel.category_id } });

    return NextResponse.json({
      success: true,
      data: { materiel: { ...materiel, category } },
    });
  } catch (err) {
    console.error("[PUT /api/materiels/[id]]", err);
    return NextResponse.json(
      { error: "Erreur lors de la modification du matériel" },
      { status: 500 }
    );
  }
}

// DELETE /api/materiels/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Check if materiel exists
    const existing = await prisma.materiels.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Matériel non trouvé" },
        { status: 404 }
      );
    }

    // Delete associated movements first (no relation is declared in Prisma).
    await prisma.materiel_movements.deleteMany({
      where: { materiel_id: id },
    });

    // Delete materiel
    await prisma.materiels.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Matériel supprimé avec succès",
    });
  } catch (err) {
    console.error("[DELETE /api/materiels/[id]]", err);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du matériel" },
      { status: 500 }
    );
  }
}
