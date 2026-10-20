/**
 * API Route pour la configuration de l'envoi d'email d'inventaire
 * GET /api/admin/settings/inventory-email
 * POST /api/admin/settings/inventory-email
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/request";
import {
  INVENTORY_EMAIL_SETTINGS,
  parseInventoryEmailSettings,
  serializeInventoryEmailConfig,
  InventoryEmailConfig,
} from "@/lib/constants/inventoryEmailSettings";

/**
 * GET : récupérer la configuration
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Récupérer les paramètres
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            INVENTORY_EMAIL_SETTINGS.ENABLED,
            INVENTORY_EMAIL_SETTINGS.SEND_DAY,
            INVENTORY_EMAIL_SETTINGS.SEND_TIME,
            INVENTORY_EMAIL_SETTINGS.LAST_SENT,
          ],
        },
      },
    });

    const settingsMap: Record<string, string | null> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    // Compléter avec les valeurs par défaut si manquantes
    const config = parseInventoryEmailSettings(settingsMap);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("[GET /api/admin/settings/inventory-email]", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST : mettre à jour la configuration
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Vérifier l'authentification admin
    const user = await getAuthUser(req);
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier les permissions admin
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    const hasAdminRole = userRoles.some((ur) => ur.role.name.trim().toUpperCase() === "ADMIN");
    if (!hasAdminRole) {
      return NextResponse.json(
        { success: false, error: "Permission refusée" },
        { status: 403 }
      );
    }

    // Récupérer les données
    const body = await req.json();
    const { enabled, sendDay, sendTime } = body;

    // Validation
    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Le champ 'enabled' est requis (boolean)" },
        { status: 400 }
      );
    }

    const dayNum = parseInt(sendDay, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      return NextResponse.json(
        { success: false, error: "Le jour doit être entre 1 et 31" },
        { status: 400 }
      );
    }

    if (!sendTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(sendTime)) {
      return NextResponse.json(
        { success: false, error: "L'heure doit être au format HH:MM (ex: 09:00)" },
        { status: 400 }
      );
    }

    // Préparer la configuration
    const config: InventoryEmailConfig = {
      enabled,
      sendDay: dayNum,
      sendTime,
    };

    // Sauvegarder les paramètres
    const dataToSave = serializeInventoryEmailConfig(config);

    await Promise.all(
      Object.entries(dataToSave).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value, updatedAt: new Date() },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: "Configuration enregistrée",
      data: config,
    });
  } catch (error) {
    console.error("[POST /api/admin/settings/inventory-email]", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
