import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeKitchen } from "@/lib/services/kitchenAuth";

export async function GET(req: NextRequest) {
  const auth = await authorizeKitchen(req, "CUISINE_VIEW");
  if (auth.response) return auth.response;

  try {
    const lines = await prisma.kitchen_dispatch_lines.findMany({
      include: {
        product: { include: { unit: true } },
        dispatch: { include: { creator: { select: { id: true, fullName: true } } } },
        events: {
          include: { actor: { select: { id: true, fullName: true } }, stock_movement: true },
          orderBy: { created_at: "desc" },
        },
      },
      orderBy: { dispatch: { created_at: "desc" } },
    });

    return NextResponse.json({ success: true, data: { lines } });
  } catch (error) {
    console.error("[GET /api/cuisine]", error);
    return NextResponse.json({ error: "Impossible de charger le suivi Cuisine" }, { status: 500 });
  }
}
