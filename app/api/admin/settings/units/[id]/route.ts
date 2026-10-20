// app/api/admin/units/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient }              from "@prisma/client";

const prisma = new PrismaClient();

function getId(req: NextRequest): number | null {
  const parts = req.nextUrl.pathname.split("/");
  const id    = parseInt(parts[parts.length - 1]);
  return isNaN(id) ? null : id;
}

// ─── GET — détail d'une unité ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const id = getId(req);
  if (!id) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const unit = await prisma.units.findUnique({
    where:   { id },
    include: { _count: { select: { products: true } } },
  });
  if (!unit) return NextResponse.json({ error: "Unité introuvable" }, { status: 404 });
  return NextResponse.json(unit);
}

// ─── PUT — modifier une unité ─────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const id = getId(req);
  if (!id) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    const { name, abbreviation, description } = await req.json();

    if (!name?.trim() || !abbreviation?.trim()) {
      return NextResponse.json({ error: "Nom et abréviation requis" }, { status: 400 });
    }

    // Unicité nom (exclure current)
    const conflictName = await prisma.units.findFirst({ where: { name: name.trim(), NOT: { id } } });
    if (conflictName) return NextResponse.json({ error: "Ce nom est déjà utilisé" }, { status: 409 });

    // Unicité abréviation (exclure current)
    const conflictAbbrev = await prisma.units.findFirst({ where: { abbreviation: abbreviation.trim(), NOT: { id } } });
    if (conflictAbbrev) return NextResponse.json({ error: "Cette abréviation est déjà utilisée" }, { status: 409 });

    const updated = await prisma.units.update({
      where: { id },
      data: {
        name:         name.trim(),
        abbreviation: abbreviation.trim(),
        description:  description?.trim() || null,
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.code === "P2025") return NextResponse.json({ error: "Unité introuvable" }, { status: 404 });
    console.error("[units PUT]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ─── DELETE — supprimer une unité ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const id = getId(req);
  if (!id) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    // Vérifier si des produits utilisent cette unité
    const productCount = await prisma.products.count({ where: { unit_id: id } });
    if (productCount > 0) {
      return NextResponse.json(
        { error: `Impossible : ${productCount} produit(s) utilisent cette unité` },
        { status: 409 }
      );
    }

    await prisma.units.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") return NextResponse.json({ error: "Unité introuvable" }, { status: 404 });
    console.error("[units DELETE]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}