/**
 * lib/services/auditLogService.ts — SOURCE UNIQUE
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * DEUX TABLES DE LOG :
 *
 *  AuditLog     → enum AuditAction strict, pas de "details"
 *                 Réservé : auth, sessions, users, roles, permissions
 *
 *  ActivityLog  → action String libre + details Text (JSON)
 *                 Pour tout le reste : stock, inventaire, produits, profil…
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { prisma }           from "@/lib/prisma";
import { auditlog_action as AuditAction } from "@prisma/client";
import type { NextRequest } from "next/server";

export { AuditAction };

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS HTTP
───────────────────────────────────────────────────────────────────────────── */

export function extractIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

export function extractUserAgent(req: NextRequest): string | null {
  return req.headers.get("user-agent") ?? null;
}

/**
 * Décode un JWT et retourne le champ `id` du payload.
 * Retourne null si absent, malformé ou si id n'est pas un number.
 * Ne throw jamais.
 */
function decodeJwtId(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1]!, "base64url").toString("utf8"),
    );
    return typeof payload?.id === "number" ? payload.id : null;
  } catch {
    return null;
  }
}

/**
 * getUserIdFromRequest — extrait le userId depuis la requête.
 *
 * Ordre de lecture (premier trouvé gagne) :
 *   1. Header Authorization: Bearer <jwt>
 *      → utilisé par les appels API depuis le frontend (fetch avec header)
 *   2. Cookie "user_token"
 *      → utilisé par les routes appelées via le browser directement (ex: logout)
 *   3. Cookie "token"
 *      → cookie de compatibilité legacy
 *
 * Retourne null si aucun token valide trouvé. Ne throw jamais.
 */
