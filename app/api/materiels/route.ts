/**
 * API Route: /api/materiels
 * GET  → liste des matériels avec filtres
 * POST → créer un nouveau matériel
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/services/auditLogService";
import { Decimal } from "@prisma/client/runtime/library";

// GET /api/materiels
export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("category_id")
      ? parseInt(searchParams.get("category_id")!)
      : undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "20");
    const includeInactive = searchParams.get("include_inactive") === "true";

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};
    
    if (!includeInactive) {
      where.is_active = true;
    }
    
    if (categoryId) {
      where.category_id = categoryId;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { reference: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } },
      ];
    }

    // These models store foreign keys as scalar columns; Prisma has no
    // category/movements/user relations for them in the current schema.
    const [materiels, totalCount, categories] = await Promise.all([
      prisma.materiels.findMany({ where, orderBy: { name: "asc" }, skip, take: pageSize }),
      prisma.materiels.count({ where }),
      prisma.categories_materiels.findMany({ where: { is_active: true }, orderBy: { name: "asc" } }),
    ]);
    const materielIds = materiels.map((item) => item.id);
    const categoryIds = [...new Set(materiels.map((item) => item.category_id))];
    const [movements, allCategories] = await Promise.all([
      materielIds.length
        ? prisma.materiel_movements.findMany({
            where: { materiel_id: { in: materielIds } },
            orderBy: { created_at: "desc" },
          })
        : Promise.resolve([]),
      categoryIds.length
        ? prisma.categories_materiels.findMany({ where: { id: { in: categoryIds } } })
        : Promise.resolve([]),
    ]);
    const movementUserIds = [...new Set(movements.map((movement) => movement.user_id))];
    const movementUsers = movementUserIds.length
      ? await prisma.user.findMany({ where: { id: { in: movementUserIds } }, select: { id: true, fullName: true } })
      : [];
    const categoryById = new Map(allCategories.map((category) => [category.id, category]));
    const userById = new Map(movementUsers.map((movementUser) => [movementUser.id, movementUser]));
    const movementsByMateriel = new Map<number, typeof movements>();
    for (const movement of movements) {
      const list = movementsByMateriel.get(movement.materiel_id) ?? [];
      list.push(movement);
      movementsByMateriel.set(movement.materiel_id, list);
    }
    const items = materiels.map((item) => ({
      ...item,
      category: categoryById.get(item.category_id) ?? null,
      mouvements: (movementsByMateriel.get(item.id) ?? []).slice(0, 5).map((movement) => ({
        ...movement,
        user: userById.get(movement.user_id) ?? null,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: {
        materiels: items,
        categories,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      },
    });
  } catch (err) {
    console.error("[GET /api/materiels]", err);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des matériels" },
      { status: 500 }
    );
  }
}

// POST /api/materiels
export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      category_id,
      reference,
      description,
      quantity,
      minimum_stock,
      unit,
      location,
      purchase_price,
      purchase_date,
      supplier,
    } = body;

    // Validation
    const errors: Record<string, string> = {};
    if (!name?.trim()) errors.name = "Nom requis";
    if (!category_id) errors.category_id = "Catégorie requise";
    if (quantity !== undefined && quantity < 0) errors.quantity = "Quantité invalide";

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Données invalides", fields: errors },
        { status: 400 }
      );
    }

    // Check if reference already exists
    if (reference) {
      const existing = await prisma.materiels.findFirst({
        where: { reference },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Cette référence existe déjà" },
          { status: 409 }
        );
      }
    }

    // Create materiel
    const materiel = await prisma.materiels.create({
      data: {
        name: name.trim(),
        category_id: parseInt(category_id),
        reference: reference?.trim() || null,
        description: description?.trim() || null,
        quantity: quantity !== undefined ? new Decimal(quantity) : new Decimal(0),
        minimum_stock: minimum_stock !== undefined 
          ? new Decimal(minimum_stock) 
          : new Decimal(1),
        unit: unit?.trim() || "unité",
        location: location?.trim() || null,
        purchase_price: purchase_price !== undefined 
          ? new Decimal(purchase_price) 
          : null,
        purchase_date: purchase_date ? new Date(purchase_date) : null,
        supplier: supplier?.trim() || null,
        is_active: true,
      },
    });

    // Create initial movement if quantity > 0
    if (quantity > 0) {
      await prisma.materiel_movements.create({
        data: {
          materiel_id: materiel.id,
          type: "IN",
          quantity: new Decimal(quantity),
          reason: "Stock initial",
          user_id: userId,
        },
      });
    }

    const category = await prisma.categories_materiels.findUnique({ where: { id: materiel.category_id } });

    return NextResponse.json(
      { success: true, data: { materiel: { ...materiel, category } } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/materiels]", err);
    return NextResponse.json(
      { error: "Erreur lors de la création du matériel" },
      { status: 500 }
    );
  }
}
