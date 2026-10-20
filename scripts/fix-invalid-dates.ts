import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixInvalidDates() {
  const now = new Date();
  const minValidDate = new Date('2000-01-02');

  await prisma.categories.updateMany({
    where: {
      updated_at: { lt: minValidDate },
    },
    data: { updated_at: now },
  });

  await prisma.products.updateMany({
    where: {
      updated_at: { lt: minValidDate },
    },
    data: { updated_at: now },
  });

  await prisma.suppliers.updateMany({
    where: {
      updated_at: { lt: minValidDate },
    },
    data: { updated_at: now },
  });

  await prisma.stock_batches.updateMany({
    where: {
      updated_at: { lt: minValidDate },
    },
    data: { updated_at: now },
  });

  await prisma.inventory_snapshots.updateMany({
    where: {
      last_updated_at: { lt: minValidDate },
    },
    data: { last_updated_at: now },
  });

  await prisma.$disconnect();
  console.log('Dates invalides corrigées.');
}

fixInvalidDates().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
