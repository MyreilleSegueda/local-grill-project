import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/stock/quantity?product_id=ID
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('product_id');
  if (!productId) {
    return NextResponse.json({ error: 'Paramètre product_id manquant' }, { status: 400 });
  }
  const id = parseInt(productId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'product_id invalide' }, { status: 400 });
  }
  // On cherche le snapshot d'inventaire pour ce produit
  const snapshot = await prisma.inventory_snapshots.findUnique({
    where: { product_id: id },
    select: { real_quantity: true },
  });
  if (!snapshot) {
    return NextResponse.json({ error: 'Stock non trouvé pour ce produit' }, { status: 404 });
  }
  return NextResponse.json({ data: { quantity: Number(snapshot.real_quantity) } });
}
