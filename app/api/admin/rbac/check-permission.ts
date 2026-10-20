import { NextRequest, NextResponse } from 'next/server';
import { getUserRoles, hasPermission } from '@/lib/rbac';

export async function POST(req: NextRequest) {
  const { userId, permission } = await req.json();
  if (!userId || !permission) {
    return NextResponse.json({ error: 'userId and permission required' }, { status: 400 });
  }
  const allowed = await hasPermission(userId, permission);
  return NextResponse.json({ allowed });
}
