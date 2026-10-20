/**
 * lib/hooks/usePagePermissions.tsx
 *
 * ═══════════════════════════════════════════════════════════════════
 * HOOK CENTRAL RBAC — À utiliser dans TOUTES les pages
 *
 * UTILISATION :
 *   const { can, canAny, isLoading, isAdmin } = usePagePermissions();
 *
 *   can('PRODUCTS_CREATE')                    → boolean
 *   canAny(['PRODUCTS_EDIT','PRODUCTS_DELETE'])→ boolean
 *   canAll(['STOCK_VIEW','STOCK_CREATE'])      → boolean
 * ═══════════════════════════════════════════════════════════════════
 */
"use client";
import { useAuth }       from "@/lib/hooks/useAuth";
import type { Permission } from "@/lib/constants/permissions";

export interface PagePermissions {
  can:       (permission: Permission) => boolean;
  canAny:    (permissions: Permission[]) => boolean;
  canAll:    (permissions: Permission[]) => boolean;
  isLoading: boolean;
  isAdmin:   boolean;
  userPerms: string[];
  userRoles: string[];
}

export function usePagePermissions(): PagePermissions {
  const { user, isLoading } = useAuth();

  const userPerms = user?.permissions ?? [];
  const userRoles = user?.roles ?? (user?.role ? [user.role] : []);
  const isAdmin   = userRoles.some(role => role.toUpperCase() === "ADMIN");

  const can = (permission: Permission): boolean => {
    if (isLoading) return false;
    if (isAdmin)   return true;
    return userPerms.includes(permission);
  };

  const canAny = (permissions: Permission[]): boolean => {
    if (isLoading) return false;
    if (isAdmin)   return true;
    return permissions.some(p => userPerms.includes(p));
  };

  const canAll = (permissions: Permission[]): boolean => {
    if (isLoading) return false;
    if (isAdmin)   return true;
    return permissions.every(p => userPerms.includes(p));
  };

  return { can, canAny, canAll, isLoading, isAdmin, userPerms, userRoles };
}
