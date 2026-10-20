import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent } from '@/server/services/auditLogService';

export async function POST(req: NextRequest) {
  const { userId, action } = await req.json();
  if (!userId || !action) {
    return NextResponse.json({ error: 'userId and action required' }, { status: 400 });
  }
  const log = await logAuditEvent({ userId, action });
  return NextResponse.json(log);
}
