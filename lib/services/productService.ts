/**
 * Product Service
 * Manages products, categories, suppliers, units
 */

import { prisma } from '@/server/db/prisma';

export type Product = import('@prisma/client').products;
export type Category = import('@prisma/client').categories;
export type Unit = import('@prisma/client').units;

/* ================= PRODUCTS ================= */

export async function getAllProducts(search?: string, categoryId?: number): Promise<Product[]> {
  return prisma.products.findMany({
    where: {
      is_active: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { sku: { contains: search } },
            ],
          }
        : {}),
      ...(categoryId ? { category_id: categoryId } : {}),
    },
    include: {
      category: true,
      unit: true,
      supplier: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getProductById(id: number): Promise<Product | null> {
  return prisma.products.findFirst({
    where: {
      id,
      is_active: true,
    },
    include: {
      category: true,
      unit: true,
      supplier: true,
      stock_batches: true,
    },
  });
}

export async function createProduct(
  data: Omit<Product, "id" | "created_at" | "updated_at" | "is_active">
): Promise<Product> {
  return prisma.products.create({
    data: {
      ...data,
      is_active: true,
    },
  });
}

export async function updateProduct(id: number, updates: Partial<Product>): Promise<Product | null> {
  const product = await prisma.products.findUnique({
    where: { id },
  });

  if (!product || !product.is_active) {
    return null;
  }

  return prisma.products.update({
    where: { id },
    data: updates,
  });
}

/* ================= SOFT DELETE ================= */

export async function deleteProduct(id: number): Promise<boolean> {
  const product = await prisma.products.findUnique({
    where: { id },
  });

  if (!product) {
    return false;
  }

  await prisma.products.update({
    where: { id },
    data: {
      is_active: false,
    },
  });

  return true;
}

/* ================= CATEGORIES ================= */

export async function getAllCategories(): Promise<Category[]> {
  return prisma.categories.findMany({
    where: { is_active: true },
    orderBy: { name: "asc" },
  });
}

/* ================= UNITS ================= */

export async function getAllUnits(): Promise<Unit[]> {
  return prisma.units.findMany({
    orderBy: { name: "asc" },
  });
}

/* ================= PRODUCTS BY CATEGORY ================= */

export async function getProductsByCategory(categoryId: number) {
  return prisma.products.findMany({
    where: {
      category_id: categoryId,
      is_active: true,
    },
    include: {
      category: true,
      unit: true,
      stock_batches: true,
    },
    orderBy: { name: "asc" },
  });
}

/* ================= LOW STOCK ================= */

export async function getLowStockProducts() {
  const products = await prisma.products.findMany({
    where: { is_active: true },
    include: {
      stock_batches: true,
      category: true,
      unit: true,
    },
  });

  return products.filter((p) => {
    const current_quantity = p.stock_batches.reduce(
      (sum, b) => sum + Number(b.quantity_remaining),
      0
    );

    return current_quantity < Number(p.minimum_stock);
  });
}

/* ================= PERISHABLE ================= */

export async function getPerishableProductsInventory() {
  return prisma.stock_batches.findMany({
    where: {
      product: {
        is_perishable: true,
        is_active: true,
      },
      quantity_remaining: { gt: 0 },
    },
    include: {
      product: {
        include: {
          category: true,
          unit: true,
        },
      },
    },
    orderBy: {
      expiration_date: "asc",
    },
  });
}