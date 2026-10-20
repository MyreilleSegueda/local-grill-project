import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { getAuthUser } from '@/lib/auth/request';

// POST: Créer un log d'audit (optionnel, pour tests)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const log = await prisma.activity_logs.create({
      data: {
        user_id: user.id,
        action: body.action,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        changes: body.changes,
        ip_address: request.headers.get('x-forwarded-for') || null,
      },
    });
    return NextResponse.json(log);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur création log' }, { status: 500 });
  }
}

// PUT: Automatisé pour loguer une action
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    if (!body.action) {
      return NextResponse.json({ error: 'Action requise' }, { status: 400 });
    }
    const log = await prisma.activity_logs.create({
      data: {
        user_id: user.id,
        action: body.action,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        changes: body.changes,
        ip_address: request.headers.get('x-forwarded-for') || null,
      },
    });
    return NextResponse.json({ success: true, log });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur log audit' }, { status: 500 });
  }
}
