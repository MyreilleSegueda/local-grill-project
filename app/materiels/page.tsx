"use client";

/**
 * app/materiels/page.tsx — Gestion du matériel
 * Design refondu : mobile-first cards, skeletons, animations, pagination complète
 */

import { useEffect, useState, useCallback } from "react";
import SidebarLayout from "@/src/navbar/SidebarLayout";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePagePermissions } from "@/lib/hooks/usePagePermissions";
import { motion, AnimatePresence } from "framer-motion";
import {
  MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, TrashIcon,
  CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon,
  ChevronLeftIcon, ChevronRightIcon, TagIcon,
  ArrowPathIcon, XMarkIcon, QuestionMarkCircleIcon, FireIcon,
  ClockIcon, ArrowDownTrayIcon, ArrowUpTrayIcon,
  ChevronRightIcon as ChevRight, EyeIcon, LockClosedIcon,
  BuildingStorefrontIcon, CubeTransparentIcon,
} from "@heroicons/react/24/outline";
import { Utensils, Package, AlertTriangle, TrendingDown } from "lucide-react";
import { Tab } from "@headlessui/react";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Category {
  id: number; name: string; description?: string; _count?: { materiels: number };
}
interface Materiel {
  id: number; name: string; category_id: number; category?: Category;
  reference?: string; description?: string; quantity: number;
  minimum_stock: number; unit: string; location?: string;
  purchase_price?: number; purchase_date?: string; supplier?: string;
  is_active: boolean; created_at: string; updated_at: string;
  mouvements?: Movement[];
}


interface Movement {
  id: number; materiel_id: number;
  type: "IN" | "OUT" | "LOSS" | "BROKEN" | "OLD" | "ADJUSTMENT";
  quantity: number; reason?: string; reference_number?: string;
  user_id: number; user?: { id: number; fullName: string };
  created_at: string; materiel?: Materiel;
}
interface Pagination {
  page: number; pageSize: number; totalCount: number; totalPages: number;
}

/* ─── Config ─────────────────────────────────────────────────────────────── */
const MOVEMENT_TYPES = {
  IN:         { label: "Entrée",     color: "emerald", icon: ArrowDownTrayIcon,     desc: "Nouvel arrivage ou retour" },
  OUT:        { label: "Sortie",     color: "blue",    icon: ArrowUpTrayIcon,        desc: "Utilisation normale" },
  LOSS:       { label: "Perte",      color: "red",     icon: QuestionMarkCircleIcon, desc: "Matériel perdu" },
  BROKEN:     { label: "Cassé",      color: "orange",  icon: FireIcon,               desc: "Matériel endommagé" },
  OLD:        { label: "Obsolète",   color: "gray",    icon: ClockIcon,              desc: "Matériel vieux/obsolète" },
  ADJUSTMENT: { label: "Ajustement", color: "purple",  icon: ArrowPathIcon,          desc: "Correction inventaire" },
};
const OUT_MOVEMENT_TYPES = ["OUT", "LOSS", "BROKEN", "OLD"];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const avatarGrad = (n: string) => {
  const g = [
    "from-orange-400 to-amber-500",
    "from-teal-400 to-cyan-500",
    "from-violet-400 to-purple-500",
    "from-rose-400 to-pink-500",
    "from-emerald-400 to-green-500",
    "from-sky-400 to-blue-500",
  ];
  return g[(n?.charCodeAt(0) || 0) % g.length];
};

const stockStatus = (qty: number, min: number) => {
  const qtyNum = Number(qty);
  const minNum = Number(min);
  if (qtyNum === 0) return { label: "Épuisé",     cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",     dot: "bg-red-500" };
  if (qtyNum <= minNum) return { label: "Stock bas",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-500" };
  return          { label: "Disponible",        cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" };
};

/* ─── Skeleton components ────────────────────────────────────────────────── */
function SkeletonTableRow() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800">
      {[48, 36, 24, 20, 28, 20].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className={`h-4 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse`} style={{ width: `${w}%` }} />
        </td>
      ))}
    </tr>
  );
}

function SkeletonMobileCard() {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden animate-pulse">
      <div className="h-1 bg-slate-200 dark:bg-slate-700" />
      <div className="p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-3.5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="w-16 h-6 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

function SkeletonMovementRow() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800">
      {[20, 36, 22, 16, 30, 26].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" style={{ width: `${w}%` }} />
        </td>
      ))}
    </tr>
  );
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */
function Toast({ message, type, visible }: { message: string; type: "success" | "error"; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-5 sm:w-auto z-[200]
            flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold
            ${type === "success" ? "bg-emerald-500/95 border border-emerald-400/40" : "bg-red-500/95 border border-red-400/40"}`}
        >
          {type === "success" ? <CheckCircleIcon className="w-5 h-5 flex-shrink-0" /> : <XCircleIcon className="w-5 h-5 flex-shrink-0" />}
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── AccessDenied ───────────────────────────────────────────────────────── */
function AccessDenied({ permission }: { permission: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
        <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-400">Accès refusé</h3>
        <p className="text-sm text-slate-600 mt-1">
          Permission requise :{" "}
          <code className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{permission}</code>
        </p>
      </div>
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */
function Modal({ open, onClose, children, title, icon: Icon, accentClass = "from-orange-400 via-amber-400 to-yellow-400" }: {
  open: boolean; onClose: () => void; children: React.ReactNode;
  title: string; icon?: React.ElementType; accentClass?: string;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) { window.addEventListener("keydown", h); document.body.style.overflow = "hidden"; }
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="pointer-events-auto relative w-full sm:max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-[0_-20px_60px_-8px_rgba(0,0,0,0.35)] border border-slate-200/60 dark:border-slate-700/60 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>
              <div className={`hidden sm:block absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${accentClass} rounded-t-3xl`} />
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-orange-600 dark:text-orange-400" />
                    </div>
                  )}
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition hover:rotate-90 duration-200">
                  <XMarkIcon className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="px-5 pb-8 pt-4 max-h-[82vh] overflow-y-auto">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Badges ─────────────────────────────────────────────────────────────── */
function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-semibold
      ${isActive
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-600"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
      {isActive ? "Actif" : "Inactif"}
    </span>
  );
}

function StockBadge({ quantity, minimum }: { quantity: number; minimum: number }) {
  const s = stockStatus(quantity, minimum);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-semibold ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function MovBadge({ type }: { type: string }) {
  const c = MOVEMENT_TYPES[type as keyof typeof MOVEMENT_TYPES];
  if (!c) return <span className="text-sm text-slate-600">{type}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-semibold
      bg-${c.color}-100 text-${c.color}-700 dark:bg-${c.color}-900/30 dark:text-${c.color}-400`}>
      <c.icon className="w-3 h-3" />{c.label}
    </span>
  );
}

