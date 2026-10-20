import { NextRequest, NextResponse } from 'next/server';
import { assignPermissionToRole, assignPermissionToUser } from '@/lib/services/permissionService';

export async function POST(req: NextRequest) {
  const { permissionId, roleId, userId } = await req.json();
  if (!permissionId || (!roleId && !userId)) {
    return NextResponse.json({ error: 'permissionId and (roleId or userId) required' }, { status: 400 });
  }
  let result;
  if (roleId) {
    result = await assignPermissionToRole(permissionId, roleId);
  } else {
    result = await assignPermissionToUser(permissionId, userId);
  }
  return NextResponse.json(result);
}
