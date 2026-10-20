"use client";

import { useState } from "react";

interface Toast {
  title: string;
  description?: string;
  variant?: "default" | "success" | "destructive";
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (config: Toast) => {
    setToasts([...toasts, config]);

    // Auto-remove après 3 secondes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t !== config));
    }, 3000);
  };

  return { toast, toasts };
}