function MaterielCard({ m, index, onView, onEdit, canEdit }: {
  m: Materiel; index: number; onView: () => void; onEdit: () => void; canEdit: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition"
    >
      {/* Top accent */}
      <div className={`h-1 bg-gradient-to-r ${avatarGrad(m.name)}`} />

      <div className="p-4 space-y-3">

        {/* ───── HEADER ───── */}
        <div className="flex items-start gap-3">

          {/* Icon */}
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarGrad(m.name)} flex items-center justify-center flex-shrink-0`}>
            <Utensils className="w-5 h-5 text-white" />
          </div>

          {/* TEXT BLOCK (FIX IMPORTANT) */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-slate-900 dark:text-white break-words leading-tight">
              {m.name}
            </p>

            {m.reference && (
              <p className="text-sm text-slate-600 mt-1 font-mono truncate">
                Réf: {m.reference}
              </p>
            )}
          </div>

          {/* Badge */}
          <div className="flex-shrink-0">
            <StockBadge quantity={m.quantity} minimum={m.minimum_stock} />
          </div>
        </div>

        {/* ───── GRID INFOS ───── */}
        <div className="grid grid-cols-2 gap-2">

          <InfoItem label="Catégorie" value={m.category?.name || "—"} />
          <InfoItem label="Quantité en stock" value={`${m.quantity} ${m.unit}`} />
          <InfoItem label="Stock min" value={String(m.minimum_stock)} />
          <InfoItem label="Emplacement" value={m.location || "—"} />

        </div>

        {/* ───── FOOTER ───── */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">

          <StatusBadge isActive={m.is_active} />

          <div className="flex gap-2 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onView}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <EyeIcon className="w-4 h-4" />
            </motion.button>

            {canEdit ? (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onEdit}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition"
              >
                <PencilSquareIcon className="w-4 h-4" />
              </motion.button>
            ) : (
              <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                <LockClosedIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}


function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 min-w-0">
      <p className="text-[12px] text-slate-600 uppercase font-semibold tracking-wide">
        {label}
      </p>

      {/* FIX overflow */}
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-400 break-words leading-snug">
        {value}
      </p>
    </div>
  );
}


/* ─── Mobile Movement Card ───────────────────────────────────────────────── */
function MovementCard({ m, index }: { m: Movement; index: number }) {
  const isIn = m.type === "IN" || m.type === "ADJUSTMENT";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
    >
      <div className={`h-1 ${isIn ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-gradient-to-r from-red-400 to-rose-400"}`} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isIn ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
              {isIn ? <ArrowDownTrayIcon className="w-4.5 h-4.5 text-emerald-600" /> : <ArrowUpTrayIcon className="w-4.5 h-4.5 text-red-600" />}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">{m.materiel?.name || "—"}</p>
              <p className="text-sm text-slate-600">{new Date(m.created_at).toLocaleDateString("fr-FR")}</p>
            </div>
          </div>
          <span className={`text-base font-extrabold ${isIn ? "text-emerald-600" : "text-red-600"}`}>
            {isIn ? "+" : "-"}{m.quantity}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <MovBadge type={m.type} />
          <span className="text-sm text-slate-600">{m.user?.fullName || "—"}</span>
        </div>
        {m.reason && <p className="text-sm text-slate-500 mt-2 italic">{m.reason}</p>}
      </div>
    </motion.div>
  );
}

