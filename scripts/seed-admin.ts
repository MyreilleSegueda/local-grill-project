import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Création des permissions
  const permissions = [
    { name: 'admin:access', description: 'Accès administration' },
    { name: 'user:create', description: 'Créer un utilisateur' },
    { name: 'user:update', description: 'Modifier un utilisateur' },
    { name: 'user:delete', description: 'Supprimer un utilisateur' },
    { name: 'role:create', description: 'Créer un rôle' },
    { name: 'role:update', description: 'Modifier un rôle' },
    { name: 'role:delete', description: 'Supprimer un rôle' },
    { name: 'audit:view', description: 'Voir les logs d’audit' },
  ];
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  // Création du rôle admin
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });

  // Attribution des permissions au rôle admin
  for (const perm of permissions) {
    const permission = await prisma.permission.findUnique({ where: { name: perm.name } });
    if (permission) {
      await prisma.rolepermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: permission.id },
      });
    }
  }

  // Création du tenant principal
  const tenant = await prisma.tenant.upsert({
    where: { name: 'localgrill' },
    update: {},
    create: { name: 'localgrill' },
  });

  // Création de l’utilisateur admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@localgrill.com' },
    update: {},
    create: {
      email: 'admin@localgrill.com',
      passwordHash: '$2b$10$adminhashedpassword', // Remplacer par un hash réel
      fullName: 'Admin LocalGrill',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Liaison adminUser au tenant
  await prisma.tenantuser.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: adminUser.id } },
    update: {},
    create: { tenantId: tenant.id, userId: adminUser.id },
  });

  // Liaison adminUser au rôle admin
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
}

main()
  .then(() => {
    console.log('Seed admin terminé');
    prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
