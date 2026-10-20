/**
 * API Route pour envoyer l'inventaire mensuel par email
 * POST /api/inventory/send-monthly
 * 
 * Cette route peut être appelée :
 * 1. Manuellement par un admin
 * 2. Automatiquement par un cron job (Vercel Cron ou autre)
 * 
 * Elle envoie le rapport d'inventaire à tous les utilisateurs avec INVENTORY_VIEW
 */

import { NextRequest, NextResponse } from "next/server";
import { sendMonthlyInventoryEmail } from "@/lib/services/inventoryMailService";
import { getAuthUser } from "@/lib/auth/request";
import { prisma } from "@/lib/prisma";
import {
  INVENTORY_EMAIL_SETTINGS,
  parseInventoryEmailSettings,
  isScheduledDay,
  isScheduledTime,
} from "@/lib/constants/inventoryEmailSettings";

/**
 * Vérifie si l'appelant est autorisé (token admin ou cron secret)
 */
async function isAuthorized(req: NextRequest): Promise<boolean> {
  // Vérifier le header de cron secret (pour les appels automatisés)
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    return true;
  }

  // Vérifier l'authentification admin (pour les appels manuels)
  const user = await getAuthUser(req);
  
  if (!user?.id) {
    return false;
  }

  try {
    // Récupérer les rôles de l'utilisateur
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true }
    });

    // Vérifier si l'utilisateur a le rôle ADMIN
    const hasAdminRole = userRoles.some((ur) => ur.role.name.trim().toUpperCase() === 'ADMIN');
    if (hasAdminRole) {
      return true;
    }

    // Récupérer les permissions directes
    const userPerms = await prisma.userpermission.findMany({
      where: { userId: user.id },
      include: { permission: true }
    });

    // Vérifier si l'utilisateur a la permission SETTINGS_EDIT
    const hasSettingsEdit = userPerms.some((up) => up.permission.name === 'SETTINGS_EDIT');
    
    return hasSettingsEdit;
  } catch (error) {
    console.error("Erreur vérification autorisation:", error);
    return false;
  }
}

/**
 * Récupère la configuration d'envoi d'email
 */
async function getEmailConfig() {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          INVENTORY_EMAIL_SETTINGS.ENABLED,
          INVENTORY_EMAIL_SETTINGS.SEND_DAY,
          INVENTORY_EMAIL_SETTINGS.SEND_TIME,
        ],
      },
    },
  });

  const settingsMap: Record<string, string | null> = {};
  settings.forEach((s) => {
    settingsMap[s.key] = s.value;
  });

  return parseInventoryEmailSettings(settingsMap);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Vérifier l'autorisation
    const authorized = await isAuthorized(req);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Non autorisé. Token admin ou cron secret requis." },
        { status: 401 }
      );
    }

    // Si appel par cron, vérifier la configuration
    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret) {
      const config = await getEmailConfig();

      // Vérifier si l'envoi est activé
      if (!config.enabled) {
        return NextResponse.json({
          success: true,
          message: "Envoi automatique désactivé",
          skipped: true,
        });
      }

      // Vérifier si c'est le jour configuré
      if (!isScheduledDay(config.sendDay)) {
        const today = new Date().getDate();
        return NextResponse.json({
          success: true,
          message: `Jour ${today} — envoi programmé pour le ${config.sendDay}`,
          skipped: true,
        });
      }

      // Vérifier si c'est l'heure configurée (tolérance de 5 minutes)
      if (!isScheduledTime(config.sendTime)) {
        return NextResponse.json({
          success: true,
          message: `Heure actuelle — envoi programmé à ${config.sendTime}`,
          skipped: true,
        });
      }
    }

    // Lire le body pour le mode test (optionnel)
    let testEmail: string | undefined;
    try {
      const body = await req.json();
      testEmail = body?.testEmail;
    } catch {
      // Pas de body ou body invalide, c'est ok (mode normal)
    }

    // Envoyer l'inventaire
    const result = await sendMonthlyInventoryEmail(testEmail);

    // Enregistrer la date d'envoi si c'est un appel cron
    if (cronSecret && result.success) {
      await prisma.setting.upsert({
        where: { key: INVENTORY_EMAIL_SETTINGS.LAST_SENT },
        update: { value: new Date().toISOString() },
        create: {
          key: INVENTORY_EMAIL_SETTINGS.LAST_SENT,
          value: new Date().toISOString(),
          updatedAt: new Date(),
        },
      });
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        recipients: result.recipients,
        errors: result.errors
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        recipients: result.recipients,
        errors: result.errors
      }, { status: 400 });
    }

  } catch (error) {
    console.error("[POST /api/inventory/send-monthly] Erreur:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Erreur serveur",
        details: error instanceof Error ? error.message : "Erreur inconnue"
      },
      { status: 500 }
    );
  }
}

/**
 * GET pour vérifier le statut du service (health check)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = req.headers.get("x-cron-secret");
  
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: "Non autorisé" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Service d'envoi d'inventaire opérationnel",
    timestamp: new Date().toISOString()
  });
}
