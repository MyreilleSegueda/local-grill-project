/**
 * lib/context/AuthContext.tsx
 *
 * Permissions DB réelles : READ_STOCK, WRITE_STOCK, READ_USERS, WRITE_USERS,
 *   READ_REPORTS, WRITE_REPORTS, READ_SETTINGS, WRITE_SETTINGS,
 *   READ_ALERTS, WRITE_ALERTS
 *
 * hasPermission() :
 *   - ADMIN → true pour tout
 *   - Autres → vérifie user.permissions[] (rechargées depuis DB via /api/auth/me)
 */
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id:          number;
  email:       string;
  fullName:    string;
  full_name?:  string;
  role:        string;
  roles:       string[];
  permissions: string[];   // valeurs DB : READ_STOCK, WRITE_STOCK, etc.
  status:      string;
  isActive:    boolean;
}

interface AuthContextValue {
  user:              AuthUser | null;
  token:             string | null;
  isAuthenticated:   boolean;
  isLoading:         boolean;
  isAdmin:           boolean;
  login:             (email: string, password: string) => Promise<AuthUser>;
  logout:            () => Promise<void>;
  refreshUser:       () => Promise<void>;
  hasRole:           (role: string | string[]) => boolean;
  hasPermission:     (permission: string | string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LS_TOKEN   = "token";
const LS_USER    = "user";
const LS_CONTEXT = "login_context";

function lsGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(key) ?? "null"); }
  catch { return null; }
}
function lsSet(key: string, value: unknown) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
}
function lsDel(...keys: string[]) {
  if (typeof window !== "undefined") keys.forEach(k => localStorage.removeItem(k));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user,      setUser]      = useState<AuthUser | null>(() => lsGet<AuthUser>(LS_USER));
  const [token,     setToken]     = useState<string | null>(() => lsGet<string>(LS_TOKEN));
  const [isLoading, setIsLoading] = useState(true);

  // ── refreshUser : recharge depuis /api/auth/me ────────────────────────────
  // CRITIQUE : /api/auth/me doit retourner permissions[] avec les vraies valeurs DB
  // ex: ["READ_STOCK", "WRITE_STOCK", "READ_REPORTS", ...]
  const refreshUser = useCallback(async () => {
    const storedToken = lsGet<string>(LS_TOKEN);
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers:     { Authorization: `Bearer ${storedToken}` },
        credentials: "include",
      });

      if (res.status === 401 || res.status === 404) {
        lsDel(LS_TOKEN, LS_USER, LS_CONTEXT);
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      if (res.status === 403) {
        const data      = await res.json().catch(() => ({}));
        const ctx       = lsGet<string>(LS_CONTEXT);
        const loginPage = ctx === "admin" ? "/login/pg-admin" : "/";
        lsDel(LS_TOKEN, LS_USER, LS_CONTEXT);
        setUser(null);
        setToken(null);
        setIsLoading(false);
        router.replace(`${loginPage}?error=${encodeURIComponent(data.error ?? "Compte désactivé")}`);
        return;
      }

      if (!res.ok) {
        setIsLoading(false);
        return;
      }

      const freshUser: AuthUser = await res.json();

      // Normaliser fullName
      if (!freshUser.fullName && freshUser.full_name) {
        freshUser.fullName = freshUser.full_name;
      }

      // S'assurer que permissions et roles sont bien des tableaux
      freshUser.permissions = Array.isArray(freshUser.permissions) ? freshUser.permissions : [];
      freshUser.roles       = Array.isArray(freshUser.roles)       ? freshUser.roles       : (freshUser.role ? [freshUser.role] : []);

      lsSet(LS_USER, freshUser);
      setUser(freshUser);
      setToken(storedToken);

      // Log pour diagnostic
      console.log("[AuthContext] refreshUser permissions:", freshUser.permissions);
      console.log("[AuthContext] refreshUser roles:", freshUser.roles);

    } catch (err) {
      console.warn("[AuthContext] refreshUser network error:", err);
      // Conserver l'état local si réseau down
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  // ── login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const res  = await fetch("/api/auth/login", {
      method:      "POST",
      headers:     { "Content-Type": "application/json" },
      credentials: "include",
      body:        JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Erreur de connexion");

    const u: AuthUser = data.user;
    u.permissions = Array.isArray(u.permissions) ? u.permissions : [];
    u.roles       = (Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []))
      .map(role => role.toUpperCase());
    u.permissions = u.permissions.map(permission => permission.toUpperCase());
    if (!u.fullName && u.full_name) u.fullName = u.full_name;

    lsSet(LS_TOKEN,   data.token);
    lsSet(LS_USER,    u);
    lsSet(LS_CONTEXT, u.roles.some(role => role.toUpperCase() === "ADMIN") ? "admin" : "user");

    setToken(data.token);
    setUser(u);
    return u;
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const ctx       = lsGet<string>(LS_CONTEXT);
    const loginPage = ctx === "admin" ? "/login/pg-admin" : "/";
    lsDel(LS_TOKEN, LS_USER, LS_CONTEXT);
    setUser(null);
    setToken(null);
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); }
    catch {}
    router.replace(loginPage);
  }, [router]);

  // ── RBAC ──────────────────────────────────────────────────────────────────
  const hasRole = useCallback((role: string | string[]): boolean => {
    if (!user) return false;
    const list = Array.isArray(role) ? role : [role];
    return list.some(r => user.roles?.some(assigned => assigned.toUpperCase() === r.toUpperCase()));
  }, [user]);

  // hasPermission vérifie user.permissions[] (valeurs DB brutes)
  // ADMIN bypass : toujours true
  const hasPermission = useCallback((permission: string | string[]): boolean => {
    if (!user) return false;
    if (user.roles?.some(role => role.toUpperCase() === "ADMIN")) return true;
    const list = Array.isArray(permission) ? permission : [permission];
    return list.some(p => user.permissions?.some(assigned => assigned.toUpperCase() === p.toUpperCase()));
  }, [user]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (!user) return false;
    if (user.roles?.some(role => role.toUpperCase() === "ADMIN")) return true;
    return permissions.every(p => user.permissions?.some(assigned => assigned.toUpperCase() === p.toUpperCase()));
  }, [user]);

  const isAdmin = !!user?.roles?.some(role => role.toUpperCase() === "ADMIN");

  return (
    <AuthContext.Provider value={{
      user, token,
      isAuthenticated: !!token && !!user,
      isLoading, isAdmin,
      login, logout, refreshUser,
      hasRole, hasPermission, hasAllPermissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
