import { NextRequest, NextResponse } from 'next/server';
import { generateExitsPDF, generateExitsXLSX, ExitExportItem } from '@/lib/templates/exitsExportTemplate';

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

    const exits: ExitExportItem[] = items.map((item: any) => ({
      id: item.id,
      product_name: item.product?.name || item.product_name || '-',
      category_name: item.product?.category?.name || item.category_name || '-',
      unit_name: item.product?.unit?.name || item.product?.unit?.abbreviation || item.unit_name || '-',
      quantity: Number(item.quantity) || 0,
      type: item.type || '-',
      reason: item.reason || null,
      reference_number: item.reference_number || null,
      batch_number: item.batch?.batch_number || item.batch_number || null,
      user_name: item.user?.fullName || item.user_name || '-',
      created_at: item.created_at || new Date().toISOString(),
      purchase_price: Number(item.batch?.purchase_price) || Number(item.purchase_price) || 0,
    }));

    const date = new Date().toISOString().split('T')[0];

    if (format === 'pdf') {
      const pdfBuffer = generateExitsPDF(exits);
      const filename = `sorties-stock-${date}.pdf`;
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else {
      const xlsxBuffer = generateExitsXLSX(exits);
      const filename = `sorties-stock-${date}.xlsx`;
      return new NextResponse(new Uint8Array(xlsxBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
  } catch (error) {
    console.error('Erreur export sorties:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la generation de l\'export' },
      { status: 500 }
    );
  }
}
