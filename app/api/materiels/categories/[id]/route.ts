// app/api/materiels/categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient }              from "@prisma/client";

const prisma = new PrismaClient();

function getId(req: NextRequest): number | null {
  const parts = req.nextUrl.pathname.split("/");
  const id    = parseInt(parts[parts.length - 1]);
  return isNaN(id) ? null : id;
}

// ─── GET — détail d'une catégorie de matériel ────────────────────────────────
export async function GET(req: NextRequest) {
  const id = getId(req);
  if (!id) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const category = await prisma.categories_materiels.findUnique({
    where: { id },
  });
  if (!category) return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
  const materielCount = await prisma.materiels.count({ where: { category_id: id } });
  return NextResponse.json({ ...category, _count: { materiels: materielCount } });
}

// ─── PUT — modifier une catégorie de matériel ────────────────────────────────
export async function PUT(req: NextRequest) {
  const id = getId(req);
  if (!id) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    const { name, description, is_active } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    }

    // Unicité : exclure la catégorie courante
    const conflict = await prisma.categories_materiels.findFirst({
      where: { name: name.trim(), NOT: { id } },
    });
    if (conflict) {
      return NextResponse.json({ error: "Ce nom est déjà utilisé" }, { status: 409 });
    }

    const updated = await prisma.categories_materiels.update({
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
    console.error("[materiels/categories PUT]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ─── DELETE — supprimer une catégorie de matériel ────────────────────────────
export async function DELETE(req: NextRequest) {
  const id = getId(req);
  if (!id) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    // Vérifier si des matériels utilisent cette catégorie
    const materielCount = await prisma.materiels.count({ where: { category_id: id } });
    if (materielCount > 0) {
      return NextResponse.json(
        { error: `Impossible : ${materielCount} matériel(s) utilisent cette catégorie` },
        { status: 409 }
      );
    }

    await prisma.categories_materiels.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
    console.error("[materiels/categories DELETE]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
