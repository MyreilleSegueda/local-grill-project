import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  {
    name: "CUISINE_VIEW",
    description: "Consulter la rubrique Cuisine",
  },
  {
    name: "CUISINE_SERVE",
    description: "Enregistrer les quantites servies en Cuisine",
  },
  {
    name: "CUISINE_RETURN",
    description: "Enregistrer les retours de Cuisine au magasin",
  },
  {
    name: "STORE_VIEW",
    description: "Consulter le stock et les retours du Magasin",
  },
  {
    name: "STORE_TRANSFER",
    description: "Transférer le stock Magasin vers la Cuisine",
  },
  {
    name: "STORE_RECEIVE",
    description: "Contrôler et réceptionner les retours Cuisine au Magasin",
  },
  {
    name: "STORE_RETURN_STOCK",
    description: "Transférer le stock Magasin vers le stock général",
  },
] as const;

async function main() {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });

    console.log(`Permission ready: ${permission.name}`);
  }
}

main()
  .catch((error) => {
    console.error("Failed to initialize Cuisine and Magasin permissions:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