export function getUserIdFromRequest(req: NextRequest): number | null {
  try {
    // 1. Header Authorization: Bearer <jwt>
    const header = req.headers.get("authorization") ?? "";
    if (header.startsWith("Bearer ")) {
      const id = decodeJwtId(header.slice(7));
      if (id !== null) return id;
    }

    // 2. Cookie "user_token" (stock dashboard)
    const userToken = req.cookies.get("user_token")?.value;
    if (userToken) {
      const id = decodeJwtId(userToken);
      if (id !== null) return id;
    }

    // 3. Cookie "token" (compatibilité legacy)
    const legacyToken = req.cookies.get("token")?.value;
    if (legacyToken) {
      const id = decodeJwtId(legacyToken);
      if (id !== null) return id;
    }

    return null;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   A) AUDIT LOG — auth / RBAC (enum AuditAction strict)
───────────────────────────────────────────────────────────────────────────── */

export interface AuditInput {
  userId:    number;
  action:    AuditAction;
  entity:    string;
  entityId?: number | null;
}

/**
 * auditLog() — écrit dans AuditLog. Ne lève JAMAIS d'exception.
 * Réservé : auth, sessions, users, roles, permissions.
 */
export async function auditLog(
  req: NextRequest | null,
  input: AuditInput,
): Promise<void> {
  try {
    await prisma.auditlog.create({
      data: {
        userId:   input.userId,
        action:   input.action,
        entity:   input.entity,
        entityId: input.entityId ?? null,
      },
      select: { id: true },
    });
  } catch (err) {
    console.error("[auditLog] Write failed:", err);
  }
}

/* Alias auth / RBAC */
export const auditAuth = {
  login:          (req: NextRequest, userId: number) =>
    auditLog(req, { userId, action: AuditAction.LOGIN,          entity: "Auth" }),
  loginFailed:    (req: NextRequest, userId: number) =>
    auditLog(req, { userId, action: AuditAction.LOGIN,          entity: "Auth" }),
  logout:         (req: NextRequest, userId: number) =>
    auditLog(req, { userId, action: AuditAction.LOGOUT,         entity: "Auth" }),
  sessionExpire:  (req: NextRequest, userId: number) =>
    auditLog(req, { userId, action: AuditAction.SESSION_EXPIRE, entity: "Auth" }),
  sessionRevoke:  (req: NextRequest, userId: number) =>
    auditLog(req, { userId, action: AuditAction.SESSION_REVOKE, entity: "Auth" }),
  passwordChange: (req: NextRequest, userId: number) =>
    auditLog(req, { userId, action: AuditAction.UPDATE_USER,    entity: "Auth", entityId: userId }),
};

export const auditUsers = {
  create: (req: NextRequest, actorId: number, targetId: number) =>
    auditLog(req, { userId: actorId, action: AuditAction.CREATE_USER, entity: "User", entityId: targetId }),
  update: (req: NextRequest, actorId: number, targetId: number) =>
    auditLog(req, { userId: actorId, action: AuditAction.UPDATE_USER, entity: "User", entityId: targetId }),
  delete: (req: NextRequest, actorId: number, targetId: number) =>
    auditLog(req, { userId: actorId, action: AuditAction.DELETE_USER, entity: "User", entityId: targetId }),
};

export const auditRoles = {
  create: (req: NextRequest, actorId: number, roleId: number) =>
    auditLog(req, { userId: actorId, action: AuditAction.CREATE_ROLE, entity: "Role", entityId: roleId }),
  update: (req: NextRequest, actorId: number, roleId: number) =>
    auditLog(req, { userId: actorId, action: AuditAction.UPDATE_ROLE, entity: "Role", entityId: roleId }),
  delete: (req: NextRequest, actorId: number, roleId: number) =>
    auditLog(req, { userId: actorId, action: AuditAction.DELETE_ROLE, entity: "Role", entityId: roleId }),
};

export const auditPermissions = {
  create: (req: NextRequest, actorId: number, permId: number) =>
    auditLog(req, { userId: actorId, action: AuditAction.CREATE_PERMISSION, entity: "Permission", entityId: permId }),
  update: (req: NextRequest, actorId: number, permId: number) =>
    auditLog(req, { userId: actorId, action: AuditAction.UPDATE_PERMISSION, entity: "Permission", entityId: permId }),
  delete: (req: NextRequest, actorId: number, permId: number) =>
    auditLog(req, { userId: actorId, action: AuditAction.DELETE_PERMISSION, entity: "Permission", entityId: permId }),
};

/* ─────────────────────────────────────────────────────────────────────────────
   B) ACTIVITY LOG — stock, inventaire, produits, profil (String libre)
───────────────────────────────────────────────────────────────────────────── */

export interface ActivityInput {
  userId:     number;
  action:     string;
  details?:   Record<string, unknown> | string | null;
  ip?:        string | null;
  userAgent?: string | null;
}

/**
 * activityLog() — écrit dans ActivityLog. Ne lève JAMAIS d'exception.
 * Pour : stock, inventaire, produits, profil, paramètres, alertes.
 */
export async function activityLog(
  req: NextRequest | null,
  input: ActivityInput,
): Promise<void> {
  try {
    const ip        = input.ip        ?? (req ? extractIp(req)        : null);
    const userAgent = input.userAgent ?? (req ? extractUserAgent(req) : null);
    const details   = input.details
      ? typeof input.details === "string"
        ? input.details
        : JSON.stringify(input.details)
      : null;

    await prisma.activityLog.create({
      data: {
        userId:    input.userId,
        action:    input.action,
        details,
        ipAddress: ip,
        userAgent,
      },
    });
  } catch (err) {
    console.error("[activityLog] Write failed:", err);
  }
}

/* Alias stock */
export const auditStock = {
  createEntry: (req: NextRequest, actorId: number, batchId: number, details?: Record<string, unknown>) =>
    activityLog(req, { userId: actorId, action: "CREATE_STOCK_ENTRY", details: { batchId, ...details } }),
  updateEntry: (req: NextRequest, actorId: number, batchId: number, details?: Record<string, unknown>) =>
    activityLog(req, { userId: actorId, action: "UPDATE_STOCK_ENTRY", details: { batchId, ...details } }),
  deleteEntry: (req: NextRequest, actorId: number, batchId: number, details?: Record<string, unknown>) =>
    activityLog(req, { userId: actorId, action: "DELETE_STOCK_ENTRY", details: { batchId, ...details } }),
  createExit:  (req: NextRequest, actorId: number, movId: number, details?: Record<string, unknown>) =>
    activityLog(req, { userId: actorId, action: "CREATE_STOCK_EXIT",  details: { movId, ...details } }),
  updateExit:  (req: NextRequest, actorId: number, movId: number, details?: Record<string, unknown>) =>
    activityLog(req, { userId: actorId, action: "UPDATE_STOCK_EXIT",  details: { movId, ...details } }),
  deleteExit:  (req: NextRequest, actorId: number, movId: number, details?: Record<string, unknown>) =>
    activityLog(req, { userId: actorId, action: "DELETE_STOCK_EXIT",  details: { movId, ...details } }),
  adjustment:  (req: NextRequest, actorId: number, productId: number, details?: Record<string, unknown>) =>
    activityLog(req, { userId: actorId, action: "STOCK_ADJUSTMENT",   details: { productId, ...details } }),
};

/* Alias inventaire */
export const auditInventory = {
  count: (req: NextRequest, actorId: number, productId: number, details?: Record<string, unknown>) =>
    activityLog(req, { userId: actorId, action: "INVENTORY_COUNT", details: { productId, ...details } }),
};

/* Alias produits */
export const auditProducts = {
  create: (req: NextRequest, actorId: number, productId: number, details?: Record<string, unknown>) =>
    activityLog(req, { userId: actorId, action: "CREATE_PRODUCT", details: { productId, ...details } }),
  update: (req: NextRequest, actorId: number, productId: number, details?: Record<string, unknown>) =>
    activityLog(req, { userId: actorId, action: "UPDATE_PRODUCT", details: { productId, ...details } }),
  delete: (req: NextRequest, actorId: number, productId: number, details?: Record<string, unknown>) =>
    activityLog(req, { userId: actorId, action: "DELETE_PRODUCT", details: { productId, ...details } }),
};

/* Alias profil */
export const auditProfile = {
  update: (req: NextRequest, userId: number, details?: Record<string, unknown>) =>
    activityLog(req, { userId, action: "PROFILE_UPDATE", details }),
  view:   (req: NextRequest, userId: number) =>
    activityLog(req, { userId, action: "PROFILE_VIEW" }),
};

/* Alias paramètres */
export const auditSettings = {
  update: (req: NextRequest, actorId: number, details?: Record<string, unknown>) =>
    activityLog(req, { userId: actorId, action: "UPDATE_SETTING", details }),
};

/* ─────────────────────────────────────────────────────────────────────────────
   C) Compatibilité rétrograde
───────────────────────────────────────────────────────────────────────────── */

/** @deprecated Utiliser activityLog() directement. */
export async function audit(
  req: NextRequest | null,
  input: {
    userId:     number;
    action:     unknown;
    entity?:    string;
    entityId?:  number | null;
    details?:   Record<string, unknown> | string | null;
  },
): Promise<{ id: number } | null> {
  await activityLog(req, {
    userId:  input.userId,
    action:  String(input.action),
    details: input.details ?? { entity: input.entity, entityId: input.entityId },
  });
  return null;
}

export async function logAuditEvent({
  userId, action, entityType, entityId, changes, ipAddress,
}: {
  userId:      number;
  action:      string;
  entityType?: string;
  entityId?:   number;
  changes?:    unknown;
  ipAddress?:  string;
}) {
  return prisma.activity_logs.create({
    data: {
      user_id:     userId,
      action,
      entity_type: entityType ?? null,
      entity_id:   entityId   ?? null,
      changes:     changes ? JSON.stringify(changes) : undefined,
      ip_address:  ipAddress  ?? null,
    },
  });
}

export async function getAuditLogs(limit = 100) {
  return prisma.activity_logs.findMany({
    orderBy: { created_at: "desc" },
    take:    limit,
  });
}
