import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider }       from "@/lib/context/AuthContext";   // ← AuthProvider vient d'ici
import { ReactQueryProvider } from "@/lib/providers/ReactQueryProvider";

export const metadata: Metadata = {
  title: "LOCAL GRILL",
  description: "SYSTÈME DE GESTION",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased font-sans">
        <ReactQueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}