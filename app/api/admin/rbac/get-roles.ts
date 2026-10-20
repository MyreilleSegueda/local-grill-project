import { NextRequest, NextResponse } from 'next/server';
import { getUserRoles } from '@/lib/rbac';

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }
  const roles = await getUserRoles(userId);
  return NextResponse.json({ roles });
}
