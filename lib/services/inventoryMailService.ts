/**
 * Service d'envoi d'inventaire par email
 * Envoie le rapport d'inventaire mensuel aux utilisateurs avec INVENTORY_VIEW
 */

import { prisma } from '@/lib/prisma';
import { sendMail } from '@/server/services/mailService';
import type { InventoryExportItem } from '@/lib/templates/pdfExportTemplate';

interface InventoryItem {
  product_id: number;
  product_name: string;
  category_name: string;
  physical_quantity: number;
  theoretical_quantity: number;
  unit_abbreviation?: string | null;
  unit_name?: string | null;
  minimum_stock?: number | null;
  variance: number;
  variance_percentage: number;
  last_count_date: string | null;
  total_value: number;
}

interface UserWithInventoryPermission {
  id: number;
  email: string;
  fullName: string;
}

const BRAND = {
  name: "Local Grill Restaurant",
  tagline: "Système de gestion de stock",
  primary: [124, 58, 237] as [number, number, number],
  dark: [26, 23, 20] as [number, number, number],
  light: [250, 248, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  green: [6, 95, 70] as [number, number, number],
  greenBg: [236, 253, 245] as [number, number, number],
  amber: [146, 64, 14] as [number, number, number],
  amberBg: [255, 251, 235] as [number, number, number],
  red: [153, 27, 27] as [number, number, number],
  redBg: [254, 242, 242] as [number, number, number],
  violet: [76, 29, 149] as [number, number, number],
  violetBg: [245, 243, 255] as [number, number, number],
  border: [232, 228, 221] as [number, number, number],
  text2: [107, 101, 96] as [number, number, number],
  text3: [155, 149, 145] as [number, number, number],
};

function stockStatus(item: InventoryItem) {
  if ((item.physical_quantity ?? 0) <= 0)
    return { label: "Épuisé", color: "red", tag: "tag-red" };
  if (item.minimum_stock != null && item.physical_quantity <= item.minimum_stock)
    return { label: "Stock bas", color: "amber", tag: "tag-amber" };
  return { label: "Disponible", color: "green", tag: "tag-green" };
}

function fmt(d?: string | null): string {
  return d ? new Date(d).toLocaleDateString("fr-FR") : "—";
}

function fmtNum(n: number): string {
  return n.toLocaleString("fr-FR");
}

/**
 * Récupère tous les utilisateurs ayant la permission INVENTORY_VIEW
 */
export async function getUsersWithInventoryView(): Promise<UserWithInventoryPermission[]> {
  // Récupérer l'ID de la permission INVENTORY_VIEW
  const permission = await prisma.permission.findFirst({
    where: { name: 'INVENTORY_VIEW' },
    select: { id: true }
  });

  if (!permission) {
    console.error('Permission INVENTORY_VIEW non trouvée');
    return [];
  }

  // Récupérer les utilisateurs via UserPermission (permissions directes)
  const usersWithDirectPermission = await prisma.userpermission.findMany({
    where: { permissionId: permission.id },
    include: {
      user: {
        select: { id: true, email: true, fullName: true, status: true }
      }
    }
  });

  // Récupérer les utilisateurs via les rôles (RolePermission)
  const rolesWithPermission = await prisma.rolepermission.findMany({
    where: { permissionId: permission.id },
    select: { roleId: true }
  });

  const roleIds = rolesWithPermission.map(rp => rp.roleId);

  const usersWithRolePermission = await prisma.userRole.findMany({
    where: { roleId: { in: roleIds } },
    include: {
      user: {
        select: { id: true, email: true, fullName: true, status: true }
      }
    }
  });

  // Fusionner et dédupliquer les utilisateurs actifs
  const allUsers = [
    ...usersWithDirectPermission.map(up => up.user),
    ...usersWithRolePermission.map(ur => ur.user)
  ];

  const uniqueUsers = allUsers
    .filter((user, index, self) => 
      index === self.findIndex(u => u.id === user.id)
    )
    .filter(user => user.status === 'ACTIVE')
    .map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName
    }));

  return uniqueUsers;
}

/**
 * Vérifie si un utilisateur spécifique a une permission donnée
 */
async function checkUserHasPermission(userId: number, permissionName: string): Promise<boolean> {
  // Récupérer l'ID de la permission
  const permission = await prisma.permission.findFirst({
    where: { name: permissionName },
    select: { id: true }
  });

  if (!permission) {
    return false;
  }

  // Vérifier la permission directe
  const hasDirectPermission = await prisma.userpermission.findFirst({
    where: { userId, permissionId: permission.id }
  });

  if (hasDirectPermission) {
    return true;
  }

  // Vérifier via les rôles
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { roleId: true }
  });

  const roleIds = userRoles.map(ur => ur.roleId);

  if (roleIds.length === 0) {
    return false;
  }

  const hasRolePermission = await prisma.rolepermission.findFirst({
    where: {
      permissionId: permission.id,
      roleId: { in: roleIds }
    }
  });

  return !!hasRolePermission;
}

