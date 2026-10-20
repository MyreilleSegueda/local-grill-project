/**
 * server/services/authService.ts
 *
 * CRITIQUE : loadUserWithPermissions() doit retourner les permissions
 * avec leur nom réel depuis la DB (READ_STOCK, WRITE_STOCK, etc.)
 * via Permission.name (@@map("permission")).
 *
 * buildUserData() construit le payload JWT ET l'objet UserData avec
 * permissions[] = noms des permissions DB bruts.
 */
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt               from "bcryptjs";
import { prisma }           from "@/lib/prisma";
import type { StringValue } from "ms";

const JWT_SECRET     = process.env.JWT_SECRET ?? "changeme-secret-very-long";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "8h") as StringValue;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface JwtPayload {
  id:          number;
  email:       string;
  fullName:    string;
  role:        string;
  roles:       string[];
  permissions: string[];   // noms bruts DB : READ_STOCK, WRITE_STOCK, etc.
  status:      string;
}

export interface UserData {
  id:          number;
  email:       string;
  fullName:    string;
  full_name:   string;
  role:        string;
  roles:       string[];
  permissions: string[];   // noms bruts DB : READ_STOCK, WRITE_STOCK, etc.
  status:      string;
  isActive:    boolean;
}

// ─── JWT ──────────────────────────────────────────────────────────────────────
export function signJwt(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Password ─────────────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Chargement utilisateur complet ──────────────────────────────────────────
// Charge User + tous ses rôles + toutes ses permissions
// (via UserRole→Role→RolePermission→Permission ET UserPermission→Permission)
export async function loadUserWithPermissions(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolepermission: {
                include: {
                  permission: true,  // Permission.name = valeur DB brute
                },
              },
            },
          },
        },
      },
      userpermission: {
        include: {
          permission: true,          // permissions directes sur l'user
        },
      },
    },
  });
}

type UserWithRelations = NonNullable<Awaited<ReturnType<typeof loadUserWithPermissions>>>;

// ─── Construction du UserData ─────────────────────────────────────────────────
export function buildUserData(user: UserWithRelations): {
  userData:    UserData;
  jwtPayload:  JwtPayload;
} {
  // Rôles
  const roles = user.userRoles.map(ur => ur.role.name);

  // Permissions via rôles (dédupliquées)
  const permFromRoles = user.userRoles.flatMap(ur =>
    ur.role.rolepermission.map(rp => rp.permission.name)
  );

  // Permissions directes sur l'user
  const permDirect = user.userpermission.map(up => up.permission.name);

  // Union dédupliquée — valeurs brutes DB : "READ_STOCK", "WRITE_STOCK", etc.
  const permissions = [...new Set([...permFromRoles, ...permDirect])];

  // Rôle principal (premier rôle ou "USER")
  const primaryRole = roles[0] ?? "USER";

  const userData: UserData = {
    id:          user.id,
    email:       user.email,
    fullName:    user.fullName,
    full_name:   user.fullName,
    role:        primaryRole,
    roles,
    permissions,
    status:      user.status,
    isActive:    user.status === "ACTIVE",
  };

  const jwtPayload: JwtPayload = {
    id:          user.id,
    email:       user.email,
    fullName:    user.fullName,
    role:        primaryRole,
    roles,
    permissions,
    status:      user.status,
  };

  return { userData, jwtPayload };
}
