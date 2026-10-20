import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import {
  getProductById,
  updateProduct,
  deleteProduct,
} from "@/lib/services/productService";

import { updateProductSchema } from "@/lib/validators";

import {
  errorResponse,
  successResponse,
  getAuthUser,
  hasRole,
} from "@/lib/auth/request";

/* ================= GET PRODUCT ================= */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const { id: idStr } = await context.params;
    const id = Number(idStr);

    if (isNaN(id)) {
      return NextResponse.json(errorResponse("Invalid product ID"), { status: 400 });
    }

    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json(errorResponse("Product not found"), { status: 404 });
    }

    return NextResponse.json(successResponse(product));
  } catch (error) {
    return NextResponse.json(errorResponse("Server error"), { status: 500 });
  }
}

/* ================= UPDATE PRODUCT ================= */

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);

    if (!user || !hasRole(user.role, ["ADMIN", "STOCK_MANAGER"])) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 403 });
    }

    const { id: idStr } = await context.params;
    const id = Number(idStr);

    if (isNaN(id)) {
      return NextResponse.json(errorResponse("Invalid product ID"), { status: 400 });
    }

    const body = await request.json();

    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(parsed.error.issues[0]?.message || "Validation error"),
        { status: 400 }
      );
    }

    const updateData = {
      ...parsed.data,
      minimum_stock:
        parsed.data.minimum_stock !== undefined
          ? new Prisma.Decimal(parsed.data.minimum_stock)
          : undefined,
    };

    const updated = await updateProduct(id, updateData);

    if (!updated) {
      return NextResponse.json(errorResponse("Product not found"), { status: 404 });
    }

    return NextResponse.json(successResponse(updated));
  } catch (error) {
    return NextResponse.json(errorResponse("Server error"), { status: 500 });
  }
}

/* ================= SOFT DELETE ================= */

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);

    if (!user || !hasRole(user.role, ["ADMIN", "STOCK_MANAGER"])) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 403 });
    }

    const { id: idStr } = await context.params;
    const id = Number(idStr);

    if (isNaN(id)) {
      return NextResponse.json(errorResponse("Invalid product ID"), { status: 400 });
    }

    const deleted = await deleteProduct(id);

    if (!deleted) {
      return NextResponse.json(errorResponse("Product not found"), { status: 404 });
    }

    return NextResponse.json(
      successResponse({
        message: "Product deactivated successfully",
        deactivated: true,
      })
    );
  } catch (error) {
    return NextResponse.json(errorResponse("Server error"), { status: 500 });
  }
}