export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// -------------------- GET Users --------------------
// -------------------- GET Users --------------------
export async function GET(req: NextRequest) {
  try {
    // TODO: Auth + RBAC
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        userRoles: { include: { role: true } },
      },
    });
    return NextResponse.json(users);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// -------------------- POST Create User --------------------
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // ── Validation ──────────────────────────────────────────────
    if (!data.email)    return NextResponse.json({ error: 'Email requis' },    { status: 400 });
    if (!data.fullName) return NextResponse.json({ error: 'Nom requis' },      { status: 400 });
    if (!data.password) return NextResponse.json({ error: 'Mot de passe requis' }, { status: 400 });

    // roleId (number | string) OU role (name string) — on accepte les deux
    const roleId: number | null = data.roleId
      ? Number(data.roleId)
      : null;

    if (!roleId && !data.role) {
      return NextResponse.json({ error: 'Rôle requis' }, { status: 400 });
    }

    // ── Trouver le rôle ──────────────────────────────────────────
    const role = roleId
      ? await prisma.role.findUnique({ where: { id: roleId } })
      : await prisma.role.findUnique({ where: { name: data.role } });

    if (!role) {
      return NextResponse.json({ error: 'Rôle invalide ou introuvable' }, { status: 400 });
    }

    // ── Vérifier email unique ────────────────────────────────────
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }

    // ── Hash password ────────────────────────────────────────────
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(data.password, 12);

    // ── Créer l'utilisateur ──────────────────────────────────────
    const user = await prisma.user.create({
      data: {
        email:        data.email,
        fullName:     data.fullName,
        passwordHash,
        status:       data.status || 'ACTIVE',
        userRoles: {
          create: [{ roleId: role.id }],
        },
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/admin/users]', err);
    // Prisma unique constraint
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