/**
 * Récupère l'inventaire complet avec les données calculées
 */
export async function getInventoryData(): Promise<InventoryItem[]> {
  const products = await prisma.products.findMany({
    where: { is_active: true },
    include: {
      category: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true, abbreviation: true } },
    },
    orderBy: { name: "asc" },
  });

  const productIds = products.map((product) => product.id);
  const snapshots = productIds.length
    ? await prisma.inventory_snapshots.findMany({ where: { product_id: { in: productIds } } })
    : [];
  const snapshotByProductId = new Map(snapshots.map((snapshot) => [snapshot.product_id, snapshot]));

  const lastCounts = await prisma.inventory_counts.findMany({
    distinct: ["product_id"],
    orderBy: { created_at: "desc" },
    select: { product_id: true, created_at: true },
  });
  const lastCountMap = Object.fromEntries(lastCounts.map(c => [c.product_id, c.created_at]));

  const items = products.map(product => {
    const snap = snapshotByProductId.get(product.id) ?? null;

    const theoreticalQty = snap ? Number(snap.theoretical_quantity) : 0;
    const realQty = snap ? Number(snap.real_quantity) : 0;
    const variance = realQty - theoreticalQty;
    const variancePct = theoreticalQty !== 0 ? (variance / theoreticalQty) * 100 : 0;

    return {
      product_id: product.id,
      product_name: product.name,
      category_name: product.category?.name ?? "—",
      physical_quantity: realQty,
      theoretical_quantity: theoreticalQty,
      unit_abbreviation: product.unit?.abbreviation ?? null,
      unit_name: product.unit?.name ?? null,
      minimum_stock: product.minimum_stock ? Number(product.minimum_stock) : null,
      variance,
      variance_percentage: Number(variancePct.toFixed(2)),
      last_count_date: lastCountMap[product.id]?.toISOString() ?? null,
      total_value: snap ? Number(snap.total_value) : 0,
    };
  });

  return items;
}

/**
 * Génère un PDF de l'inventaire en utilisant le template professionnel
 */
async function generateInventoryPDF(items: InventoryItem[]): Promise<Buffer> {
  // Convertir InventoryItem en InventoryExportItem
  const exportItems: InventoryExportItem[] = items.map(item => ({
    product_id: item.product_id,
    product_name: item.product_name,
    category_name: item.category_name,
    physical_quantity: item.physical_quantity,
    theoretical_quantity: item.theoretical_quantity,
    unit_abbreviation: item.unit_abbreviation,
    unit_name: item.unit_name,
    minimum_stock: item.minimum_stock,
    variance: item.variance,
    variance_percentage: item.variance_percentage,
    last_count_date: item.last_count_date,
    total_value: item.total_value
  }));

  const { generateInventoryPDF: generatePDF } = await import('@/lib/templates/pdfExportTemplate');
  return generatePDF(exportItems);
}

/**
 * Génère un fichier XLSX de l'inventaire en utilisant le template professionnel
 */
async function generateInventoryXLSX(
  items: InventoryItem[],
  _monthYear?: string
): Promise<Buffer> {
  // Convertir InventoryItem en InventoryExportItem
  const exportItems: InventoryExportItem[] = items.map(item => ({
    product_id: item.product_id,
    product_name: item.product_name,
    category_name: item.category_name,
    physical_quantity: item.physical_quantity,
    theoretical_quantity: item.theoretical_quantity,
    unit_abbreviation: item.unit_abbreviation,
    unit_name: item.unit_name,
    minimum_stock: item.minimum_stock,
    variance: item.variance,
    variance_percentage: item.variance_percentage,
    last_count_date: item.last_count_date,
    total_value: item.total_value
  }));

  const { generateInventoryXLSX: generateXLSX } = await import('@/lib/templates/xlsxExportTemplate');
  return generateXLSX(exportItems);
}

/**
 * Envoie l'inventaire par email à tous les utilisateurs avec INVENTORY_VIEW
 */
