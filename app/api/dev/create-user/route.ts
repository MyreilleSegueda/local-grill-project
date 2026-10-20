
import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { register } from '@/lib/services/authService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, password, full_name, role } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Création utilisateur via Prisma
    const user = await register({ email, password, full_name, role });
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      userId: user.id,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


/*curl -X POST https://gestion.localgrill-bf.com/api/dev/create-user ^
-H "Content-Type: application/json" ^
-d "{\"email\":\"tindanofernandamed@gmail.com\",\"password\":\"70347077\",\"full_name\":\"Admin User\",\"role\":\"ADMIN\"}"
*/