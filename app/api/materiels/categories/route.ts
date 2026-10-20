/**
 * API Route: /api/materiels/categories
 * GET  → liste des catégories de matériels
 * POST → créer une nouvelle catégorie
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/services/auditLogService";

// GET /api/materiels/categories
export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const categories = await prisma.categories_materiels.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
    });
    const counts = await prisma.materiels.findMany({
      select: { category_id: true },
    });
    const countByCategory = new Map<number, number>();
    for (const materiel of counts) {
      countByCategory.set(materiel.category_id, (countByCategory.get(materiel.category_id) ?? 0) + 1);
    }
    const categoriesWithCount = categories.map((category) => ({
      ...category,
      _count: { materiels: countByCategory.get(category.id) ?? 0 },
    }));

    return NextResponse.json({
      success: true,
      data: { categories: categoriesWithCount },
    });
  } catch (err) {
    console.error("[GET /api/materiels/categories]", err);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des catégories" },
      { status: 500 }
    );
  }
}

// POST /api/materiels/categories
export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Nom de catégorie requis" },
        { status: 400 }
      );
    }

    // Check if category already exists
    const existing = await prisma.categories_materiels.findFirst({
      where: {
        name: name.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Cette catégorie existe déjà" },
        { status: 409 }
      );
    }

    const category = await prisma.categories_materiels.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        is_active: true,
      },
    });

    return NextResponse.json(
      { success: true, data: { category } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/materiels/categories]", err);
    return NextResponse.json(
      { error: "Erreur lors de la création de la catégorie" },
      { status: 500 }
    );
  }
}
