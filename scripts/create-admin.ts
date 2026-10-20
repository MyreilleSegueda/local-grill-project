import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@localgrill-bf.com';
  const passwordHash = await bcrypt.hash('LocalGrill@2026!', 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      fullName: 'Admin LocalGrill',
      status: 'ACTIVE',
    },
    create: {
      email,
      passwordHash,
      fullName: 'Admin LocalGrill',
      status: 'ACTIVE',
    },
  });

  const role = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: role.id,
    },
  });

  console.log('Administrateur créé et rôle attribué.');
  console.log('Email :', email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
