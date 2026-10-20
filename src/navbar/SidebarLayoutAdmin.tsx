"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { PanelLeft, PanelRight, UserCircleIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  KeyIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

import { useRouter } from "next/navigation";

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const menuItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
  { name: 'Utilisateurs', href: '/admin/users', icon: UsersIcon },
  { name: 'Rôles & Permissions', href: '/admin/roles', icon: KeyIcon },
  { name: 'Sessions', href: '/admin/sessions', icon: ShieldCheckIcon },
  { name: 'Logs', href: '/admin/logs', icon: DocumentTextIcon },
  { name: 'Paramètres', href: '/admin/settings', icon: Cog6ToothIcon },
  ];

    // Redirection si non connecté
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login/pg-admin");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return null;
  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    router.replace("/login/pg-admin");
  };


  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">

      {/* ================= SIDEBAR ================= */}
      <aside
        aria-hidden={!sidebarOpen && undefined}
        className={clsx(
          "fixed top-0 left-0 z-40 h-full flex flex-col justify-between",
          "bg-[#F5F5F5] dark:bg-slate-900 border-gray-200 dark:border-slate-800",
          "transition-transform duration-300 ease-in-out",
          // widths: small screens use full width w-64, md uses collapsed width
          collapsed ? "md:w-20" : "md:w-64",
          "w-64",
          // borders on desktop
          "md:left-0 md:border-r",
          // slide from left on mobile; always visible on md+
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Top Section */}
        <div>
          {/* Logo (desktop only) */}
          <div className="hidden md:flex items-center justify-center h-16 pt-6">
            <Image
              src="/medias/images/logo_navbar.png"
              alt="Logo"
              width={collapsed ? 65 : 100}
              height={40}
              className="transition-all duration-300"
            />
          </div>

          {/* Navigation */}
          <nav className="mt-6 px-3 space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ease-in-out duration-150 group",
                    isActive
                      ? "bg-[#FE0002]/10 text-[#FE0002]"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-[#FE0002]"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <span className="whitespace-nowrap">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          >
            <div className="w-8 h-8 rounded-full bg-[#FE0002] text-white flex items-center justify-center font-bold">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>


            {!collapsed && (
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {user?.full_name || "Utilisateur"}
                </p>
                <p className="text-sm text-gray-500">{user?.role || "Profil"}</p>
              </div>
            )}
          </button>

          {/* Dropdown */}
          {profileOpen && !collapsed && (
            <div className="mt-3 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-gray-200 dark:border-slate-700 py-2">
                  <button
                    onClick={() => { setProfileOpen(false); router.push("/admin/profil"); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                    <UserCircleIcon className="w-4 h-4 text-gray-400" />
                    Mon Profil
                  </button>
              <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
              <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition" onClick={handleLogout}>
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ================= MAIN ================= */}
      <div
        className={clsx(
          "flex-1 flex flex-col transition-all duration-300",
          collapsed ? "md:ml-20" : "md:ml-64"
        )}
      >
        {/* ================= HEADER ================= */}
        <header className="bg-white/70 backdrop-blur-[6px] dark:bg-slate-900/90  h-14 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-2 shadow-[0_1px_2px_0_rgba(0,0,0,0.08)]">

          {/* Logo mobile */}
          <div className="md:hidden flex items-center">
            <Image
              src="/medias/images/logo_navbar.png"
              alt="Logo"
              width={65}
              height={30}
            />
          </div>

          {/* Collapse desktop */}
          <div className="hidden md:flex">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              {collapsed ? (
                <PanelRight className="w-5 h-5 text-gray-400 hover:text-[#FE0002]" />
              ) : (
                <PanelLeft className="w-5 h-5 text-gray-400 hover:text-[#FE0002]" />
              )}
            </button>
          </div>




          {/* Toggle mobile (RIGHT) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="md:hidden rounded-full p-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          >
            {sidebarOpen ? (
              <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            ) : (
              <Bars3Icon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </header>

        {/* CONTENT */}
        <main className="flex-1 sm:p-2 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
