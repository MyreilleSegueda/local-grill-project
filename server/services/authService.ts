/**
 * server/services/authService.ts
 *
 * SOURCE UNIQUE DE VÉRITÉ pour l'auth.
 * Importé par :
 *   - app/api/auth/login/route.ts             → pose user_token
 *   - app/api/auth/me/route.ts                → rafraîchit user + permissions
 *   - app/api/admin/auth/login/route.ts       → étape 1 admin (creds + OTP)
 *   - app/api/admin/auth/verify-otp/route.ts  → étape 2 admin (pose admin_token)
 *
 * ⚠️  signJwt embarque TOUJOURS { id, email, role, roles[], permissions[] }
 */
import bcrypt        from "bcryptjs";
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import type { StringValue }       from "ms";
import { prisma }    from "@/lib/prisma";
import { sendMail }  from "@/server/services/mailService";

const JWT_SECRET     = process.env.JWT_SECRET     ?? "change-me-in-production";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "8h") as StringValue;
const OTP_EXPIRY_MIN = 10;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface JwtPayload {
  id:          number;
  email:       string;
  role:        string;
  roles:       string[];
  permissions: string[];
}

export interface UserData {
  id:          number;
  email:       string;
  fullName:    string;
  full_name:   string;
  role:        string;
  roles:       string[];
  permissions: string[];
  status:      string;
  isActive:    boolean;
}

// ─── Password ─────────────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT ──────────────────────────────────────────────────────────────────────
export function signJwt(payload: JwtPayload): string {
  const secret: Secret       = JWT_SECRET;
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, secret, options);
}
export function verifyJwt(token: string): JwtPayload | null {
  try   { return jwt.verify(token, JWT_SECRET) as JwtPayload; }
  catch { return null; }
}

// ─── OTP ──────────────────────────────────────────────────────────────────────
export async function generateOtp(userId: number, email: string): Promise<void> {
  const otp       = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash  = await bcrypt.hash(otp, 12);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60_000);
  await prisma.otpcode.deleteMany({ where: { userId } });
  await prisma.otpcode.create({ data: { userId, codeHash, expiresAt } });
  await sendMail({
    to:      email,
    subject: "Votre code OTP — Local Grill Admin",
    html: `<div style="font-family:sans-serif">
      <h2 style="color:#1e293b">Code de vérification</h2>
      <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#4F46E5;padding:16px 0">${otp}</div>
      <p style="color:#64748b">Expire dans <strong>${OTP_EXPIRY_MIN} minutes</strong>.</p>
    </div>`,
  });
}
export async function verifyOtp(userId: number, code: string): Promise<boolean> {
  const otp = await prisma.otpcode.findFirst({
    where:   { userId, expiresAt: { gte: new Date() } },
    orderBy: { expiresAt: "desc" },
  });
  if (!otp) return false;
  const valid = await bcrypt.compare(code, otp.codeHash);
  if (valid) await prisma.otpcode.deleteMany({ where: { userId } });
  return valid;
}

// ─── Loaders Prisma ───────────────────────────────────────────────────────────
const userInclude = {
  userpermission: {
    include: { permission: true },
  },
  userRoles: {
    include: {
      role: {
        include: { rolepermission: { include: { permission: true } } },
      },
    },
  },
} as const;

export async function loadUserWithPermissions(userId: number) {
  return prisma.user.findUnique({ where: { id: userId }, include: userInclude });
}
export async function loadUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email }, include: userInclude });
}

// ─── Builder UserData + JwtPayload ────────────────────────────────────────────
type PrismaUserFull = NonNullable<Awaited<ReturnType<typeof loadUserWithPermissions>>>;

export function buildUserData(user: PrismaUserFull): { userData: UserData; jwtPayload: JwtPayload } {
  const roles       = user.userRoles.map(ur => ur.role.name.trim().toUpperCase());
  const permSet     = new Set<string>();
  for (const ur of user.userRoles)
    for (const rp of ur.role.rolepermission)
      permSet.add(rp.permission.name.trim().toUpperCase());
  for (const up of user.userpermission)
    permSet.add(up.permission.name.trim().toUpperCase());

  const permissions = Array.from(permSet);
  const primaryRole = roles[0] ?? "USER";

  return {
    userData: {
      id: user.id, email: user.email,
      fullName: user.fullName, full_name: user.fullName,
      role: primaryRole, roles, permissions,
      status: user.status, isActive: user.status === "ACTIVE",
    },
    jwtPayload: {
      id: user.id, email: user.email,
      role: primaryRole, roles, permissions,
    },
  };
}
