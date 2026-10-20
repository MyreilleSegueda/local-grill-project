import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { getAuthUser } from '@/lib/auth/request';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const existing = await prisma.user.findUnique({ where: { id: Number(params.id) } });
    if (!existing) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    const newStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await prisma.user.update({ where: { id: Number(params.id) }, data: { status: newStatus } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur statut utilisateur' }, { status: 500 });
  }
}
