/**
 * app/unauthorized/page.tsx
 * Page affichée quand le middleware bloque l'accès pour raison de permissions.
 */
"use client";
import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldExclamationIcon, ArrowLeftIcon, HomeIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/lib/hooks/useAuth";
import { motion } from "framer-motion";

export default function UnauthorizedPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin } = useAuth();
  const from = searchParams.get("from") ?? "";
  return (
    <React.Suspense fallback={<div>Chargement...</div>}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md text-center"
        >
          {/* Icône */}
          <div className="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 flex items-center justify-center mx-auto mb-6">
            <ShieldExclamationIcon className="w-10 h-10 text-red-500" />
          </div>
          {/* Titre */}
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
            Accès refusé
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
          {from && (
            <p className="text-sm text-gray-400 font-mono bg-gray-100 dark:bg-slate-800 inline-block px-3 py-1 rounded-lg mt-1 mb-6">
              {from}
            </p>
          )}
          {/* Infos utilisateur */}
          {user && (
            <div className="mb-6 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-left space-y-2">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Votre profil</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Utilisateur</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{user.fullName || user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Rôle</span>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">{user.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Permissions</span>
                <span className="text-sm text-gray-500">{user.permissions?.length ?? 0} actives</span>
              </div>
            </div>
          )}
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Retour
            </button>
            <button
              onClick={() => router.replace(isAdmin ? "/admin/dashboard" : "/dashboard")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold bg-[#FE0002] hover:bg-red-700 text-white transition-all shadow-lg shadow-red-500/20"
            >
              <HomeIcon className="w-4 h-4" />
              Accueil
            </button>
          </div>
          <p className="mt-6 text-sm text-gray-400">
            Si vous pensez que c'est une erreur, contactez votre administrateur.
          </p>
        </motion.div>
      </div>
    </React.Suspense>
  );
}