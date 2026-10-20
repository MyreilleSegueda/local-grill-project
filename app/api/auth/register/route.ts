
/**
 * API Route: POST /api/auth/register
 * Registers a new user (Admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validators';
import { register } from '@/lib/services/authService';
import { errorResponse, successResponse, getAuthUser, hasRole } from '@/lib/auth/request';

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const user = await getAuthUser(request);
    if (!user || !hasRole(user.role, ['ADMIN'])) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(parsed.error.issues[0]?.message || 'Validation error'),
        { status: 400 }
      );
    }

    // Create user
    const newUser = await register({
      email: parsed.data.email,
      password: parsed.data.password,
      full_name: parsed.data.full_name,
      role: body.role || 'KITCHEN_STAFF',
    });
    return NextResponse.json(successResponse(newUser, 'User created successfully'));
  } catch (error: any) {
    console.error('Registration error:', error);
    const message = error.message || 'An error occurred during registration';
    return NextResponse.json(
      errorResponse(message),
      { status: error.message?.includes('already exists') ? 409 : 500 }
    );
  }
}
