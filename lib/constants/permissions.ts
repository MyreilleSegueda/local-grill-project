/**
 * lib/constants/permissions.ts
 *
 * SOURCE DE VÉRITÉ UNIQUE — AUCUN import React/icône ici.
 * Ce fichier est importé côté serveur (middleware Edge) et client.
 * Les icônes sont dans PERMISSION_GROUPS uniquement sous forme de string emoji.
 */

// ─── Toutes les permissions ───────────────────────────────────────────────────
export const ALL_PERMISSIONS = [
  'DASHBOARD_VIEW',
  'PRODUCTS_VIEW',   'PRODUCTS_CREATE',   'PRODUCTS_EDIT',   'PRODUCTS_DELETE',
  'STOCK_VIEW',      'STOCK_CREATE',      'STOCK_EDIT',      'STOCK_DELETE',
  'MATERIALS_VIEW',  'MATERIALS_CREATE',  'MATERIALS_EDIT',  'MATERIALS_DELETE',
  'INVENTORY_VIEW',  'INVENTORY_CREATE',  'INVENTORY_EDIT',  'INVENTORY_DELETE',
  'ALERTS_VIEW',     'ALERTS_CREATE',     'ALERTS_EDIT',     'ALERTS_DELETE',
  'REPORTS_VIEW',    'REPORTS_CREATE',    'REPORTS_EDIT',    'REPORTS_DELETE',
  'USERS_VIEW',      'USERS_CREATE',      'USERS_EDIT',      'USERS_DELETE',
  'ROLES_VIEW',      'ROLES_CREATE',      'ROLES_EDIT',      'ROLES_DELETE',
  'SETTINGS_VIEW',   'SETTINGS_CREATE',   'SETTINGS_EDIT',   'SETTINGS_DELETE',
  'SORTIE_STOCK_VIEW', 'SORTIE_STOCK_CREATE', 'SORTIE_STOCK_EDIT', 'SORTIE_STOCK_DELETE',
  'CUISINE_VIEW', 'CUISINE_SERVE', 'CUISINE_RETURN',
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

// ─── Groupes pour AdminRoles (icônes = emojis, pas de composants React) ───────
export interface PermissionGroup {
  module:      string;
  label:       string;
  icon:        string;        // emoji uniquement — pas de JSX ici
  color:       string;
  permissions: {
    key:    Permission;
    action: string;
    short:  string;
  }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    module: 'DASHBOARD',
    label:  'Tableau de bord',
    icon:   '🏠',
    color:  'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700',
    permissions: [
      { key: 'DASHBOARD_VIEW', action: 'Accéder', short: 'VIEW' },
    ],
  },
  {
    module: 'PRODUCTS',
    label:  'Produits',
    icon:   '📦',
    color:  'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50',
    permissions: [
      { key: 'PRODUCTS_VIEW',   action: 'Voir',      short: 'VIEW'   },
      { key: 'PRODUCTS_CREATE', action: 'Créer',     short: 'CREATE' },
      { key: 'PRODUCTS_EDIT',   action: 'Modifier',  short: 'EDIT'   },
      { key: 'PRODUCTS_DELETE', action: 'Supprimer', short: 'DELETE' },
    ],
  },
  {
    module: 'STOCK',
    label:  'Stock (Entrées)',
    icon:   '🔄',
    color:  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
    permissions: [
      { key: 'STOCK_VIEW',   action: 'Voir',      short: 'VIEW'   },
      { key: 'STOCK_CREATE', action: 'Créer',     short: 'CREATE' },
      { key: 'STOCK_EDIT',   action: 'Modifier',  short: 'EDIT'   },
      { key: 'STOCK_DELETE', action: 'Supprimer', short: 'DELETE' },
    ],
  },
  {
    module: 'SORTIE_STOCK',
    label:  'Stock (Sorties)',
    icon:   '🔄',
    color:  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
    permissions: [
      { key: 'SORTIE_STOCK_VIEW',   action: 'Voir',      short: 'VIEW'   },
      { key: 'SORTIE_STOCK_CREATE', action: 'Créer',     short: 'CREATE' },
      { key: 'SORTIE_STOCK_EDIT',   action: 'Modifier',  short: 'EDIT'   },
      { key: 'SORTIE_STOCK_DELETE', action: 'Supprimer', short: 'DELETE' },
    ],
  },
  {
    module: 'CUISINE',
    label:  'Cuisine',
    icon:   '🍳',
    color:  'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/50',
    permissions: [
      { key: 'CUISINE_VIEW',   action: 'Voir', short: 'VIEW' },
      { key: 'CUISINE_SERVE',  action: 'Déclarer le service', short: 'SERVE' },
      { key: 'CUISINE_RETURN', action: 'Enregistrer un retour', short: 'RETURN' },
    ],
  },
  {
    module: 'MATERIALS',
    label:  'Gestion du matériel',
    icon:   '🔧',
    color:  'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/50',
    permissions: [
      { key: 'MATERIALS_VIEW',   action: 'Voir',      short: 'VIEW'   },
      { key: 'MATERIALS_CREATE', action: 'Créer',     short: 'CREATE' },
      { key: 'MATERIALS_EDIT',   action: 'Modifier',  short: 'EDIT'   },
      { key: 'MATERIALS_DELETE', action: 'Supprimer', short: 'DELETE' },
    ],
  },
  {
    module: 'INVENTORY',
    label:  'Inventaire',
    icon:   '📋',
    color:  'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900/50',
    permissions: [
      { key: 'INVENTORY_VIEW',   action: 'Voir',      short: 'VIEW'   },
      { key: 'INVENTORY_CREATE', action: 'Créer',     short: 'CREATE' },
      { key: 'INVENTORY_EDIT',   action: 'Modifier',  short: 'EDIT'   },
      { key: 'INVENTORY_DELETE', action: 'Supprimer', short: 'DELETE' },
    ],
  },
  {
    module: 'ALERTS',
    label:  'Alertes',
    icon:   '🔔',
    color:  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50',
    permissions: [
      { key: 'ALERTS_VIEW',   action: 'Voir',      short: 'VIEW'   },
      { key: 'ALERTS_CREATE', action: 'Créer',     short: 'CREATE' },
      { key: 'ALERTS_EDIT',   action: 'Modifier',  short: 'EDIT'   },
      { key: 'ALERTS_DELETE', action: 'Supprimer', short: 'DELETE' },
    ],
  },
  {
    module: 'REPORTS',
    label:  'Rapports',
    icon:   '📊',
    color:  'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/50',
    permissions: [
      { key: 'REPORTS_VIEW',   action: 'Voir',       short: 'VIEW'   },
      { key: 'REPORTS_CREATE', action: 'Générer',    short: 'CREATE' },
      { key: 'REPORTS_EDIT',   action: 'Modifier',   short: 'EDIT'   },
      { key: 'REPORTS_DELETE', action: 'Supprimer',  short: 'DELETE' },
    ],
  },
  {
    module: 'USERS',
    label:  'Utilisateurs',
    icon:   '👥',
    color:  'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/50',
    permissions: [
      { key: 'USERS_VIEW',   action: 'Voir',      short: 'VIEW'   },
      { key: 'USERS_CREATE', action: 'Créer',     short: 'CREATE' },
      { key: 'USERS_EDIT',   action: 'Modifier',  short: 'EDIT'   },
      { key: 'USERS_DELETE', action: 'Supprimer', short: 'DELETE' },
    ],
  },
  {
    module: 'ROLES',
    label:  'Rôles & Permissions',
    icon:   '🛡️',
    color:  'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/50',
    permissions: [
      { key: 'ROLES_VIEW',   action: 'Voir',      short: 'VIEW'   },
      { key: 'ROLES_CREATE', action: 'Créer',     short: 'CREATE' },
      { key: 'ROLES_EDIT',   action: 'Modifier',  short: 'EDIT'   },
      { key: 'ROLES_DELETE', action: 'Supprimer', short: 'DELETE' },
    ],
  },
  {
    module: 'SETTINGS',
    label:  'Paramètres',
    icon:   '⚙️',
    color:  'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-700',
    permissions: [
      { key: 'SETTINGS_VIEW',   action: 'Voir',      short: 'VIEW'   },
      { key: 'SETTINGS_CREATE', action: 'Créer',     short: 'CREATE' },
      { key: 'SETTINGS_EDIT',   action: 'Modifier',  short: 'EDIT'   },
      { key: 'SETTINGS_DELETE', action: 'Supprimer', short: 'DELETE' },
    ],
  },
];

// ─── Sidebar stock ────────────────────────────────────────────────────────────
export const SIDEBAR_PERMISSIONS: Record<string, Permission | null> = {
  '/dashboard':  null,
  '/produits':   'PRODUCTS_VIEW',
  '/entrees':    'STOCK_CREATE',
  '/sorties':    'STOCK_CREATE',
  '/materiels':  'MATERIALS_VIEW',
  '/inventaire': 'INVENTORY_VIEW',
  '/alertes':    'ALERTS_VIEW',
  '/rapports':   'REPORTS_VIEW',
};

// ─── Sidebar admin ────────────────────────────────────────────────────────────
export const ADMIN_SIDEBAR_PERMISSIONS: Record<string, Permission | null> = {
  '/admin/dashboard': null,
  '/admin/users':     'USERS_VIEW',
  '/admin/roles':     'ROLES_VIEW',
  '/admin/settings':  'SETTINGS_VIEW',
};
