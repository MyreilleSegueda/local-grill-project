export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH /api/admin/users/[id]/toggle-status
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const userId = Number(id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const updated = await prisma.user.update({ where: { id: userId }, data: { status: newStatus } });
  return NextResponse.json(updated);
}
