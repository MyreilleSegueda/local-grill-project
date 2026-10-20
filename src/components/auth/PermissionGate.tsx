/**
 * components/auth/PermissionGate.tsx
 *
 * Composant wrapper RBAC côté client.
 * Masque ou remplace son contenu si l'utilisateur n'a pas les droits.
 *
 * Exemples :
 *
 *   // Afficher seulement si l'utilisateur a la permission
 *   <PermissionGate permission="stock.create">
 *     <button>Nouvelle entrée</button>
 *   </PermissionGate>
 *
 *   // Afficher seulement si l'utilisateur a le rôle
 *   <PermissionGate role="ADMIN">
 *     <AdminMenu />
 *   </PermissionGate>
 *
 *   // Afficher un fallback si refusé
 *   <PermissionGate permission="reports.view" fallback={<p>Accès refusé</p>}>
 *     <ReportTable />
 *   </PermissionGate>
 *
 *   // Désactiver (et griser) au lieu de masquer
 *   <PermissionGate permission="products.delete" mode="disable">
 *     <button>Supprimer</button>
 *   </PermissionGate>
 */
"use client";
import React from "react";
import { useAuth } from "@/lib/hooks/useAuth";

interface PermissionGateProps {
  children:    React.ReactNode;
  /** Permission requise (ou tableau : au moins une suffit) */
  permission?: string | string[];
  /** Rôle requis (ou tableau : au moins un suffit) */
  role?:       string | string[];
  /** Toutes les permissions requises */
  allPermissions?: string[];
  /** Affiché si accès refusé (défaut : rien) */
  fallback?:   React.ReactNode;
  /**
   * hide   → masquer complètement (défaut)
   * disable → rendre non-cliquable + semi-transparent
   */
  mode?:       "hide" | "disable";
}

export function PermissionGate({
  children,
  permission,
  role,
  allPermissions,
  fallback = null,
  mode = "hide",
}: PermissionGateProps) {
  const { hasPermission, hasRole, hasAllPermissions, isLoading } = useAuth();

  // En cours de chargement : ne rien afficher pour éviter le flash
  if (isLoading) return null;

  // Évaluer les conditions
  let allowed = true;
  if (role)           allowed = allowed && hasRole(role);
  if (permission)     allowed = allowed && hasPermission(permission);
  if (allPermissions) allowed = allowed && hasAllPermissions(allPermissions);

  if (!allowed) {
    if (mode === "disable") {
      return (
        <div
          className="opacity-40 pointer-events-none select-none"
          aria-disabled="true"
          title="Vous n'avez pas les droits pour cette action"
        >
          {children}
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ─── Raccourcis pratiques ─────────────────────────────────────────────────────

/** Visible seulement pour ADMIN */
export function AdminOnly({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGate role="ADMIN" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/** Visible si l'utilisateur peut créer des entrées/sorties de stock */
export function StockManagerOnly({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGate role={["ADMIN", "STOCK_MANAGER"]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}