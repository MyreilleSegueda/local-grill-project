// app/api/admin/settings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


// ─────────────────────────────────────────────
// GET : récupérer tous les paramètres
// ─────────────────────────────────────────────
export async function GET() {
  try {
    const rows = await prisma.setting.findMany({
      orderBy: { key: "asc" },
    });

    const result: Record<string, string | null> = {};

    rows.forEach((row) => {
      result[row.key] = row.value;
    });

    return NextResponse.json(result);

  } catch (error) {

    console.error("[SETTINGS_GET_ERROR]", error);

    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}


// ─────────────────────────────────────────────
// POST : enregistrer / mettre à jour paramètres
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {

    const data: Record<string, string | number | boolean | null> = await req.json();

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return NextResponse.json(
        { error: "Corps de requête invalide" },
        { status: 400 }
      );
    }

    // Upsert parallèle (plus rapide)
    await Promise.all(
      Object.entries(data).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: {
            value: value !== null ? String(value) : null,
          },
          create: {
            key,
            value: value !== null ? String(value) : null,
            updatedAt: new Date(),
          },
        })
      )
    );

    return NextResponse.json({ success: true });

  } catch (error) {

    console.error("[SETTINGS_POST_ERROR]", error);

    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
