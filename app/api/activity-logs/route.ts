import { NextRequest, NextResponse } from 'next/server';
import { getActivityLogs } from '@/server/services/activityLogService';
import { errorResponse, successResponse, getAuthUser } from '@/lib/auth/request';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }
    const searchParams = request.nextUrl.searchParams;
    const entity_type = searchParams.get('entity_type') || undefined;
    const entity_id = searchParams.get('entity_id') ? parseInt(searchParams.get('entity_id')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const logs = await getActivityLogs({ entity_type, entity_id, limit });
    return NextResponse.json(successResponse(logs));
  } catch (error) {
    return NextResponse.json(errorResponse('Server error'), { status: 500 });
  }
}
