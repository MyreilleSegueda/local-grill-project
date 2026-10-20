
/**
 * API Route: POST /api/products
 * Creates a new product
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProductSchema } from '@/lib/validators';
import { createProduct } from '@/lib/services/productService';
import { updateInventorySnapshot } from '@/lib/services/inventoryService';
import { errorResponse, successResponse, getAuthUser, hasRole } from '@/lib/auth/request';
import { Prisma } from '@prisma/client'; // <- pour Decimal

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const user = await getAuthUser(request);
    if (!user || !hasRole(user.role, ['ADMIN', 'STOCK_MANAGER'])) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(parsed.error.issues[0]?.message || 'Validation error'),
        { status: 400 }
      );
    }

    // Create product
    // Prisma minimum_stock is Decimal, so convert number to string
    const product = await createProduct({
      name: parsed.data.name,
      category_id: parsed.data.category_id,
      unit_id: parsed.data.unit_id,
      minimum_stock: new Prisma.Decimal(parsed.data.minimum_stock),
      is_perishable: parsed.data.is_perishable,
      supplier_id: parsed.data.supplier_id ?? null,
      sku: parsed.data.sku ?? null,
      description: parsed.data.description ?? null,
    });

    // Ajout automatique d'un snapshot d'inventaire pour ce produit
    await updateInventorySnapshot(product.id);

    return NextResponse.json(
      successResponse(
        { id: product.id },
        'Product created successfully'
      ),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      errorResponse('An error occurred while creating product'),
      { status: 500 }
    );
  }
}
