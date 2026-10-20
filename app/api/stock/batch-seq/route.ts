
import { NextRequest, NextResponse } from "next/server";
import { getBatchesCountForProductDate } from "@/lib/services/stockService";

// GET /api/stock/batch-seq?product_id=...&date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("product_id");
    const date = searchParams.get("date");
    if (!productId || !date) {
      return NextResponse.json({ error: "Missing product_id or date" }, { status: 400 });
    }
    // Appelle le service pour compter les lots existants pour ce produit et cette date
    const lastSeq = await getBatchesCountForProductDate(Number(productId), date);
    return NextResponse.json({ lastSeq });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur batch-seq" }, { status: 500 });
  }
}
