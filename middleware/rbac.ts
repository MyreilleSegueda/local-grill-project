import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/rbac';

export async function middleware(req: NextRequest) {
  // Example: Protect admin routes with RBAC
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const userId = req.headers.get('x-user-id');
  const requiredPermission = req.headers.get('x-required-permission');
  if (!userId || !requiredPermission) {
    return NextResponse.json({ error: 'userId and requiredPermission required' }, { status: 400 });
  }
  const allowed = await hasPermission(Number(userId), requiredPermission);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.next();
}
