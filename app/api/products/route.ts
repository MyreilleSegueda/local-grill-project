
/**
 * API Route: GET /api/products
 * Fetches all products with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts, getAllCategories, getAllUnits } from '@/lib/services/productService';
import { errorResponse, successResponse, getAuthUser } from '@/lib/auth/request';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    if (searchParams.get('units') === '1') {
      const units = await getAllUnits();
      return NextResponse.json(successResponse({ units }));
    }

    const search = searchParams.get('search') || undefined;
    const categoryId = searchParams.get('category_id')
      ? parseInt(searchParams.get('category_id')!)
      : undefined;

    // Fetch data
    const [products, categories, units] = await Promise.all([
      getAllProducts(search, categoryId),
      getAllCategories(),
      getAllUnits(),
    ]);

    return NextResponse.json(
      successResponse({
        products,
        categories,
        units,
        filters: {
          search,
          categoryId,
        },
      })
    );
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      errorResponse('An error occurred while fetching products'),
      { status: 500 }
    );
  }
}
