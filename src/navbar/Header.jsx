"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation"; // pour Next.js 13+ app dir
import { Bars3Icon, XMarkIcon  } from "@heroicons/react/24/outline";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter(); // pour navigation programmatique

  const menuItems = [
    { name: "Gestion des alertes", href: "/alertes" },
  ];

  return (
<header className="bg-white/70 backdrop-blur-[6px] h-12 dark:bg-slate-900/90 fixed w-full z-50 
shadow-[0_2px_2px_0_rgba(0,0,0,0.08)] dark:shadow-[0_2px_2px_0_rgba(0,0,0,0.4)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-12 items-center">



          {/* Desktop Menu */}
          <nav className="hidden md:flex space-x-6">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-gray-700 dark:text-gray-200 hover:text-[#FE0002] dark:hover:text-[#FE0002] font-medium transition-colors duration-300"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Desktop Profil Button */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="px-4 py-2 bg-[#FE0002] text-white rounded-md hover:bg-[#ff3333] transition-colors duration-300">
              Profil
            </button>
          </div>

          {/* Mobile menu button 
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 dark:text-gray-200 focus:outline-none"
            >
              {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>*/}
        </div>
      </div>

      {/* Mobile Menu
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-950 shadow-inner animate-fadeIn">
          <nav className="flex flex-col space-y-2 p-4">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-gray-700 dark:text-gray-200 hover:text-[#FE0002] dark:hover:text-[#FE0002] font-medium py-2 transition-colors duration-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
            <button className="mt-2 px-4 py-2 bg-[#FE0002] text-white rounded-md hover:bg-[#ff3333] transition-colors duration-300">
              Profil
            </button>
          </nav>
        </div>
      )} */}
    </header>
  );
}
