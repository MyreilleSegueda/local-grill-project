/**
 * API Route: GET /api/alerts
 * Fetches active alerts
 */


import { NextRequest, NextResponse } from 'next/server';
import { checkExpirationAlerts, checkLowStockAlerts, getActiveAlerts } from '@/lib/services/alertService';
import { errorResponse, successResponse, getAuthUser } from '@/lib/auth/request';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }

    // Synchronise les alertes sans effacer les alertes actives à chaque affichage.
    await checkLowStockAlerts();
    await checkExpirationAlerts();

    const alerts = await getActiveAlerts(100);
    return NextResponse.json(successResponse({ alerts }));
  } catch (error) {
    console.error('Get alerts error:', error);
    return NextResponse.json(
      errorResponse('An error occurred while fetching alerts'),
      { status: 500 }
    );
  }
}