/* ─── Pagination component ───────────────────────────────────────────────── */
function PaginationBar({ pagination, onChange }: {
  pagination: Pagination;
  onChange: (p: number) => void;
}) {
  const { page, totalPages, totalCount, pageSize } = pagination;
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, totalCount);

  const visiblePages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let i = start; i <= Math.min(start + 4, totalPages); i++) visiblePages.push(i);

  const btnBase = (active = false, disabled = false) =>
    `flex items-center justify-center w-8 h-8 rounded-xl text-sm font-bold transition-all
    ${active ? "bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/40" : ""}
    ${!active && !disabled ? "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700" : ""}
    ${disabled ? "opacity-35 cursor-not-allowed bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600" : "cursor-pointer"}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
      <span className="text-sm text-slate-600">
        {totalCount > 0 ? <><strong className="text-slate-600 dark:text-slate-500">{from}–{to}</strong> sur <strong className="text-slate-600 dark:text-slate-500">{totalCount}</strong></> : "Aucun résultat"}
      </span>
      <div className="flex items-center gap-1.5">
        <button disabled={page <= 1} onClick={() => onChange(1)} className={btnBase(false, page <= 1)}>«</button>
        <button disabled={page <= 1} onClick={() => onChange(page - 1)} className={btnBase(false, page <= 1)}>
          <ChevronLeftIcon className="w-3.5 h-3.5" />
        </button>
        {visiblePages.map(p => (
          <button key={p} onClick={() => onChange(p)} className={btnBase(p === page)}>{p}</button>
        ))}
        <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={btnBase(false, page >= totalPages)}>
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </button>
        <button disabled={page >= totalPages} onClick={() => onChange(totalPages)} className={btnBase(false, page >= totalPages)}>»</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
                       PAGE PRINCIPALE
════════════════════════════════════════════════════════ */
export default function MaterielsPage() {
  const { token } = useAuth();
  const { can } = usePagePermissions();

  const canView   = can("MATERIALS_VIEW");
  const canCreate = can("MATERIALS_CREATE");
  const canEdit   = can("MATERIALS_EDIT");
  const canDelete = can("MATERIALS_DELETE");

  const [activeTab,          setActiveTab         ] = useState(0);
  const [materiels,          setMateriels         ] = useState<Materiel[]>([]);
  const [allMateriels,       setAllMateriels      ] = useState<Materiel[]>([]);
  const [categories,         setCategories        ] = useState<Category[]>([]);
  const [movements,          setMovements         ] = useState<Movement[]>([]);
  const [loading,            setLoading           ] = useState(true);
  const [movLoading,         setMovLoading        ] = useState(false);
  const [isSaving,           setIsSaving          ] = useState(false);
  const [isDeleting,         setIsDeleting        ] = useState(false);
  const [isSubmittingEntry,  setIsSubmittingEntry ] = useState(false);
  const [isSubmittingExit,   setIsSubmittingExit  ] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [pagination,         setPagination        ] = useState<Pagination>({ page: 1, pageSize: 10, totalCount: 0, totalPages: 0 });
  const [movPagination,      setMovPagination     ] = useState<Pagination>({ page: 1, pageSize: 10, totalCount: 0, totalPages: 0 });
  const [search,             setSearch            ] = useState("");
  const [selectedCategory,   setSelectedCategory  ] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("");
  const [toast,              setToast             ] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showToast,          setShowToast         ] = useState(false);
  const [modalOpen,          setModalOpen         ] = useState(false);
  const [modalMode,          setModalMode         ] = useState<"add" | "edit" | "view">("add");
  const [selectedMateriel,   setSelectedMateriel  ] = useState<Materiel | null>(null);
  const [entryModalOpen,     setEntryModalOpen    ] = useState(false);
  const [exitModalOpen,      setExitModalOpen     ] = useState(false);
  const [categoryModalOpen,  setCategoryModalOpen ] = useState(false);
  const [deleteConfirmOpen,  setDeleteConfirmOpen ] = useState(false);
  const [units,              setUnits             ] = useState<{ id: number; name: string; abbreviation: string }[]>([]);

  const [formData, setFormData] = useState({
    name: "", category_id: "", reference: "", description: "",
    quantity: "0", minimum_stock: "5", unit_id: "", unit: "",
    location: "", purchase_price: "", purchase_date: "", supplier: "",
  });
  const [entryForm, setEntryForm] = useState({ materiel_id: "", quantity: "", reason: "Nouvel achat", reference_number: "" });
  const [exitForm,  setExitForm ] = useState({ materiel_id: "", quantity: "", type: "OUT", reason: "", reference_number: "" });
  const [catForm,   setCatForm  ] = useState({ name: "", description: "" });

  const notify = (msg: string, type: "success" | "error") => {
    setToast({ msg, type }); setShowToast(true);
    setTimeout(() => setShowToast(false), 3200);
  };

  const loadUnits = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch("/api/admin/settings/units", { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setUnits(d.data?.units || d || []); }
    } catch { setUnits([]); }
  }, [token]);

  const loadAllMateriels = useCallback(async () => {
    if (!token || !canView) return;
    try {
      const p = new URLSearchParams();
      if (search) p.append("search", search);
      if (selectedCategory) p.append("category_id", selectedCategory);
      p.append("page", "1"); p.append("page_size", "1000");
      const res = await fetch(`/api/materiels?${p}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setAllMateriels(d.data.materiels); }
    } catch {}
  }, [token, search, selectedCategory, canView]);

  const loadMateriels = useCallback(async () => {
    if (!token || !canView) return;
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.append("search", search);
      if (selectedCategory) p.append("category_id", selectedCategory);
      p.append("page", String(pagination.page));
      p.append("page_size", String(pagination.pageSize));
      const res = await fetch(`/api/materiels?${p}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setMateriels(d.data.materiels);
        setCategories(d.data.categories);
        setPagination(d.data.pagination);
      }
    } catch {}
    finally { setLoading(false); }
  }, [token, search, selectedCategory, pagination.page, pagination.pageSize, canView]);

  const loadMovements = useCallback(async () => {
    if (!token || !canView) return;
    setMovLoading(true);
    try {
      const p = new URLSearchParams();
      if (movementTypeFilter) p.append("type", movementTypeFilter);
      p.append("page", String(movPagination.page));
      p.append("page_size", String(movPagination.pageSize));
      const res = await fetch(`/api/materiels/movements?${p}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setMovements(d.data.movements);
        setMovPagination(d.data.pagination);
      }
    } catch {}
    finally { setMovLoading(false); }
  }, [token, movementTypeFilter, movPagination.page, movPagination.pageSize, canView]);

  useEffect(() => { loadMateriels(); loadUnits(); loadAllMateriels(); }, [loadMateriels]);
  useEffect(() => { if (activeTab === 1 || activeTab === 2) loadMovements(); }, [activeTab, loadMovements]);

  /* CRUD */
  const handleSaveMateriel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === "edit" && !canEdit) { notify("Permission MATERIALS_EDIT requise", "error"); return; }
    if (modalMode === "add" && !canCreate) { notify("Permission MATERIALS_CREATE requise", "error"); return; }
    setIsSaving(true);
    try {
      const url = modalMode === "edit" && selectedMateriel ? `/api/materiels/${selectedMateriel.id}` : "/api/materiels";
      const res = await fetch(url, {
        method: modalMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          category_id: parseInt(formData.category_id),
          quantity: parseFloat(formData.quantity),
          minimum_stock: parseFloat(formData.minimum_stock),
          unit: formData.unit || units.find(u => u.id === parseInt(formData.unit_id))?.abbreviation || "unité",
          purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        }),
      });
      if (res.ok) { setModalOpen(false); loadMateriels(); loadAllMateriels(); notify(modalMode === "edit" ? "Matériel modifié !" : "Matériel créé !", "success"); }
      else { const err = await res.json(); notify(err.error || "Erreur lors de la sauvegarde", "error"); }
    } catch { notify("Erreur réseau", "error"); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedMateriel || !canDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/materiels/${selectedMateriel.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setDeleteConfirmOpen(false); setModalOpen(false); loadMateriels(); loadAllMateriels(); notify("Matériel supprimé", "success"); }
      else notify("Erreur lors de la suppression", "error");
    } catch { notify("Erreur réseau", "error"); }
    finally { setIsDeleting(false); }
  };

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) { notify("Permission MATERIALS_CREATE requise", "error"); return; }
    setIsSubmittingEntry(true);
    try {
      const res = await fetch("/api/materiels/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...entryForm, materiel_id: parseInt(entryForm.materiel_id), quantity: parseFloat(entryForm.quantity), type: "IN" }),
      });
      if (res.ok) { setEntryModalOpen(false); loadMateriels(); loadAllMateriels(); loadMovements(); notify("Entrée enregistrée !", "success"); }
      else { const err = await res.json(); notify(err.error || "Erreur", "error"); }
    } catch { notify("Erreur réseau", "error"); }
    finally { setIsSubmittingEntry(false); }
  };

  const handleExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) { notify("Permission MATERIALS_EDIT requise", "error"); return; }
    setIsSubmittingExit(true);
    try {
      const res = await fetch("/api/materiels/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...exitForm, materiel_id: parseInt(exitForm.materiel_id), quantity: parseFloat(exitForm.quantity) }),
      });
      if (res.ok) { setExitModalOpen(false); loadMateriels(); loadAllMateriels(); loadMovements(); notify("Sortie enregistrée !", "success"); }
      else { const err = await res.json(); notify(err.error || "Erreur", "error"); }
    } catch { notify("Erreur réseau", "error"); }
    finally { setIsSubmittingExit(false); }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCategory(true);
    try {
      const res = await fetch("/api/materiels/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(catForm),
      });
      if (res.ok) {
        const result = await res.json();
        const category = result.data?.category as Category | undefined;
        if (category) {
          setCategories((current) => [...current.filter((item) => item.id !== category.id), category].sort((a, b) => a.name.localeCompare(b.name)));
          setFormData((current) => ({ ...current, category_id: String(category.id) }));
        }
        setCategoryModalOpen(false);
        void loadMateriels();
        notify("Catégorie créée !", "success");
        setCatForm({ name: "", description: "" });
      }
      else { const err = await res.json(); notify(err.error || "Erreur", "error"); }
    } catch { notify("Erreur réseau", "error"); }
    finally { setIsSubmittingCategory(false); }
  };

  const doExportXLSX = async () => {
    try {
      if (allMateriels.length === 0) {
        notify('Aucune donnee a exporter', 'error');
        return;
      }
      const res = await fetch('/api/exports/materiels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ format: 'xlsx', items: allMateriels }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `materiels-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notify(`Export XLSX reussi ! ${allMateriels.length} lignes exportees`, 'success');
    } catch {
      notify('Erreur lors de l\'export XLSX', 'error');
    }
  };

  const doExportPDF = async () => {
    try {
      if (allMateriels.length === 0) {
        notify('Aucune donnee a exporter', 'error');
        return;
      }
      const res = await fetch('/api/exports/materiels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ format: 'pdf', items: allMateriels }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `materiels-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notify(`Export PDF reussi ! ${allMateriels.length} lignes exportees`, 'success');
    } catch {
      notify('Erreur lors de l\'export PDF', 'error');
    }
  };

  const generateRef = (name: string) => {
    if (!name) return "";
    const prefix = name.split(" ").map(w => w[0]?.toUpperCase()).join("").substring(0, 4);
    return `MAT-${prefix}-${Math.floor(100 + Math.random() * 899)}`;
  };

  const openAddModal = () => {
    setModalMode("add");
    const def = units[0];
    setFormData({ name: "", category_id: "", reference: "", description: "", quantity: "0", minimum_stock: "5", unit_id: def ? String(def.id) : "", unit: def ? (def.abbreviation || def.name) : "unité", location: "", purchase_price: "", purchase_date: "", supplier: "" });
    setModalOpen(true);
  };
  const openEditModal = (m: Materiel) => {
    setModalMode("edit"); setSelectedMateriel(m);
    // Find unit_id from unit name
    const matchingUnit = units.find(u => u.abbreviation === m.unit || u.name === m.unit);
    setFormData({ name: m.name, category_id: String(m.category_id), reference: m.reference || "", description: m.description || "", quantity: String(m.quantity), minimum_stock: String(m.minimum_stock), unit_id: matchingUnit ? String(matchingUnit.id) : "", unit: m.unit, location: m.location || "", purchase_price: m.purchase_price ? String(m.purchase_price) : "", purchase_date: m.purchase_date ? m.purchase_date.split("T")[0] : "", supplier: m.supplier || "" });
    setModalOpen(true);
  };
  const openViewModal = (m: Materiel) => { setModalMode("view"); setSelectedMateriel(m); setModalOpen(true); };

  if (!canView) return <SidebarLayout><AccessDenied permission="MATERIALS_VIEW" /></SidebarLayout>;

  const inputCls = "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition placeholder:text-slate-600";
  const labelCls = "block text-sm font-bold text-slate-500 dark:text-slate-600 uppercase tracking-wide mb-1.5";

  const materielFormBody = (
    <form onSubmit={handleSaveMateriel} className="space-y-4">
      {/* Nom */}
      <div className="col-span-2">
        <label className={labelCls}>Nom du matériel *</label>
        <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputCls} placeholder="Ex: Fourchette inox" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* Catégorie */}
        <div>
          <label className={labelCls}>Catégorie *</label>
          <div className="flex gap-2">
            <select required value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })} className={`${inputCls} flex-1`}>
              <option value="">Choisir…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {canCreate && (
              <button type="button" onClick={() => setCategoryModalOpen(true)} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Nouvelle catégorie">
                <PlusIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {/* Référence */}
        <div>
          <label className={labelCls}>Référence</label>
          <input value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} className={inputCls} placeholder="MAT-XXX-000" />
          {modalMode === "add" && !formData.reference && formData.name && (
            <button type="button" onClick={() => setFormData({ ...formData, reference: generateRef(formData.name) })} className="mt-1 text-sm text-orange-600 hover:text-orange-700 font-semibold">
              ↻ Générer
            </button>
          )}
        </div>
        {/* Quantité */}
        <div>
          <label className={labelCls}>{modalMode === "edit" ? "Quantité en stock" : "Quantité initiale"}</label>
          <input type="number" min="0" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} className={`${inputCls} ${modalMode === "edit" ? "bg-slate-100 dark:bg-slate-900 cursor-not-allowed" : ""}`} readOnly={modalMode === "edit"} />
        </div>
        {/* Stock min */}
        <div>
          <label className={labelCls}>Stock minimum</label>
          <input type="number" min="0" value={formData.minimum_stock} onChange={e => setFormData({ ...formData, minimum_stock: e.target.value })} className={inputCls} />
        </div>
        {/* Unité */}
        <div>
          <label className={labelCls}>Unité *</label>
          <select required value={formData.unit_id} onChange={e => {
            const u = units.find(u => u.id === parseInt(e.target.value));
            setFormData({ ...formData, unit_id: e.target.value, unit: u ? (u.abbreviation || u.name) : "" });
          }} className={inputCls}>
            <option value="">Choisir…</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
          </select>
        </div>
        {/* Emplacement */}
        <div>
          <label className={labelCls}>Emplacement</label>
          <input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className={inputCls} placeholder="Ex: Cuisine…" />
        </div>
        {/* Prix */}
        <div>
          <label className={labelCls}>Prix d'achat (FCFA)</label>
          <input type="number" min="0" step="0.01" value={formData.purchase_price} onChange={e => setFormData({ ...formData, purchase_price: e.target.value })} className={inputCls} />
        </div>
        {/* Date */}
        <div>
          <label className={labelCls}>Date d'achat</label>
          <input type="date" value={formData.purchase_date} onChange={e => setFormData({ ...formData, purchase_date: e.target.value })} className={inputCls} />
        </div>
      </div>
      {/* Fournisseur */}
      <div>
        <label className={labelCls}>Fournisseur</label>
        <input value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} className={inputCls} placeholder="Nom du fournisseur" />
      </div>
      {/* Description */}
      <div>
        <label className={labelCls}>Description</label>
        <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className={`${inputCls} resize-none`} rows={2} placeholder="Description du matériel…" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-bold transition-all active:scale-95 shadow-lg shadow-orange-200 dark:shadow-orange-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {isSaving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
          {modalMode === "add" ? "Créer le matériel" : "Enregistrer"}
        </button>
        {modalMode === "edit" && canDelete && (
          <button type="button" onClick={() => setDeleteConfirmOpen(true)} className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition">
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
        <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-500 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition">
          Annuler
        </button>
      </div>
    </form>
  );


  function EmptyState() {
  return (
    <div className="py-16 flex flex-col items-center gap-3 text-slate-600">
      <CubeTransparentIcon className="w-12 h-12 opacity-30" />
      <p className="text-sm font-medium">Aucun matériel trouvé</p>
    </div>
  );
}

function IconBtn({ icon: Icon, onClick, color = "slate", disabled = false }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 flex items-center justify-center rounded-xl transition
        ${disabled
          ? "bg-slate-100 text-slate-500 cursor-not-allowed"
          : `bg-${color}-50 text-${color}-600 hover:bg-${color}-100`
        }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}



  /* ─── RENDER ─────────────────────────────────────────────────────────── */
  return (
    <SidebarLayout>
      <Toast message={toast?.msg || ""} type={toast?.type || "success"} visible={showToast} />

      {/* ─ Modal: Add / Edit / View ─ */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={modalMode === "add" ? "Nouveau matériel" : modalMode === "edit" ? "Modifier le matériel" : "Détails du matériel"}
        icon={Utensils}>
        {modalMode === "view" && selectedMateriel ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGrad(selectedMateriel.name)} flex items-center justify-center shadow-md`}>
                <Utensils className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{selectedMateriel.name}</h3>
                {selectedMateriel.reference && <p className="text-sm text-slate-600 font-mono">Réf: {selectedMateriel.reference}</p>}
                <div className="flex gap-2 mt-1.5">
                  <StatusBadge isActive={selectedMateriel.is_active} />
                  <StockBadge quantity={selectedMateriel.quantity} minimum={selectedMateriel.minimum_stock} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Catégorie",     value: selectedMateriel.category?.name || "-" },
                { label: "Quantité",      value: `${selectedMateriel.quantity} ${selectedMateriel.unit}` },
                { label: "Stock minimum", value: String(selectedMateriel.minimum_stock) },
                { label: "Emplacement",   value: selectedMateriel.location || "-" },
                { label: "Prix d'achat",  value: selectedMateriel.purchase_price ? `${selectedMateriel.purchase_price} FCFA` : "-" },
                { label: "Fournisseur",   value: selectedMateriel.supplier || "-" },
                { label: "Date d'achat",  value: selectedMateriel.purchase_date ? new Date(selectedMateriel.purchase_date).toLocaleDateString("fr-FR") : "-" },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-[12px] text-slate-600 uppercase font-bold tracking-wide mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.value}</p>
                </motion.div>
              ))}
            </div>
            {selectedMateriel.description && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                <p className="text-[12px] text-slate-600 uppercase font-bold tracking-wide mb-1">Description</p>
                <p className="text-sm text-slate-600 dark:text-slate-500">{selectedMateriel.description}</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              {canEdit && <button onClick={() => openEditModal(selectedMateriel)} className="flex-1 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 text-sm font-semibold hover:bg-orange-100 dark:hover:bg-orange-900/40 transition">Modifier</button>}
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition">Fermer</button>
            </div>
          </div>
        ) : materielFormBody}
      </Modal>

      {/* ─ Entry Modal ─ */}
      <Modal open={entryModalOpen} onClose={() => setEntryModalOpen(false)} title="Nouvelle entrée" icon={ArrowDownTrayIcon} accentClass="from-emerald-400 via-teal-400 to-cyan-400">
        <form onSubmit={handleEntry} className="space-y-4">
          <div><label className={labelCls}>Matériel *</label>
            <select required value={entryForm.materiel_id} onChange={e => setEntryForm({ ...entryForm, materiel_id: e.target.value })} className={`${inputCls} max-h-48 overflow-y-auto`}>
              <option value="">Choisir un matériel…</option>
              {allMateriels.filter(m => m.is_active).map(m => <option key={m.id} value={m.id}>{m.name} ({m.quantity} {m.unit})</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Quantité *</label><input type="number" required min="0.01" step="0.01" value={entryForm.quantity} onChange={e => setEntryForm({ ...entryForm, quantity: e.target.value })} className={inputCls} placeholder="0" /></div>
            <div><label className={labelCls}>Référence</label><input value={entryForm.reference_number} onChange={e => setEntryForm({ ...entryForm, reference_number: e.target.value })} className={inputCls} placeholder="N° facture…" /></div>
          </div>
          <div><label className={labelCls}>Raison</label><input value={entryForm.reason} onChange={e => setEntryForm({ ...entryForm, reason: e.target.value })} className={inputCls} placeholder="Ex: Nouvel achat…" /></div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmittingEntry} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-bold transition-all active:scale-95 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSubmittingEntry ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
              Enregistrer
            </button>
            <button type="button" onClick={() => setEntryModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition">Annuler</button>
          </div>
        </form>
      </Modal>

      {/* ─ Exit Modal ─ */}
      <Modal open={exitModalOpen} onClose={() => setExitModalOpen(false)} title="Nouvelle sortie" icon={ArrowUpTrayIcon} accentClass="from-red-400 via-rose-400 to-pink-400">
        <form onSubmit={handleExit} className="space-y-4">
          <div><label className={labelCls}>Matériel *</label>
            <select required value={exitForm.materiel_id} onChange={e => setExitForm({ ...exitForm, materiel_id: e.target.value })} className={`${inputCls} max-h-48 overflow-y-auto`}>
              <option value="">Choisir un matériel…</option>
              {allMateriels.filter(m => m.is_active && m.quantity > 0).map(m => <option key={m.id} value={m.id}>{m.name} (dispo: {m.quantity} {m.unit})</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Type de sortie *</label>
              <select required value={exitForm.type} onChange={e => setExitForm({ ...exitForm, type: e.target.value })} className={inputCls}>
                {OUT_MOVEMENT_TYPES.map(t => <option key={t} value={t}>{MOVEMENT_TYPES[t as keyof typeof MOVEMENT_TYPES].label}</option>)}
              </select></div>
            <div><label className={labelCls}>Quantité *</label><input type="number" required min="0.01" step="0.01" value={exitForm.quantity} onChange={e => setExitForm({ ...exitForm, quantity: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Raison *</label><input required value={exitForm.reason} onChange={e => setExitForm({ ...exitForm, reason: e.target.value })} className={inputCls} placeholder="Ex: Cassé lors du lavage…" /></div>
          <div><label className={labelCls}>Référence</label><input value={exitForm.reference_number} onChange={e => setExitForm({ ...exitForm, reference_number: e.target.value })} className={inputCls} placeholder="N° document…" /></div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmittingExit} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white text-sm font-bold transition-all active:scale-95 shadow-lg shadow-red-200 dark:shadow-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSubmittingExit ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
              Enregistrer
            </button>
            <button type="button" onClick={() => setExitModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition">Annuler</button>
          </div>
        </form>
      </Modal>

      {/* ─ Category Modal ─ */}
      <Modal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title="Nouvelle catégorie" icon={TagIcon}>
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div><label className={labelCls}>Nom *</label><input required value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} className={inputCls} placeholder="Ex: Ustensiles de cuisine" /></div>
          <div><label className={labelCls}>Description</label><textarea value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} className={`${inputCls} resize-none`} rows={2} /></div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmittingCategory} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold hover:from-orange-600 hover:to-amber-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSubmittingCategory ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
              Créer
            </button>
            <button type="button" onClick={() => setCategoryModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition">Annuler</button>
          </div>
        </form>
      </Modal>

      {/* ─ Delete confirm ─ */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Confirmer la suppression" icon={TrashIcon} accentClass="from-red-400 via-rose-400 to-pink-400">
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800/40">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              Êtes-vous sûr de vouloir supprimer <strong>« {selectedMateriel?.name} »</strong> ? Cette action est irréversible.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all active:scale-95 shadow-lg shadow-red-200 dark:shadow-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isDeleting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
              Supprimer
            </button>
            <button onClick={() => setDeleteConfirmOpen(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition">Annuler</button>
          </div>
        </div>
      </Modal>

      {/* ════════════ MAIN CONTENT ════════════ */}
      <main className="w-full b max-w-7xl mx-auto px-3 py-4 sm:p-6 lg:p-8 space-y-5">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg flex-shrink-0">
              <Utensils className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-slate-600 dark:text-white tracking-tight">Gestion du Matériel</h1>
              <p className="text-sm text-slate-600 hidden sm:block mt-0.5">Ustensiles, équipements et inventaire</p>
            </div>
          </div>
        </motion.div>


        {/* Tabs */}
        <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
          <Tab.List className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 mb-4 rounded-2xl">
            {[
                { name: "Stock", short: "Stock", icon: Utensils },
                { name: "Entrées de stock", short: "Entrées", icon: ArrowDownTrayIcon },
                { name: "Sorties de stock", short: "Sorties", icon: ArrowUpTrayIcon },
              ].map((tab, i) => (
              <Tab key={i} className={({ selected }) =>
                `flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                ${selected ? "bg-white dark:bg-slate-900 text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-500"}`
              }>
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden">{tab.short}</span>
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels>
            {/* ════ TAB 1: LISTE ════ */}
            <Tab.Panel>
              {/* ───────────── HEADER + STATS ───────────── */}
              <div className="space-y-5">

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  {[
                    {
                      label: "Total matériel",
                      value: pagination.totalCount,
                      icon: Package,
                      color: "from-sky-500 to-blue-600",
                    },
                    {
                      label: "Catégories",
                      value: categories.length,
                      icon: TagIcon,
                      color: "from-violet-500 to-purple-600",
                    },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="group relative overflow-hidden rounded-2xl p-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow`}>
                          <stat.icon className="w-5 h-5 text-white" />
                        </div>

                        <div>
                          <p className="text-sm text-slate-600 uppercase font-semibold tracking-wide">
                            {stat.label}
                          </p>
                          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                            {stat.value}
                          </p>
                        </div>
                      </div>

                      {/* hover glow */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    </motion.div>
                  ))}
                </motion.div>

{/* Actions */}
<div className="flex justify-end">
  <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm">

    {/* Refresh */}
    <button
      onClick={() => {
        loadMateriels();
        loadAllMateriels();
        loadMovements();
        notify("Données actualisées", "success");
      }}
      className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
      title="Actualiser"
    >
      <ArrowPathIcon className="w-4 h-4" />
    </button>

    {/* Divider */}
    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

    {/* Export */}
    <button
      onClick={doExportXLSX}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition border border-emerald-200 dark:border-emerald-800"
    >
      XLSX
    </button>

    <button
      onClick={doExportPDF}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition border border-red-200 dark:border-red-800"
    >
      PDF
    </button>

    {/* Divider */}
    {canCreate && <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />}

{canCreate && (
  <button
    type="button"
    onClick={() => setCategoryModalOpen(true)}
    className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-violet-50 text-violet-700 text-sm font-semibold border border-violet-200 hover:bg-violet-100 transition"
  >
    <TagIcon className="w-4 h-4" />
    <span>Nouvelle catégorie</span>
  </button>
)}

{canCreate && (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={openAddModal}
    title="Ajouter un matériel"
    className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold shadow-md hover:shadow-lg transition"
  >
    <PlusIcon className="w-4 h-4" />
    <span className="hidden sm:inline">Ajouter un matériel</span>
  </motion.button>
)}

  </div>
</div>

                {/* ───────────── FILTERS ───────────── */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col lg:flex-row gap-3"
                >
                  {/* Search */}
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher un matériel..."
                      className={`${inputCls} pl-9`}
                    />
                  </div>

                  {/* Category */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={`${inputCls} lg:w-60`}
                  >
                    <option value="">Toutes les catégories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </motion.div>

                {/* ───────────── MOBILE CARDS ───────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonMobileCard key={i} />)
                  ) : materiels.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <AnimatePresence>
                      {materiels.map((m, i) => (
                        <MaterielCard
                          key={m.id}
                          m={m}
                          index={i}
                          canEdit={canEdit}
                          onView={() => openViewModal(m)}
                          onEdit={() => openEditModal(m)}
                        />
                      ))}
                    </AnimatePresence>
                  )}

                  {!loading && materiels.length > 0 && (
                    <PaginationBar
                      pagination={pagination}
                      onChange={(p) =>
                        setPagination((prev) => ({ ...prev, page: p }))
                      }
                    />
                  )}
                </div>

                {/* ───────────── TABLE DESKTOP ───────────── */}
                <div className="hidden rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          {["Matériel", "Catégorie", "Stock", "Emplacement", "Statut", ""].map((h) => (
                            <th
                              key={h}
                              className="px-5 py-3 text-left text-sm font-semibold text-slate-600 uppercase"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                          Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonTableRow key={i} />
                          ))
                        ) : materiels.length === 0 ? (
                          <tr>
                            <td colSpan={6}>
                              <EmptyState />
                            </td>
                          </tr>
                        ) : (
                          materiels.map((m, i) => (
                            <motion.tr
                              key={m.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="group hover:bg-orange-50/40 dark:hover:bg-orange-900/10 transition"
                            >
                              {/* Materiel */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGrad(m.name)} flex items-center justify-center`}>
                                    <Utensils className="w-4 h-4 text-white" />
                                  </div>

                                  <div>
                                    <p className="font-semibold">{m.name}</p>
                                    {m.reference && (
                                      <p className="text-sm text-slate-600 font-mono">
                                        {m.reference}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="px-5 py-4">
                                <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm">
                                  {m.category?.name || "—"}
                                </span>
                              </td>

                              {/* Stock */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">{m.quantity}</span>
                                  <span className="text-sm text-slate-600">{m.unit}</span>
                                  <StockBadge quantity={m.quantity} minimum={m.minimum_stock} />
                                </div>
                              </td>

                              {/* Location */}
                              <td className="px-5 py-4 text-slate-500">
                                {m.location || "—"}
                              </td>

                              {/* Status */}
                              <td className="px-5 py-4">
                                <StatusBadge isActive={m.is_active} />
                              </td>

                              {/* Actions */}
                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100">
                                  <IconBtn icon={EyeIcon} onClick={() => openViewModal(m)} />
                                  {canEdit ? (
                                    <IconBtn icon={PencilSquareIcon} onClick={() => openEditModal(m)} color="orange" />
                                  ) : (
                                    <IconBtn icon={LockClosedIcon} disabled />
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {!loading && materiels.length > 0 && (
                    <PaginationBar
                      pagination={pagination}
                      onChange={(p) =>
                        setPagination((prev) => ({ ...prev, page: p }))
                      }
                    />
                  )}
                </div>
              </div>
            </Tab.Panel>

            {/* ════ TAB 2: ENTRÉES ════ */}
            <Tab.Panel>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <select value={movementTypeFilter} onChange={e => setMovementTypeFilter(e.target.value)} className={`${inputCls} sm:w-52`}>
                  <option value="">Tous les types</option>
                  <option value="IN">Entrées</option>
                  <option value="ADJUSTMENT">Ajustements</option>
                </select>
                {canCreate && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEntryModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 sm:ml-auto">
                    <PlusIcon className="w-4 h-4" /> Nouvelle entrée
                  </motion.button>
                )}
              </div>

              {/* Mobile */}
              <div className="sm:hidden space-y-3">
                {movLoading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonMobileCard key={i} />)
                  : movements.filter(m => m.type === "IN" || m.type === "ADJUSTMENT").length === 0
                  ? <div className="py-16 flex flex-col items-center gap-3 text-slate-600"><ArrowDownTrayIcon className="w-10 h-10 opacity-30" /><p className="text-sm">Aucune entrée enregistrée</p></div>
                  : movements.filter(m => m.type === "IN" || m.type === "ADJUSTMENT").map((m, i) => <MovementCard key={m.id} m={m} index={i} />)
                }
              </div>

              {/* Desktop */}
              <div className="hidden sm:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        {["Date", "Matériel", "Type", "Quantité", "Raison", "Utilisateur"].map(h => (
                          <th key={h} className="px-4 py-3.5 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {movLoading ? (
                        Array.from({ length: 5 }).map((_, i) => <SkeletonMovementRow key={i} />)
                      ) : movements.filter(m => m.type === "IN" || m.type === "ADJUSTMENT").length === 0 ? (
                        <tr><td colSpan={6} className="py-16 text-center text-slate-600 text-sm">Aucune entrée enregistrée</td></tr>
                      ) : (
                        movements.filter(m => m.type === "IN" || m.type === "ADJUSTMENT").map((m, i) => (
                          <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                            className="hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors">
                            <td className="px-4 py-3.5 text-sm text-slate-500">{new Date(m.created_at).toLocaleDateString("fr-FR")}</td>
                            <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">{m.materiel?.name}</td>
                            <td className="px-4 py-3.5"><MovBadge type={m.type} /></td>
                            <td className="px-4 py-3.5 text-emerald-600 dark:text-emerald-400 font-bold text-base">+{m.quantity}</td>
                            <td className="px-4 py-3.5 text-sm text-slate-500 dark:text-slate-600">{m.reason || "—"}</td>
                            <td className="px-4 py-3.5 text-sm text-slate-600">{m.user?.fullName || "—"}</td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {!movLoading && movements.filter(m => m.type === "IN" || m.type === "ADJUSTMENT").length > 0 && (
                  <PaginationBar pagination={movPagination} onChange={p => setMovPagination(prev => ({ ...prev, page: p }))} />
                )}
              </div>
            </Tab.Panel>

            {/* ════ TAB 3: SORTIES ════ */}
            <Tab.Panel>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <select value={movementTypeFilter} onChange={e => setMovementTypeFilter(e.target.value)} className={`${inputCls} sm:w-52`}>
                  <option value="">Tous les types</option>
                  {OUT_MOVEMENT_TYPES.map(t => <option key={t} value={t}>{MOVEMENT_TYPES[t as keyof typeof MOVEMENT_TYPES].label}</option>)}
                </select>
                {canEdit && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setExitModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-200 dark:shadow-red-900/40 sm:ml-auto">
                    <PlusIcon className="w-4 h-4" /> Nouvelle sortie
                  </motion.button>
                )}
              </div>

              {/* Mobile */}
              <div className="sm:hidden space-y-3">
                {movLoading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonMobileCard key={i} />)
                  : movements.filter(m => OUT_MOVEMENT_TYPES.includes(m.type)).length === 0
                  ? <div className="py-16 flex flex-col items-center gap-3 text-slate-600"><ArrowUpTrayIcon className="w-10 h-10 opacity-30" /><p className="text-sm">Aucune sortie enregistrée</p></div>
                  : movements.filter(m => OUT_MOVEMENT_TYPES.includes(m.type)).map((m, i) => <MovementCard key={m.id} m={m} index={i} />)
                }
              </div>

              {/* Desktop */}
              <div className="hidden sm:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        {["Date", "Matériel", "Type", "Quantité", "Raison", "Utilisateur"].map(h => (
                          <th key={h} className="px-4 py-3.5 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {movLoading ? (
                        Array.from({ length: 5 }).map((_, i) => <SkeletonMovementRow key={i} />)
                      ) : movements.filter(m => OUT_MOVEMENT_TYPES.includes(m.type)).length === 0 ? (
                        <tr><td colSpan={6} className="py-16 text-center text-slate-600 text-sm">Aucune sortie enregistrée</td></tr>
                      ) : (
                        movements.filter(m => OUT_MOVEMENT_TYPES.includes(m.type)).map((m, i) => (
                          <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                            className="hover:bg-red-50/40 dark:hover:bg-red-900/10 transition-colors">
                            <td className="px-4 py-3.5 text-sm text-slate-500">{new Date(m.created_at).toLocaleDateString("fr-FR")}</td>
                            <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">{m.materiel?.name}</td>
                            <td className="px-4 py-3.5"><MovBadge type={m.type} /></td>
                            <td className="px-4 py-3.5 text-red-600 dark:text-red-400 font-bold text-base">-{m.quantity}</td>
                            <td className="px-4 py-3.5 text-sm text-slate-500 dark:text-slate-600">{m.reason || "—"}</td>
                            <td className="px-4 py-3.5 text-sm text-slate-600">{m.user?.fullName || "—"}</td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {!movLoading && movements.filter(m => OUT_MOVEMENT_TYPES.includes(m.type)).length > 0 && (
                  <PaginationBar pagination={movPagination} onChange={p => setMovPagination(prev => ({ ...prev, page: p }))} />
                )}
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </main>
    </SidebarLayout>
  );
}
