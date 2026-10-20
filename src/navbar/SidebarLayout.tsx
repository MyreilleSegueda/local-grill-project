/**
 * src/navbar/SidebarLayout.tsx
 * Utilise SIDEBAR_PERMISSIONS depuis lib/constants/permissions.ts
 */
"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import Link from "next/link";
import { PanelLeft, PanelRight } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { PERMISSION_GROUPS } from "@/lib/constants/permissions";
import {
  Bars3Icon, XMarkIcon, HomeIcon, CubeIcon,
  ArrowDownTrayIcon, ArrowUpTrayIcon,
  ClipboardDocumentListIcon, ExclamationTriangleIcon,
  DocumentChartBarIcon, UserCircleIcon, ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import { ChefHat, Utensils } from "lucide-react";

interface SidebarLayoutProps { children: React.ReactNode }

function emailToHsl(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 48%)`;
}
function getInitials(name: string, email: string): string {
  if (name)  return name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (email) return email[0].toUpperCase();
  return "U";
}

interface MenuItem {
  name:       string;
  href:       string;
  icon:       React.ElementType;
  permission: string | null;
}

// Permissions alignées sur les constantes
const MENU_ITEMS: MenuItem[] = [
  { name: "Tableau de bord", href: "/dashboard",  icon: HomeIcon,                 permission: null               },
  { name: "Produits",        href: "/produits",   icon: CubeIcon,                 permission: "PRODUCTS_VIEW"    },
  { name: "Entrées",         href: "/entrees",    icon: ArrowDownTrayIcon,        permission: "STOCK_VIEW"       },
  { name: "Sorties",         href: "/sorties",    icon: ArrowUpTrayIcon,          permission: "SORTIE_STOCK_VIEW"       },
  { name: "Cuisine",         href: "/cuisine",    icon: ChefHat,                  permission: "CUISINE_VIEW"       },
  { name: "Gestion du matériel", href: "/materiels", icon: Utensils,              permission: "MATERIALS_VIEW"   },
  { name: "Inventaire",      href: "/inventaire", icon: ClipboardDocumentListIcon, permission: "INVENTORY_VIEW"   },
  { name: "Alertes",         href: "/alertes",    icon: ExclamationTriangleIcon,   permission: "ALERTS_VIEW"      },
  { name: "Rapports",        href: "/rapports",   icon: DocumentChartBarIcon,      permission: "REPORTS_VIEW"     },
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN:         "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",
  SUPERVISOR:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  STOCK_MANAGER: "bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400",
  KITCHEN_STAFF: "bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400",
  CASHIER:       "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  COMPTABLE:     "bg-teal-100   text-teal-700   dark:bg-teal-900/30   dark:text-teal-400",
  LIVREUR:       "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  VIGILE:        "bg-slate-100  text-slate-700  dark:bg-slate-900/30  dark:text-slate-600",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[12px] font-bold ${
      ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400"
    }`}>{role}</span>
  );
}

function ErrorToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed top-4 left-1/2 z-[99] -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-semibold">
      <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

