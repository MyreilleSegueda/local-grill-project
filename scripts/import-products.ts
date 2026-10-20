/**
 * Script d'importation bulk des produits (Viandes & Poissons)
 * À exécuter avec: npx ts-node scripts/import-products.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration des catégories et unités
const CATEGORIES = {
  VIANDES: 1,
  POISSONS: 8,
};

const UNITE_KG = 1;
const STOCK_MIN_DEFAULT = 10;

// Liste des produits à importer avec leur catégorie
const productsToImport = [
  // POISSONS (catégorie 8)
  { name: 'CAPITAINE', categoryId: CATEGORIES.POISSONS },
  { name: 'CARPES', categoryId: CATEGORIES.POISSONS },
  { name: 'SOL', categoryId: CATEGORIES.POISSONS },
  { name: 'FILET DE CAPITAINE', categoryId: CATEGORIES.POISSONS },
  { name: 'BROCHETTE DE CAPITAINE', categoryId: CATEGORIES.POISSONS },
  { name: 'CHOUKOUYA', categoryId: CATEGORIES.POISSONS },
  { name: 'SOUPE PECHEUR', categoryId: CATEGORIES.POISSONS },
  { name: 'LANGOUSTE', categoryId: CATEGORIES.POISSONS },
  { name: 'POISSON THON', categoryId: CATEGORIES.POISSONS },
  { name: 'AILLERONS', categoryId: CATEGORIES.POISSONS },
  { name: 'GAMBAS', categoryId: CATEGORIES.POISSONS },
  
  // VIANDES (catégorie 1)
  { name: 'POULET SAUTE', categoryId: CATEGORIES.VIANDES },
  { name: 'PINTADE', categoryId: CATEGORIES.VIANDES },
  { name: 'FILET DE BŒUF', categoryId: CATEGORIES.VIANDES },
  { name: 'BROCHETTE DE BŒUF', categoryId: CATEGORIES.VIANDES },
  { name: 'MERGUEZ DE BŒUF', categoryId: CATEGORIES.VIANDES },
  { name: 'MERGUEZ DE POULET', categoryId: CATEGORIES.VIANDES },
  { name: 'CAILLE', categoryId: CATEGORIES.VIANDES },
  { name: 'SOSSO', categoryId: CATEGORIES.VIANDES },
  { name: 'SAUCISSE VOLAILLE', categoryId: CATEGORIES.VIANDES },
  { name: 'SAUCISSE TOULOUSE', categoryId: CATEGORIES.VIANDES },
  { name: 'MOUTON FRIT', categoryId: CATEGORIES.VIANDES },
  { name: 'POULET PANE', categoryId: CATEGORIES.VIANDES },
  { name: 'POULET PIQUET', categoryId: CATEGORIES.VIANDES },
  { name: 'PAVE DE POULET', categoryId: CATEGORIES.VIANDES },
  { name: 'BROCHETTES DE POULET', categoryId: CATEGORIES.VIANDES },
];

async function importProducts() {
  const now = new Date();
  const results = {
    created: [] as string[],
    skipped: [] as string[],
    errors: [] as { name: string; error: string }[],
  };

  console.log(`🚀 Début de l'importation de ${productsToImport.length} produits...\n`);

  for (const product of productsToImport) {
    try {
      // Vérifier si le produit existe déjà (par nom exact)
      const existing = await prisma.products.findFirst({
        where: {
          name: product.name,
        },
      });

      if (existing) {
        console.log(`⚠️  "${product.name}" existe déjà (ID: ${existing.id})`);
        results.skipped.push(product.name);
        continue;
      }

      // Créer le produit dans une transaction
      const newProduct = await prisma.$transaction(async (tx) => {
        // 1. Créer le produit
        const created = await tx.products.create({
          data: {
            name: product.name,
            category_id: product.categoryId,
            unit_id: UNITE_KG,
            minimum_stock: new Prisma.Decimal(STOCK_MIN_DEFAULT),
            is_perishable: true, // Tous ces produits sont périssables
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        });

        // 2. Créer le snapshot d'inventaire avec quantité 0
        await tx.inventory_snapshots.create({
          data: {
            product_id: created.id,
            theoretical_quantity: new Prisma.Decimal(0),
            real_quantity: new Prisma.Decimal(0),
            difference: new Prisma.Decimal(0),
            total_value: new Prisma.Decimal(0),
            last_updated_at: now,
          },
        });

        return created;
      });

      const categoryLabel = product.categoryId === CATEGORIES.POISSONS ? '🐟' : '🥩';
      console.log(`✅ ${categoryLabel} "${product.name}" créé (ID: ${newProduct.id})`);
      results.created.push(product.name);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Erreur pour "${product.name}": ${errorMessage}`);
      results.errors.push({ name: product.name, error: errorMessage });
    }
  }

  // Résumé
  console.log('\n' + '='.repeat(50));
  console.log('📊 RÉSUMÉ DE L\'IMPORTATION');
  console.log('='.repeat(50));
  console.log(`✅ Créés: ${results.created.length}`);
  console.log(`⚠️  Ignorés (existants): ${results.skipped.length}`);
  console.log(`❌ Erreurs: ${results.errors.length}`);
  
  if (results.created.length > 0) {
    console.log('\n🐟 Poissons:', results.created.filter((_, i) => productsToImport[i]?.categoryId === CATEGORIES.POISSONS).length);
    console.log('🥩 Viandes:', results.created.filter((_, i) => productsToImport[i]?.categoryId === CATEGORIES.VIANDES).length);
  }

  if (results.errors.length > 0) {
    console.log('\n❌ Erreurs rencontrées:');
    results.errors.forEach(e => console.log(`   - ${e.name}: ${e.error}`));
  }
}

// Exécuter l'importation
importProducts()
  .catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
