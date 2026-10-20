"use client";

import { createContext, useContext } from "react";
import Search from "../form/search";

type TableHeaderContextType = {
  variant?: "default" | "compact";
};

const TableHeaderContext = createContext<TableHeaderContextType>({});

interface TableHeaderProps extends TableHeaderContextType {
  children: React.ReactNode;
  className?: string;
}

export function SectionTableHeader({
  children,
  variant = "default",
  className = "",
}: TableHeaderProps) {
  return (
    <TableHeaderContext.Provider value={{ variant }}>
      <div
        className={`
         flex flex-col gap-4 p-4  border-b
        sm:flex-row sm:items-center sm:justify-between
        ${variant === "compact" ? "p-3" : ""}
        ${className}
      `}
      >
        {children}
      </div>
    </TableHeaderContext.Provider>
  );
}

// Hook pour utiliser le contexte
function useTableHeader() {
  const context = useContext(TableHeaderContext);
  if (!context) {
    throw new Error("TableHeader components must be used within TableHeader");
  }
  return context;
}

// Composant Title
export function SectionTableHeaderTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { variant } = useTableHeader();

  return (
    <h2
      className={`
      font-medium 
      ${variant === "compact" ? "text-base" : "text-lg"}
      ${className}
    `}
    >
      {children}
    </h2>
  );
}

// Composant Left
export function SectionTableHeaderLeft({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>{children}</div>
  );
}

// Composant Right
export function SectionTableHeaderRight({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-1 items-center justify-end gap-3 ${className}`}>
      {children}
    </div>
  );
}

// Composant Search avec wrapper
export function SectionTableHeaderSearch({
  onSearch,
  placeholder = "Rechercher...",
  className = "",
}: {
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`sm:max-w-md ${className}`}>
      <Search onSearch={onSearch} placeholder={placeholder} />
    </div>
  );
}

// Composant Actions (pour boutons, etc.)
export function SectionTableHeaderActions({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>{children}</div>
  );
}

// Export groupé pour une utilisation facile
export const SectionTableHeaderComponents = {
  Root: SectionTableHeader,
  Title: SectionTableHeaderTitle,
  Left: SectionTableHeaderLeft,
  Right: SectionTableHeaderRight,
  Search: SectionTableHeaderSearch,
  Actions: SectionTableHeaderActions,
} as const;
