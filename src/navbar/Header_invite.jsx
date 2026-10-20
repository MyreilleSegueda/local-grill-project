"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation"; // pour Next.js 13+ app dir
import { Bars3Icon, XMarkIcon  } from "@heroicons/react/24/outline";
import { Button } from "@/src/components/ui/button";

export default function HeaderInvite() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter(); // pour navigation programmatique

  return (
    <header className="bg-white dark:bg-slate-950 shadow-md fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo image cliquable */}
          <div
            className="flex-shrink-0 relative w-36 h-10 cursor-pointer" // taille responsive initiale
            onClick={() => router.push("/")}
          >
            <Image
              src="/medias/images/logo_navbar.png"
              alt="Local Grill Logo"
              fill
              style={{ objectFit: "contain" }}
              priority
            />
          </div>

          {/* Desktop login Button */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              className="px-4 py-2 bg-[#FE0002] text-white rounded-md hover:bg-[#ff3333] transition-colors duration-300"
              onClick={() => router.push("/dashboard")}
            >
              Se connecter
            </Button>
          </div>

          {/* Mobile menu Button */}
          <div className="md:hidden flex items-center">
            <Button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 dark:text-gray-200 focus:outline-none"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-950 shadow-inner">
          <nav className="flex flex-col p-4">
            <Button className="px-4 py-2 bg-[#FE0002] text-white rounded-md hover:bg-[#ff3333] transition-colors duration-300"
            onClick={() => router.push("/dashboard")}>
              
              Se connecter
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
