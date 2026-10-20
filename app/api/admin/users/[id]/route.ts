export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// -------------------- PUT Update User --------------------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!id || isNaN(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

    const data = await req.json();

    // ── Vérifier que l'utilisateur existe ────────────────────────
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

    // ── Hash du mot de passe si fourni ───────────────────────────
    let passwordHash: string | undefined;
    if (data.password && data.password.trim() !== '') {
      const bcrypt = require('bcryptjs');
      passwordHash = await bcrypt.hash(data.password, 12);
    }

    // ── Mettre à jour les champs de base ─────────────────────────
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(data.email    && { email:    data.email }),
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.status   && { status:   data.status }),
        ...(passwordHash  && { passwordHash }),
      },
    });

    // ── Mettre à jour le rôle si fourni ──────────────────────────
    const roleId = data.roleId ? Number(data.roleId) : null;
    if (roleId) {
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) {
        return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
      }

      // Supprimer anciens rôles et recréer
      await prisma.userRole.deleteMany({ where: { userId: id } });
      await prisma.userRole.create({ data: { userId: id, roleId: role.id } });
    }

    // ── Retourner l'utilisateur mis à jour avec ses rôles ────────
    const result = await prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[PUT /api/admin/users/[id]]', err);
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// -------------------- DELETE User --------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!id || isNaN(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

    // Supprimer dans l'ordre pour respecter les FK
    // 1. stock_movements liés aux batches de cet user
    await prisma.stock_movements.deleteMany({
      where: { batch: { user_id: id } },
    });
    // 2. stock_batches de cet user
    await prisma.stock_batches.deleteMany({ where: { user_id: id } });
    // 3. Les autres relations avec onDelete: Cascade sont gérées automatiquement
    //    (userRoles, userPermissions, sessions, auditLogs, tenantUsers, otps)
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/users/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

// -------------------- PATCH Toggle Status --------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!id || isNaN(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      include: { userRoles: { include: { role: true } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/admin/users/[id]/toggle-status]', err);
    return NextResponse.json({ error: 'Failed to toggle status' }, { status: 500 });
  }
}