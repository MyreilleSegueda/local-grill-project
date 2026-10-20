"use client";
import {
  HomeIcon,
  UsersIcon,
  KeyIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEffect } from 'react';

const adminMenu = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
  { name: 'Utilisateurs', href: '/admin/users', icon: UsersIcon },
  { name: 'Rôles & Permissions', href: '/admin/roles', icon: KeyIcon },
  { name: 'Sessions', href: '/admin/sessions', icon: ShieldCheckIcon },
  { name: 'Logs', href: '/admin/logs', icon: DocumentTextIcon },
  { name: 'Paramètres', href: '/admin/settings', icon: Cog6ToothIcon },
];

export default function SidebarLayoutAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, user } = useAuth();

  // Redirection si non connecté
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/admin/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return null;
  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    router.replace("/admin/login");
  };

  return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">

    <motion.div
      className="flex h-screen bg-gray-50 dark:bg-slate-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.aside
        className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col justify-between shadow-xl"
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <div className="flex items-center justify-center h-16 border-b border-gray-200 dark:border-slate-800">
            <span className="font-bold text-xl text-[#FE0002] tracking-wide animate-pulse">PG-ADMIN</span>
          </div>
          <nav className="mt-6 px-3 space-y-2">
            {adminMenu.map((item, idx) => {
              const isActive = pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.name}
                  whileHover={{ scale: 1.04 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link
                    href={item.href}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors group font-medium',
                      isActive
                        ? 'bg-[#FE0002]/10 text-[#FE0002] shadow-md'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-[#FE0002]'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                </motion.div>
              );
            })}
          </nav>
        </div>
        <motion.div
          className="p-4 border-t border-gray-200 dark:border-slate-800"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <button
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition font-semibold"
            onClick={handleLogout}
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5 text-red-600" />
            <span className="text-red-600">Déconnexion</span>
          </button>
        </motion.div>
      </motion.aside>
      <motion.main
        className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-slate-950"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {children}
      </motion.main>
    </motion.div>
  </div>
  );
}
