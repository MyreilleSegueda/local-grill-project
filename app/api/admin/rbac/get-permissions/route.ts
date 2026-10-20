import { NextRequest, NextResponse } from 'next/server';
import { getRolePermissions } from '@/lib/rbac';

export async function POST(req: NextRequest) {
  const { roleId } = await req.json();
  if (!roleId) {
    return NextResponse.json({ error: 'roleId required' }, { status: 400 });
  }
  const permissions = await getRolePermissions(roleId);
  return NextResponse.json({ permissions });
}