function checkPermission(
  userPermissions: string[],
  userRoles: string[],
  required: string | null,
): boolean {
  if (required === null) return true;
  if (userRoles.includes("ADMIN")) return true;
  return userPermissions.includes(required);
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout, isLoading } = useAuth();

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [collapsed,    setCollapsed]    = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [mounted,          setMounted]          = useState(false);
  const [avatarBg,         setAvatarBg]         = useState("#9CA3AF");
  const [initials,         setInitials]         = useState("…");
  const [displayNameSafe,  setDisplayNameSafe]  = useState("");
  const [displayEmailSafe, setDisplayEmailSafe] = useState("");
  const [displayRoleSafe,  setDisplayRoleSafe]  = useState("");
  const [userPerms,        setUserPerms]        = useState<string[]>([]);
  const [userRoles,        setUserRoles]        = useState<string[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;
    const name  = user?.fullName || user?.full_name || "";
    const email = user?.email    || "";
    const role  = user?.role     || "";
    setAvatarBg(email ? emailToHsl(email) : "#FE0002");
    setInitials(getInitials(name, email));
    setDisplayNameSafe(name || "Utilisateur");
    setDisplayEmailSafe(email);
    setDisplayRoleSafe(role);
    setUserPerms(Array.isArray(user?.permissions) ? user.permissions : []);
    setUserRoles(Array.isArray(user?.roles) ? user.roles : (role ? [role] : []));
  }, [mounted, isLoading, user]);

  const stableLogout = useCallback(logout, []); // eslint-disable-line
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.status === 403) {
          const { error } = await res.json().catch(() => ({}));
          if (!ignore) { setErrorMessage(error ?? "Session expirée."); setTimeout(() => stableLogout(), 2500); }
          return;
        }
        if (!res.ok && !ignore) router.replace("/");
      } catch {
        if (!ignore) setErrorMessage("Impossible de vérifier votre session.");
      }
    })();
    return () => { ignore = true; };
  }, [router, stableLogout]);

  useEffect(() => {
    if (!profileOpen) return;
    const h = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("#profile-area")) setProfileOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [profileOpen]);

  const visibleItems = MENU_ITEMS.filter(item => {
    if (isLoading) return item.permission === null;
    return checkPermission(userPerms, userRoles, item.permission);
  });

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
      {errorMessage && <ErrorToast message={errorMessage} onClose={() => setErrorMessage(null)} />}

      <aside className={clsx(
        "fixed top-0 left-0 z-40 h-full flex flex-col",
        "bg-[#F5F5F5] dark:bg-slate-900 border-gray-200 dark:border-slate-800",
        "transition-all duration-300 ease-in-out",
        collapsed ? "md:w-20" : "md:w-64",
        "w-64 md:left-0 md:border-r",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="hidden md:flex items-center justify-center h-16 pt-6 flex-shrink-0">
          <Image src="/medias/images/logo_navbar.png" alt="Logo"
            width={collapsed ? 50 : 100} height={50}
            className="transition-all duration-300 object-contain" />
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 px-1">
              {[1,2,3,4].map(i => <div key={i} className="h-9 rounded-lg bg-gray-200 dark:bg-slate-800 animate-pulse" />)}
            </div>
          ) : (
            visibleItems.map(item => {
              const isActive = !!pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150",
                    isActive
                      ? "bg-[#FE0002]/10 text-[#FE0002] font-semibold"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-[#FE0002]"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="text-sm whitespace-nowrap">{item.name}</span>}
                  {isActive && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FE0002]" />}
                </Link>
              );
            })
          )}
        </nav>

        <div id="profile-area" className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-slate-800">
          <div className="relative">
            <button onClick={() => setProfileOpen(p => !p)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow"
                style={{ background: avatarBg }} suppressHydrationWarning>
                <span suppressHydrationWarning>{initials}</span>
              </div>
              {!collapsed && (
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate" suppressHydrationWarning>
                    {displayNameSafe}
                  </p>
                  <p className="text-[13px] text-gray-400 truncate" suppressHydrationWarning>
                    {displayRoleSafe}
                  </p>
                </div>
              )}
            </button>

            {profileOpen && !collapsed && (
              <div className="absolute bottom-full left-0 mb-2 w-full rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shadow"
                      style={{ background: avatarBg }}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{displayNameSafe}</p>
                      <p className="text-sm text-gray-400 truncate">{displayEmailSafe}</p>
                      {displayRoleSafe && <div className="mt-1"><RoleBadge role={displayRoleSafe} /></div>}
                    </div>
                  </div>
                </div>

                {/* Compteur permissions */}
                {user?.permissions && user.permissions.length > 0 && (
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">
                        {user.permissions.length} permission{user.permissions.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                )}

                
                <div className="py-1">
                  <button onClick={() => { setProfileOpen(false); router.push("/profil"); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                    <UserCircleIcon className="w-4 h-4 text-gray-400" />Mon Profil
                  </button>
                  <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                  <button onClick={() => { setProfileOpen(false); logout(); }}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className={clsx("flex-1 flex flex-col transition-all duration-300", collapsed ? "md:ml-20" : "md:ml-64")}>
        <header className="bg-white/70 backdrop-blur-[6px] dark:bg-slate-900/90 h-14 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.06)] flex-shrink-0">
          <div className="md:hidden">
            <Link href="/dashboard">
              <Image src="/medias/images/logo_navbar.png" alt="Logo" width={65} height={30} />
            </Link>
          </div>
          <div className="hidden md:flex">
            <button onClick={() => setCollapsed(c => !c)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition">
              {collapsed ? <PanelRight className="w-5 h-5 text-gray-400 hover:text-[#FE0002]" /> : <PanelLeft className="w-5 h-5 text-gray-400 hover:text-[#FE0002]" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(o => !o)} className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition">
              {sidebarOpen ? <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" /> : <Bars3Icon className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto sm:p-2">{children}</main>
      </div>
    </div>
  );
}
