import { NextRequest, NextResponse } from 'next/server';
import { generateEntriesPDF, generateEntriesXLSX, EntryExportItem } from '@/lib/templates/entriesExportTemplate';

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

    const entries: EntryExportItem[] = items.map((item: any) => ({
      id: item.id,
      batch_number: item.batch_number || item.lot_number || '-',
      product_name: item.product?.name || item.product_name || '-',
      category_name: item.product?.category?.name || item.category_name || '-',
      unit_name: item.product?.unit?.name || item.product?.unit?.abbreviation || item.unit_name || '-',
      quantity_initial: Number(item.quantity_initial) || 0,
      quantity_remaining: Number(item.quantity_remaining) || 0,
      purchase_price: Number(item.purchase_price) || 0,
      entry_date: item.entry_date || item.created_at || new Date().toISOString(),
      expiration_date: item.expiration_date || null,
      supplier_name: item.product?.supplier?.name || item.supplier_name || '-',
      user_name: item.user?.fullName || item.user_name || '-',
      notes: item.notes || null,
    }));

    const date = new Date().toISOString().split('T')[0];

    if (format === 'pdf') {
      const pdfBuffer = generateEntriesPDF(entries);
      const filename = `entrees-stock-${date}.pdf`;
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else {
      const xlsxBuffer = generateEntriesXLSX(entries);
      const filename = `entrees-stock-${date}.xlsx`;
      return new NextResponse(new Uint8Array(xlsxBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
  } catch (error) {
    console.error('Erreur export entrees:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la generation de l\'export' },
      { status: 500 }
    );
  }
}
