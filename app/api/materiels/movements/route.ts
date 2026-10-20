/**
 * API Route: /api/materiels/movements
 * GET  → liste des mouvements de matériels
 * POST → créer un mouvement (entrée ou sortie)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/services/auditLogService";
import { Decimal } from "@prisma/client/runtime/library";
import type { MaterielMovementType } from "@prisma/client";

// GET /api/materiels/movements
export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const materielId = searchParams.get("materiel_id")
      ? parseInt(searchParams.get("materiel_id")!)
      : undefined;
    const type = searchParams.get("type") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "20");

    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (materielId) where.materiel_id = materielId;
    if (type) where.type = type;

    const [movements, totalCount] = await Promise.all([
      prisma.materiel_movements.findMany({ where, orderBy: { created_at: "desc" }, skip, take: pageSize }),
      prisma.materiel_movements.count({ where }),
    ]);
    const materielIds = [...new Set(movements.map((movement) => movement.materiel_id))];
    const userIds = [...new Set(movements.map((movement) => movement.user_id))];
    const [materiels, users] = await Promise.all([
      materielIds.length ? prisma.materiels.findMany({ where: { id: { in: materielIds } } }) : Promise.resolve([]),
      userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }) : Promise.resolve([]),
    ]);
    const categoryIds = [...new Set(materiels.map((materiel) => materiel.category_id))];
    const categories = categoryIds.length
      ? await prisma.categories_materiels.findMany({ where: { id: { in: categoryIds } } })
      : [];
    const materielById = new Map(materiels.map((materiel) => [materiel.id, materiel]));
    const userById = new Map(users.map((user) => [user.id, user]));
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const movementsWithDetails = movements.map((movement) => {
      const materiel = materielById.get(movement.materiel_id);
      return {
        ...movement,
        materiel: materiel ? { ...materiel, category: categoryById.get(materiel.category_id) ?? null } : null,
        user: userById.get(movement.user_id) ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        movements: movementsWithDetails,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      },
    });
  } catch (err) {
    console.error("[GET /api/materiels/movements]", err);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des mouvements" },
      { status: 500 }
    );
  }
}

// POST /api/materiels/movements
export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      materiel_id,
      type,
      quantity,
      reason,
      reference_number,
    } = body;

    // Validation
    const errors: Record<string, string> = {};
    if (!materiel_id) errors.materiel_id = "Matériel requis";
    if (!type) errors.type = "Type de mouvement requis";
    if (!quantity || quantity <= 0) errors.quantity = "Quantité > 0 requise";

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Données invalides", fields: errors },
        { status: 400 }
      );
    }

    // Check if materiel exists
    const materiel = await prisma.materiels.findUnique({
      where: { id: parseInt(materiel_id) },
    });

    if (!materiel) {
      return NextResponse.json(
        { error: "Matériel non trouvé" },
        { status: 404 }
      );
    }

    const mvtType = type as MaterielMovementType;
    const qty = new Decimal(quantity);

    // For OUT, LOSS, BROKEN, OLD movements: check if enough stock
    const isOutMovement = ["OUT", "LOSS", "BROKEN", "OLD"].includes(mvtType);
    if (isOutMovement) {
      const currentQty = new Decimal(materiel.quantity);
      if (currentQty.lessThan(qty)) {
        return NextResponse.json(
          { error: `Stock insuffisant : disponible ${currentQty}, demandé ${qty}` },
          { status: 409 }
        );
      }
    }

    // Create movement and update quantity in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create movement
      const movement = await tx.materiel_movements.create({
        data: {
          materiel_id: parseInt(materiel_id),
          type: mvtType,
          quantity: qty,
          reason: reason?.trim() || null,
          reference_number: reference_number?.trim() || null,
          user_id: userId,
        },
      });

      // Update materiel quantity
      const currentQty = new Decimal(materiel.quantity);
      let newQty: Decimal;

      if (mvtType === "IN" || mvtType === "ADJUSTMENT") {
        // For IN and ADJUSTMENT: add quantity
        newQty = mvtType === "IN" ? currentQty.plus(qty) : qty;
      } else {
        // For OUT, LOSS, BROKEN, OLD: subtract quantity
        newQty = currentQty.minus(qty);
      }

      await tx.materiels.update({
        where: { id: parseInt(materiel_id) },
        data: { quantity: newQty },
      });

      return movement;
    });

    const [updatedMateriel, movementUser] = await Promise.all([
      prisma.materiels.findUnique({ where: { id: materiel.id } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true } }),
    ]);
    const category = updatedMateriel
      ? await prisma.categories_materiels.findUnique({ where: { id: updatedMateriel.category_id } })
      : null;
    const movementWithDetails = {
      ...result,
      user: movementUser,
      materiel: updatedMateriel ? { ...updatedMateriel, category } : null,
    };

    return NextResponse.json(
      { success: true, data: { movement: movementWithDetails } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/materiels/movements]", err);
    return NextResponse.json(
      { error: "Erreur lors de la création du mouvement" },
      { status: 500 }
    );
  }
}
