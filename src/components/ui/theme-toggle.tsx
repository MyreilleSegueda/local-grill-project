"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./button";

// Constants for better maintainability
const THEME_KEYS = {
  LOCAL_STORAGE: "theme",
  DARK: "dark",
  LIGHT: "light",
} as const;

const CLASS_NAMES = {
  DARK: "dark",
} as const;

// Custom hook for theme management
const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Initialize theme on client side only
  useEffect(() => {
    const initializeTheme = () => {
      try {
        const savedTheme = localStorage.getItem(THEME_KEYS.LOCAL_STORAGE);

        if (savedTheme) {
          setIsDarkMode(savedTheme === THEME_KEYS.DARK);
        } else {
          const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)",
          ).matches;
          setIsDarkMode(prefersDark);
        }
      } catch (error) {
        console.error("Error initializing theme:", error);
        // Fallback to system preference if localStorage fails
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        setIsDarkMode(prefersDark);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeTheme();
  }, []);

  // Apply theme changes to DOM and localStorage
  useEffect(() => {
    if (!isInitialized) return;

    const rootElement = document.documentElement;

    try {
      localStorage.setItem(
        THEME_KEYS.LOCAL_STORAGE,
        isDarkMode ? THEME_KEYS.DARK : THEME_KEYS.LIGHT,
      );
    } catch (error) {
      console.error("Error saving theme to localStorage:", error);
    }

    if (isDarkMode) {
      rootElement.classList.add(CLASS_NAMES.DARK);
    } else {
      rootElement.classList.remove(CLASS_NAMES.DARK);
    }
  }, [isDarkMode, isInitialized]);

  // Listen for system theme changes
  useEffect(() => {
    if (!isInitialized) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      // Only update if user hasn't manually set a preference
      const hasManualPreference =
        localStorage.getItem(THEME_KEYS.LOCAL_STORAGE) !== null;
      if (!hasManualPreference) {
        setIsDarkMode(event.matches);
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [isInitialized]);

  const toggleTheme = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  return { isDarkMode, toggleTheme, isInitialized };
};

// Main component
export default function ThemeToggle() {
  const { isDarkMode, toggleTheme, isInitialized } = useTheme();

  const buttonLabels = {
    dark: "Changer en mode clair",
    light: "Changer en mode sombre",
  };

  const iconSize = 20;

  // Prevent hydration mismatch by not rendering until initialized
  if (!isInitialized) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Chargement du thème"
        disabled
      >
        <div className="w-5 h-5" /> {/* Placeholder */}
      </Button>
    );
  }

  return (
    <Button
      onClick={toggleTheme}
      variant="ghost"
      size="icon"
      aria-label={isDarkMode ? buttonLabels.dark : buttonLabels.light}
      title={isDarkMode ? buttonLabels.dark : buttonLabels.light}
    >
      {isDarkMode ? (
        <Sun size={iconSize} aria-hidden="true" />
      ) : (
        <Moon size={iconSize} aria-hidden="true" />
      )}
    </Button>
  );
}
