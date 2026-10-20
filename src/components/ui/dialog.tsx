"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  // Bloque le scroll du body quand ouvert
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Fermeture avec ESC
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative z-10 w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-slate-700 p-6"
          >
            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            >
              ✕
            </button>

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

Dialog.Content = function DialogContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mt-2">{children}</div>;
};

Dialog.Title = function DialogTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="text-xl font-bold text-gray-900 dark:text-white mb-4"
    >
      {children}
    </motion.h2>
  );
};

Dialog.Description = function DialogDescription({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
      {children}
    </p>
  );
};

Dialog.Footer = function DialogFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mt-6 flex justify-end gap-3">{children}</div>;
};