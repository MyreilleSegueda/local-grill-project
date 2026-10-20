

import { NextRequest, NextResponse } from 'next/server';

import { getAuthUser } from '@/lib/auth/request';
import {
  getDailyConsumptionChart,
  getStockLossesReport,
  getRecentMovements,
  getInventoryHealth,
  getDashboardKPIs,
  getTopConsumedProducts
} from '@/lib/services/dashboardService';
import { prisma } from '@/server/db/prisma';

export async function GET(request: NextRequest) {
  try {
    // Authentification
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Filtres dynamiques (date, produit, catégorie, utilisateur, type...)
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const category = searchParams.get('category');
    const product = searchParams.get('product');
    const userId = searchParams.get('user');
    const movementType = searchParams.get('type');

    // Dates
    const parsedStart = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const parsedEnd = end ? new Date(end) : new Date();
    const startDate = Number.isNaN(parsedStart.getTime()) ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : parsedStart;
    const endDate = Number.isNaN(parsedEnd.getTime()) ? new Date() : parsedEnd;

    // Consommation quotidienne
    const daily_consumption = await getDailyConsumptionChart(30, startDate, endDate);
    // Top produits consommés
    const top_products = await getTopConsumedProducts(10, startDate, endDate);
    // Pertes & gaspillage
    const losses = await getStockLossesReport(startDate, endDate);
    // Derniers mouvements de stock
    const movements = await getRecentMovements(20, startDate, endDate);
    // Santé de l'inventaire
    const inventory_health = await getInventoryHealth();
    // KPIs globaux
    const kpis = await getDashboardKPIs();

    // Utilisateurs
    const users = await prisma.user.findMany({
      select: { id: true, fullName: true, email: true, status: true, createdAt: true }
    });
    // Rôles
    const roles = await prisma.role.findMany({
      select: { id: true, name: true, createdAt: true }
    });
    // Permissions
    const permissions = await prisma.permission.findMany({
      select: { id: true, name: true, description: true }
    });
    // Catégories
    const categories = await prisma.categories.findMany({
      select: { id: true, name: true, description: true, is_active: true }
    });
    // Fournisseurs
    const suppliers = await prisma.suppliers.findMany({
      select: { id: true, name: true, contact_name: true, is_active: true }
    });
    // Unités
    const units = await prisma.units.findMany({
      select: { id: true, name: true, abbreviation: true }
    });
    // Alertes
    const alerts = await prisma.alerts.findMany({
      select: { id: true, type: true, severity: true, message: true, is_resolved: true, created_at: true }
    });
    // Logs d'activité
    const activity_logs = await prisma.activity_logs.findMany({
      select: { id: true, user_id: true, action: true, entity_type: true, entity_id: true, created_at: true }
    });

    // Structure de réponse par section
    return NextResponse.json({
      success: true,
      data: {
        kpis,
        daily_consumption,
        top_products,
        losses,
        inventory_health,
        movements,
        users,
        roles,
        permissions,
        categories,
        suppliers,
        units,
        alerts,
        activity_logs,
      },
    });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
