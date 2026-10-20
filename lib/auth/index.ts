/**
 * JWT Authentication utilities
 */

import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { env } from '../env';

export type UserRole = 'ADMIN' | 'STOCK_MANAGER' | 'KITCHEN_STAFF' | 'CASHIER';

export interface JWTPayload {
  id: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    payload, 
    env.jwt.secret as Secret, 
    { expiresIn: env.jwt.expiresIn || '24h' } as any
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, env.jwt.secret as Secret) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Hash password (bcrypt would be preferred in production)
 * For now, using a simple method - should be replaced with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  // In production, use bcrypt:
  // import bcrypt from 'bcrypt';
  // return bcrypt.hash(password, 10);

  // For this implementation, we'll use bcrypt
  const crypto = require('crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return `${salt}$${hash}`;
}

/**
 * Verify password
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const crypto = require('crypto');
  const [salt, storedHash] = hash.split('$');
  const computedHash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return computedHash === storedHash;
}
