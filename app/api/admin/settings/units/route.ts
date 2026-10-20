// app/api/admin/units/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient }              from "@prisma/client";

const prisma = new PrismaClient();

// ─── GET — liste toutes les unités ───────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const units = await prisma.units.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    });
    return NextResponse.json(units);
  } catch (err) {
    console.error("[units GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ─── POST — créer une unité ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { name, abbreviation, description } = await req.json();

    if (!name?.trim() || !abbreviation?.trim()) {
      return NextResponse.json({ error: "Nom et abréviation requis" }, { status: 400 });
    }

    // Unicité nom
    const existingName = await prisma.units.findUnique({ where: { name: name.trim() } });
    if (existingName) {
      return NextResponse.json({ error: "Ce nom d'unité existe déjà" }, { status: 409 });
    }

    // Unicité abréviation
    const existingAbbrev = await prisma.units.findUnique({ where: { abbreviation: abbreviation.trim() } });
    if (existingAbbrev) {
      return NextResponse.json({ error: "Cette abréviation existe déjà" }, { status: 409 });
    }

    const unit = await prisma.units.create({
      data: {
        name:         name.trim(),
        abbreviation: abbreviation.trim(),
        description:  description?.trim() || null,
      },
    });
    return NextResponse.json(unit, { status: 201 });
  } catch (err) {
    console.error("[units POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}