export async function sendMonthlyInventoryEmail(testEmail?: string): Promise<{
  success: boolean;
  message: string;
  recipients: number;
  errors?: string[];
}> {
  try {
    // 1. Récupérer les utilisateurs avec INVENTORY_VIEW
    let users: { id: number; email: string; fullName: string }[];
    
    if (testEmail) {
      // Mode test : vérifier que l'email existe et a la permission
      const testUser = await prisma.user.findFirst({
        where: { 
          email: testEmail,
          status: 'ACTIVE'
        },
        select: { id: true, email: true, fullName: true }
      });
      
      if (!testUser) {
        return {
          success: false,
          message: `Aucun utilisateur actif trouvé avec l'email: ${testEmail}`,
          recipients: 0,
          errors: ['Email non trouvé ou utilisateur inactif']
        };
      }
      
      // Vérifier la permission INVENTORY_VIEW
      const hasPermission = await checkUserHasPermission(testUser.id, 'INVENTORY_VIEW');
      if (!hasPermission) {
        return {
          success: false,
          message: `L'utilisateur ${testEmail} n'a pas la permission INVENTORY_VIEW`,
          recipients: 0,
          errors: ['Permission INVENTORY_VIEW manquante']
        };
      }
      
      users = [testUser];
    } else {
      // Mode normal : tous les utilisateurs avec permission
      users = await getUsersWithInventoryView();
    }
    
    if (users.length === 0) {
      return {
        success: false,
        message: "Aucun utilisateur avec la permission INVENTORY_VIEW trouvé",
        recipients: 0
      };
    }

    // 2. Récupérer les données d'inventaire
    const inventoryItems = await getInventoryData();

    if (inventoryItems.length === 0) {
      return {
        success: false,
        message: "Aucune donnée d'inventaire disponible",
        recipients: 0
      };
    }

    // 3. Générer le PDF
    const pdfBuffer = await generateInventoryPDF(inventoryItems);

    // 4. Préparer le mois courant
    const now = new Date();
    const monthYear = now.toLocaleDateString("fr-FR", { month: 'long', year: 'numeric' });
    const monthYearFile = now.toLocaleDateString("fr-FR", { month: 'long', year: 'numeric' }).replace(/\s/g, "_");

    // 5. Envoyer les emails
    const errors: string[] = [];
    const sendPromises = users.map(async (user) => {
      try {
const htmlContent = `
<div style="font-family: 'Segoe UI', Roboto, sans-serif; background:#f4f6fb; padding:40px 0;">
  <div style="max-width:620px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">

    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#7C3AED,#4C1D95);padding:30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">📊 Rapport d'Inventaire</h1>
      <p style="color:#ddd;margin-top:8px;font-size:13px;">Analyse intelligente des stocks</p>
    </div>

    <!-- BODY -->
    <div style="padding:30px;">
      <p style="font-size:15px;">Bonjour <strong>${user.fullName}</strong>,</p>

      <p style="color:#555;line-height:1.6;">
        Voici votre rapport d'inventaire pour <strong>${monthYear}</strong>.
      </p>

      <!-- KPI -->
      <div style="display:flex;gap:10px;margin:20px 0;">
        <div style="flex:1;background:#F0FDF4;padding:15px;border-radius:8px;text-align:center;">
          <strong>${inventoryItems.length}</strong><br><small>Produits</small>
        </div>
        <div style="flex:1;background:#FEF2F2;padding:15px;border-radius:8px;text-align:center;">
          <strong>${inventoryItems.filter(x => (x.physical_quantity ?? 0) <= 0).length}</strong><br><small>Épuisés</small>
        </div>
        <div style="flex:1;background:#FFFBEB;padding:15px;border-radius:8px;text-align:center;">
          <strong>${inventoryItems.filter(x => x.minimum_stock != null && x.physical_quantity > 0 && x.physical_quantity <= x.minimum_stock).length}</strong><br><small>Stock bas</small>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:25px 0;">
        <a href="${(process.env.NEXT_PUBLIC_APP_URL || 'https://gestion.localgrill-bf.com')}/inventaire"
           style="background:#7C3AED;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Accéder au tableau de bord
        </a>
      </div>

      <p style="font-size:13px;color:#777;">
        Ce rapport est généré automatiquement chaque mois.
      </p>
    </div>

    <!-- FOOTER -->
    <div style="background:#fafafa;padding:20px;text-align:center;font-size:12px;color:#999;">
      © ${new Date().getFullYear()} Local Grill • Smart Inventory System
    </div>

  </div>
</div>
`;

        // Générer le fichier XLSX
        const xlsxBuffer = await generateInventoryXLSX(inventoryItems, monthYear);

        await sendMail({
          to: user.email,
          subject: `📋 Rapport d'Inventaire — ${monthYear}`,
          html: htmlContent,
          attachments: [
            {
              filename: `Inventaire_${monthYearFile}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            },
            {
              filename: `Inventaire_${monthYearFile}.xlsx`,
              content: xlsxBuffer,
              contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
          ]
        });

        console.log(`✅ Email envoyé à ${user.email}`);
        return { success: true, email: user.email };
      } catch (error) {
        console.error(`❌ Erreur envoi à ${user.email}:`, error);
        errors.push(`Échec pour ${user.email}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        return { success: false, email: user.email };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;

    return {
      success: successCount > 0,
      message: `${successCount}/${users.length} emails envoyés avec succès`,
      recipients: successCount,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    console.error("Erreur lors de l'envoi de l'inventaire:", error);
    return {
      success: false,
      message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      recipients: 0,
      errors: [error instanceof Error ? error.message : 'Erreur inconnue']
    };
  }
}
