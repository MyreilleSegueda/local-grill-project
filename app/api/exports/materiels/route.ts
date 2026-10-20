import { NextRequest, NextResponse } from 'next/server';
import { generateMaterielsPDF, generateMaterielsXLSX, MaterielExportItem } from '@/lib/templates/materielsExportTemplate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format, items } = body;

    if (!format || !['pdf', 'xlsx'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Format invalide. Utilisez "pdf" ou "xlsx"' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune donnee a exporter' },
        { status: 400 }
      );
    }

    const materiels: MaterielExportItem[] = items.map((item: any) => ({
      id: item.id,
      name: item.name || '-',
      reference: item.reference || undefined,
      category_name: item.category?.name || item.category_name || undefined,
      description: item.description || undefined,
      quantity: Number(item.quantity) || 0,
      minimum_stock: Number(item.minimum_stock) || 0,
      unit: item.unit || '-',
      location: item.location || undefined,
      purchase_price: item.purchase_price ? Number(item.purchase_price) : undefined,
      purchase_date: item.purchase_date || undefined,
      supplier: item.supplier || undefined,
      is_active: item.is_active ?? true,
      created_at: item.created_at || new Date().toISOString(),
    }));

    const date = new Date().toISOString().split('T')[0];

    if (format === 'pdf') {
      const pdfBuffer = generateMaterielsPDF(materiels);
      const filename = `materiels-${date}.pdf`;
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else {
      const xlsxBuffer = generateMaterielsXLSX(materiels);
      const filename = `materiels-${date}.xlsx`;
      return new NextResponse(new Uint8Array(xlsxBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
  } catch (error) {
    console.error('Erreur export materiels:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la generation de l\'export' },
      { status: 500 }
    );
  }
}
