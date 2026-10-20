// app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient }              from "@prisma/client";

const prisma = new PrismaClient();

// ─── GET — liste toutes les catégories ───────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const categories = await prisma.categories.findMany({
      orderBy: [{ is_active: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { products: true } },
      },
    });
    return NextResponse.json(categories);
  } catch (err) {
    console.error("[categories GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ─── POST — créer une catégorie ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { name, description, is_active } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    }

    // Vérification d'unicité
    const existing = await prisma.categories.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Une catégorie avec ce nom existe déjà" }, { status: 409 });
    }

    const category = await prisma.categories.create({
      data: {
        name:        name.trim(),
        description: description?.trim() || null,
        is_active:   is_active !== false,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error("[categories POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}