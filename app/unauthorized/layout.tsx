import React from "react";

export default function UnauthorizedLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div>Chargement...</div>}>
      {children}
    </React.Suspense>
  );
}
