/**
 * Zod validation schemas for all API inputs
 */

import { z } from 'zod';

// ============================================
// AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(3, 'Full name is required'),
});

// ============================================
// PRODUCT SCHEMAS
// ============================================

export const createProductSchema = z.object({
  name: z.string().min(3, 'Product name is required'),
  category_id: z.number().int().positive(),
  unit_id: z.number().int().positive(),
  supplier_id: z.number().int().positive().optional(),
  sku: z.string().min(3, 'SKU is required').optional(),
  description: z.string().optional(),
  minimum_stock: z.number().positive('Minimum stock must be positive'),
  is_perishable: z.boolean().default(false),
});

export const updateProductSchema = createProductSchema.partial();

// ============================================
// STOCK BATCH SCHEMAS
// ============================================

export const createStockBatchSchema = z.object({
  product_id: z.number().int().positive(),
  batch_number: z.string().min(3, 'Batch number is required'),
  quantity_initial: z.number().positive('Quantity must be positive'),
  quantity_remaining: z.number().positive().optional(),
  purchase_price: z.number().positive('Price must be positive'),
  entry_date: z.coerce.date(),
  expiration_date: z.coerce.date().optional(),
  notes: z.string().optional(),
});

// ============================================
// STOCK MOVEMENT SCHEMAS
// ============================================

export const createStockMovementSchema = z.object({
  product_id: z.number().int().positive(),
  batch_id: z.number().int().positive().optional(),
  type: z.enum(['IN', 'OUT', 'LOSS', 'EXPIRED', 'ADJUSTMENT']),
  quantity: z.number().positive('Quantity must be positive'),
  reason: z.string().optional(),
  reference_number: z.string().optional(),
});

// ============================================
// INVENTORY COUNT SCHEMA
// ============================================

export const createInventoryCountSchema = z.object({
  product_id: z.number().int().positive(),
  real_quantity: z.number().nonnegative('Quantity cannot be negative'),
  notes: z.string().optional(),
});

// ============================================
// CONSUMPTION DECLARATION SCHEMA
// ============================================

export const createConsumptionSchema = z.object({
  product_id: z.number().int().positive(),
  quantity_consumed: z.number().positive('Quantity must be positive'),
  notes: z.string().optional(),
});

// ============================================
// SUPPLIER SCHEMAS
// ============================================

export const createSupplierSchema = z.object({
  name: z.string().min(3, 'Supplier name is required'),
  contact_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
});

// ============================================
// Export types
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateStockBatchInput = z.infer<typeof createStockBatchSchema>;
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
export type CreateInventoryCountInput = z.infer<typeof createInventoryCountSchema>;
export type CreateConsumptionInput = z.infer<typeof createConsumptionSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
