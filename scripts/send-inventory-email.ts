/**
 * Script manuel pour envoyer l'inventaire par email
 * Usage: npx ts-node scripts/send-inventory-email.ts
 * 
 * Ce script envoie le rapport d'inventaire à tous les utilisateurs
 * ayant la permission INVENTORY_VIEW.
 */

import { sendMonthlyInventoryEmail } from '../lib/services/inventoryMailService';

async function main() {
  console.log('📧 Envoi du rapport d\'inventaire...\n');
  
  try {
    const result = await sendMonthlyInventoryEmail();
    
    if (result.success) {
      console.log('✅ Succès:', result.message);
      console.log(`📊 Recipients: ${result.recipients}`);
      if (result.errors && result.errors.length > 0) {
        console.log('\n⚠️  Erreurs partielles:');
        result.errors.forEach(err => console.log(`   - ${err}`));
      }
    } else {
      console.error('❌ Échec:', result.message);
      if (result.errors) {
        result.errors.forEach(err => console.error(`   - ${err}`));
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

main();
