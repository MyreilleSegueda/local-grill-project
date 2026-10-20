
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/request';
import { resolveAlert } from '@/lib/services/alertService';

type ErrorResponse = {
  success: false;
  error: string;
};

type SuccessResponse = {
  success: true;
  data: {
    alertId: number;
    resolved: boolean;
  };
};

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ErrorResponse | SuccessResponse>> {
  try {
    // Check authentication
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const alertId = parseInt(id);

    // Mark alert as resolved
    await resolveAlert(alertId);

    return NextResponse.json({
      success: true,
      data: {
        alertId,
        resolved: true,
      },
    });
  } catch (error) {
    console.error('Alert resolve API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
