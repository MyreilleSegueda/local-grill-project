import { NextRequest, NextResponse } from 'next/server';
import { generateAlertsPDF, generateAlertsXLSX, AlertExportItem } from '@/lib/templates/alertsExportTemplate';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { format = 'pdf', items = [] } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    const alerts: AlertExportItem[] = items.map((item: any) => ({
      id: item.id,
      type: item.type || '-',
      severity: item.severity || 'INFO',
      message: item.message || '-',
      product_name: item.product_name || '-',
      is_resolved: item.is_resolved ?? false,
      created_at: item.created_at || new Date().toISOString(),
    }));

    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    if (format === 'xlsx') {
      buffer = generateAlertsXLSX(alerts);
      filename = `alertes-${new Date().toISOString().split('T')[0]}.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      buffer = generateAlertsPDF(alerts);
      filename = `alertes-${new Date().toISOString().split('T')[0]}.pdf`;
      contentType = 'application/pdf';
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
  }
}
