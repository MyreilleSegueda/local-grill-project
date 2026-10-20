// app/api/admin/categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient }              from "@prisma/client";

const prisma = new PrismaClient();

function getId(req: NextRequest): number | null {
  const parts = req.nextUrl.pathname.split("/");
  const id    = parseInt(parts[parts.length - 1]);
  return isNaN(id) ? null : id;
}

// ─── GET — détail d'une catégorie ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const id = getId(req);
  if (!id) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const category = await prisma.categories.findUnique({
    where:   { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
  return NextResponse.json(category);
}

// ─── PUT — modifier une catégorie ────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const id = getId(req);
  if (!id) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    const { name, description, is_active } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    }

    // Unicité : exclure la catégorie courante
    const conflict = await prisma.categories.findFirst({
      where: { name: name.trim(), NOT: { id } },
    });
    if (conflict) {
      return NextResponse.json({ error: "Ce nom est déjà utilisé" }, { status: 409 });
    }

    const updated = await prisma.categories.update({
      where: { id },
      data: {
        name:        name.trim(),
        description: description?.trim() || null,
        is_active:   is_active !== false,
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.code === "P2025") return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
    console.error("[categories PUT]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ─── DELETE — supprimer une catégorie ────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const id = getId(req);
  if (!id) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    // Vérifier si des produits utilisent cette catégorie
    const productCount = await prisma.products.count({ where: { category_id: id } });
    if (productCount > 0) {
      return NextResponse.json(
        { error: `Impossible : ${productCount} produit(s) utilisent cette catégorie` },
        { status: 409 }
      );
    }

    await prisma.categories.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
    console.error("[categories DELETE]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}