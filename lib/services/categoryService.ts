import { prisma } from '@/server/db/prisma';
import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export type Category = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export async function getAllCategories(): Promise<Category[]> {
  return prisma.categories.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' },
  });
}

export async function getCategoryById(id: number): Promise<Category | null> {
  return prisma.categories.findUnique({ where: { id } });
}

export async function createCategory(input: unknown): Promise<Category> {
  const { name, description } = categorySchema.parse(input);
  return prisma.categories.create({
    data: { name, description: description || null },
  });
}

export async function updateCategory(id: number, input: unknown): Promise<Category> {
  const { name, description, is_active } = categorySchema.extend({ is_active: z.boolean().optional() }).parse(input);
  return prisma.categories.update({
    where: { id },
    data: {
      name,
      description: description || null,
      ...(is_active !== undefined ? { is_active } : {}),
    },
  });
}

export async function deleteCategory(id: number): Promise<boolean> {
  await prisma.categories.delete({ where: { id } });
  return true;
}
