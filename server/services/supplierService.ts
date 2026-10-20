import { prisma } from '@/server/db/prisma';

export async function getSuppliers() {
  return prisma.suppliers.findMany({ orderBy: { name: 'asc' } });
}

export async function createSupplier({ name, contact_name, email, phone, address, city }: { name: string; contact_name?: string; email?: string; phone?: string; address?: string; city?: string }) {
  return prisma.suppliers.create({
    data: { name, contact_name, email, phone, address, city },
  });
}

export async function updateSupplier(id: number, { name, contact_name, email, phone, address, city, is_active }: { name: string; contact_name?: string; email?: string; phone?: string; address?: string; city?: string; is_active?: boolean }) {
  return prisma.suppliers.update({
    where: { id },
    data: { name, contact_name, email, phone, address, city, is_active },
  });
}

export async function deleteSupplier(id: number) {
  await prisma.suppliers.delete({ where: { id } });
  return true;
}
