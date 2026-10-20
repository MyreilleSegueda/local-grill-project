/**
 * Request/Response types and utilities
 */

import { NextRequest } from 'next/server';
import { JWTPayload, extractToken, verifyToken } from './index';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  message?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Create error response
 */
export function errorResponse(error: string): ApiResponse {
  return {
    success: false,
    error,
  };
}

/**
 * Extract authenticated user from request
 */
export async function getAuthUser(
  request: NextRequest
): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('authorization');
  const token = extractToken(authHeader || '');

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  const normalizedRole = userRole.trim().toUpperCase();
  return requiredRoles.some((role) => role.trim().toUpperCase() === normalizedRole);
}
