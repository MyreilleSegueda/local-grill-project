/**
 * app/produits/page.tsx
 *
 * RBAC appliqué sur :
 *   • Bouton "Ajouter"       → PRODUCTS_CREATE
 *   • Bouton "Modifier"      → PRODUCTS_EDIT
 *   • Bouton "Supprimer"     → PRODUCTS_DELETE
 *   • Colonne "Actions"      → PRODUCTS_EDIT || PRODUCTS_DELETE
 *   • Export XLSX / PDF      → PRODUCTS_VIEW (lecture suffit)
 *   • Onglet Suppression     → PRODUCTS_DELETE (dans modal)
 *   • Accès page entière     → PRODUCTS_VIEW  (sinon <AccessDenied/>)
 */
"use client";

import { useEffect, useState }          from "react";
import SidebarLayout                     from "@/src/navbar/SidebarLayout";
import { useAuth }                       from "@/lib/hooks/useAuth";
import { usePagePermissions }            from "@/lib/hooks/usePagePermissions";
import {
  PencilSquareIcon, EyeIcon, PlusIcon, CubeIcon, XMarkIcon, TrashIcon,
  ClockIcon, ArrowDownIcon, ArrowUpIcon, DocumentArrowDownIcon,
  PrinterIcon, MagnifyingGlassIcon, FunnelIcon, SparklesIcon,
  CheckBadgeIcon, FireIcon, Squares2X2Icon, ListBulletIcon,
  ChevronRightIcon, LockClosedIcon,
} from "@heroicons/react/24/outline";
import { Tab }            from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Product {
  id: number; name: string; category_id: number;
  category_name?: string; unit_id?: number;
  minimum_stock: number; is_perishable: boolean;
}
interface Category   { id: number; name: string }
interface Unit       { id: number; name: string }
interface ActivityLog { id: number; action: string; user_id: number; created_at: string; changes?: unknown }

/* ─── AccessDenied ───────────────────────────────────────────────────────── */
function AccessDenied({ permission }: { permission: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
        <LockClosedIcon className="w-8 h-8 text-red-400" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-400">Accès refusé</h3>
        <p className="text-sm text-slate-600 mt-1">
          Il vous faut la permission <code className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{permission}</code>
        </p>
      </div>
    </div>
  );
}

/* ─── LockedButton ───────────────────────────────────────────────────────── */
// Bouton qui s'affiche grisé avec cadenas si pas la permission
function LockedButton({
  allowed, onClick, className, children, title,
}: {
  allowed: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  if (!allowed) {
    return (
      <button
        disabled
        title={title ?? "Permission insuffisante"}
        className="opacity-40 cursor-not-allowed flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 text-sm"
      >
        <LockClosedIcon className="w-3.5 h-3.5 flex-shrink-0" />
        {children}
      </button>
    );
  }
  return (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  );
}

/* ─── Skeletons ──────────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800">
      {[60, 45, 30, 25, 40].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" style={{ width: `${w}%` }} />
        </td>
      ))}
    </tr>
  );
}
function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-full" />
        <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-800 rounded-full" />
      </div>
    </div>
  );
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */
function Toast({ message, type, visible }: { message: string; type: "success"|"error"; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-5 sm:w-auto z-[200]
            flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-medium
            ${type === "success"
              ? "bg-emerald-500/95 border border-emerald-400/40"
              : "bg-red-500/95 border border-red-400/40"}`}
        >
          {type === "success"
            ? <CheckBadgeIcon className="w-5 h-5 flex-shrink-0" />
            : <FireIcon className="w-5 h-5 flex-shrink-0" />}
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Badge ──────────────────────────────────────────────────────────────── */
function PerishableBadge({ value }: { value: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold ${
      value
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-300/50"
        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-600"
    }`}>
      {value && <FireIcon className="w-3 h-3" />}
      {value ? "Périssable" : "Stable"}
    </span>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:px-4 pointer-events-none">
            <motion.div key="panel"
              initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="pointer-events-auto relative w-full sm:max-w-xl
                bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl
                shadow-[0_-20px_60px_-8px_rgba(0,0,0,0.35)]
                border border-slate-200/60 dark:border-slate-700/60 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="sm:hidden flex justify-center pt-3 pb-0.5">
                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>
              <div className="hidden sm:block absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-t-3xl" />
              <button onClick={onClose}
                className="absolute top-3 right-4 sm:top-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all hover:rotate-90 duration-200">
                <XMarkIcon className="w-4 h-4 text-slate-600 dark:text-slate-500" />
              </button>
              <div className="px-5 pb-10 sm:pb-8 pt-2 sm:pt-8 max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── ProductCard mobile ─────────────────────────────────────────────────── */
function ProductCard({ product, categories, onEdit, onDetails, index, canEdit }: {
  product:    Product;
  categories: Category[];
  onEdit:     (p: Product) => void;
  onDetails:  (p: Product) => void;
  index:      number;
  canEdit:    boolean;        // ← RBAC passé en prop
}) {
  const cat = product.category_name || categories.find(c => c.id === product.category_id)?.name || "—";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      transition={{ delay: index * 0.035, duration: 0.2 }}
      className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800
        shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {product.is_perishable && (
        <span className="absolute left-0 inset-y-0 w-1 bg-gradient-to-b from-amber-400 to-orange-400 rounded-l-2xl" />
      )}
      <div className="flex items-center gap-3 px-4 py-3.5 pl-5">
        <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${
          product.is_perishable ? "bg-amber-50 dark:bg-amber-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"
        }`}>
          <CubeIcon className={`w-5 h-5 ${product.is_perishable ? "text-amber-500" : "text-emerald-500"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{product.name}</p>
          <p className="text-sm text-slate-600 mt-0.5 truncate">{cat} · min. {product.minimum_stock}</p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {/* Bouton modifier — masqué si pas la permission */}
          {canEdit && (
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => onEdit(product)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/20 text-sky-600 hover:bg-sky-100 transition">
              <PencilSquareIcon className="w-4 h-4" />
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => onDetails(product)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition">
            <ChevronRightIcon className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════
                       PAGE PRINCIPALE
════════════════════════════════════════════════════════ */
export default function ProductsPage() {
  const PAGE_SIZE = 10;

  // ── Auth + permissions ────────────────────────────────────────────────────
  const { token }                           = useAuth();
  const { can, canAny, isLoading: permLoading } = usePagePermissions();

  // Raccourcis lisibles — dérivés du hook RBAC
  const canView   = can("PRODUCTS_VIEW");
  const canCreate = can("PRODUCTS_CREATE");
  const canEdit   = can("PRODUCTS_EDIT");
  const canDelete = can("PRODUCTS_DELETE");

  // ── State ─────────────────────────────────────────────────────────────────
  const [page,        setPage]       = useState(1);
  const [sortBy,      setSortBy]     = useState<keyof Product | "">("");
  const [sortOrder,   setSortOrder]  = useState<"asc"|"desc">("asc");
  const [loading,     setLoading]    = useState(true);
  const [search,      setSearch]     = useState("");
  const [selectedCat, setSelectedCat]= useState("");
  const [showModal,   setShowModal]  = useState<false|"add"|"edit"|"details">(false);
  const [viewMode,    setViewMode]   = useState<"table"|"grid">("table");
  const [formData,    setFormData]   = useState({ name:"", category_id:"", unit_id:"1", minimum_stock:"10", is_perishable:false });
  const [products,    setProducts]   = useState<Product[]>([]);
  const [categories,  setCats]       = useState<Category[]>([]);
  const [units,       setUnits]      = useState<Unit[]>([]);
  const [editProduct, setEditProd]   = useState<Product|null>(null);
  const [showDetails, setDetails]    = useState<Product|null>(null);
  const [logs,        setLogs]       = useState<ActivityLog[]>([]);
  const [totalCount,  setTotal]      = useState(0);
  const [toast,       setToast]      = useState<{msg:string;type:"success"|"error"}|null>(null);
  const [toastVis,    setToastVis]   = useState(false);

  const notify = (msg: string, type: "success"|"error") => {
    setToast({ msg, type }); setToastVis(true);
    setTimeout(() => setToastVis(false), 3200);
  };

  // ── Chargement ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !canView) return;
    loadProducts(); loadUnits();
  }, [token, search, selectedCat, page, sortBy, sortOrder, canView]); // eslint-disable-line

  const loadUnits = async () => {
    try {
      const r = await fetch("/api/products?units=1", { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setUnits(d.data?.units || []); }
    } catch { setUnits([]); }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const p = new URLSearchParams();
      if (search)      p.append("search",      search);
      if (selectedCat) p.append("category_id", selectedCat);
      p.append("page",      String(page));
      p.append("page_size", String(PAGE_SIZE));
      if (sortBy)    p.append("sort_by",    sortBy);
      if (sortOrder) p.append("sort_order", sortOrder);
      const r = await fetch(`/api/products?${p}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const d = await r.json();
        setProducts(d.data.products);
        setCats(d.data.categories);
        setTotal(d.data.total_count ?? d.data.products.length);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── Tri + pagination ──────────────────────────────────────────────────────
  const sorted = sortBy
    ? [...products].sort((a, b) => {
        const av = a[sortBy] ?? "", bv = b[sortBy] ?? "";
        return av < bv ? (sortOrder==="asc"?-1:1) : av > bv ? (sortOrder==="asc"?1:-1) : 0;
      })
    : products;
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Export ────────────────────────────────────────────────────────────────
  // Lecture suffit pour exporter (canView)
  const exportXLSX = async () => {
    if (!canView) { notify("Permission insuffisante", "error"); return; }
    
    try {
      setLoading(true);
      const r = await fetch("/api/exports/products?format=xlsx", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        notify(err.error || "Erreur lors de l'export", "error");
        return;
      }
      
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LocalGrill_Produits_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      notify("Export XLSX réussi !", "success");
    } catch {
      notify("Erreur réseau lors de l'export", "error");
    } finally {
      setLoading(false);
    }
  };
  
  const exportPDF = async () => {
    if (!canView) { notify("Permission insuffisante", "error"); return; }
    
    try {
      setLoading(true);
      const r = await fetch("/api/exports/products?format=pdf", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        notify(err.error || "Erreur lors de l'export", "error");
        return;
      }
      
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LocalGrill_Produits_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      notify("Export PDF réussi !", "success");
    } catch {
      notify("Erreur réseau lors de l'export", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Double-vérification RBAC côté client
    if (editProduct && !canEdit)   { notify("Permission PRODUCTS_EDIT requise", "error"); return; }
    if (!editProduct && !canCreate){ notify("Permission PRODUCTS_CREATE requise", "error"); return; }
    if (!formData.category_id)     { notify("Catégorie manquante", "error"); return; }

    try {
      const url = editProduct ? `/api/products/${editProduct.id}` : "/api/products/create";
      const r = await fetch(url, {
        method:  editProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          ...formData,
          category_id:   Number(formData.category_id),
          unit_id:       Number(formData.unit_id),
          minimum_stock: Number(formData.minimum_stock),
        }),
      });
      if (r.ok) {
        setShowModal(false); setEditProd(null);
        setFormData({ name:"", category_id:"", unit_id:"1", minimum_stock:"10", is_perishable:false });
        loadProducts();
        notify(editProduct ? "Produit modifié !" : "Produit créé !", "success");
      } else {
        const e = await r.json().catch(() => ({}));
        notify(e.error ?? "Erreur lors de la sauvegarde", "error");
      }
    } catch { notify("Erreur réseau", "error"); }
  };

  const openEdit = async (p: Product) => {
    // Ne pas ouvrir si pas la permission lecture
    if (!canView) return;
    setEditProd(p);
    setFormData({
      name:          p.name,
      category_id:   String(p.category_id || ""),
      unit_id:       String(p.unit_id     || "1"),
      minimum_stock: String(p.minimum_stock || "10"),
      is_perishable: !!p.is_perishable,
    });
    setShowModal("edit");
    try {
      const r = await fetch(`/api/activity-logs?entity_type=product&entity_id=${p.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) { const d = await r.json(); setLogs(d.data || []); }
    } catch { setLogs([]); }
  };

  const handleDelete = async () => {
    if (!editProduct) return;
    if (!canDelete)   { notify("Permission PRODUCTS_DELETE requise", "error"); return; }
    if (!window.confirm("Supprimer ce produit définitivement ?")) return;

    const r = await fetch(`/api/products/${editProduct.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      setShowModal(false); setEditProd(null);
      loadProducts();
      notify("Produit supprimé", "success");
    } else {
      notify("Erreur lors de la suppression", "error");
    }
  };

  const handleSort = (col: keyof Product) => {
    if (sortBy === col) setSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortOrder("asc"); }
  };

  const SortIcon = ({ col }: { col: keyof Product }) =>
    sortBy === col
      ? sortOrder === "asc"
        ? <ArrowUpIcon   className="inline w-3.5 h-3.5 ml-1 text-emerald-500" />
        : <ArrowDownIcon className="inline w-3.5 h-3.5 ml-1 text-emerald-500" />
      : null;

  const Pagination = () => (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-slate-600">
        Page <strong>{page}</strong> / {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
      </span>
      <div className="flex gap-2">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
          className="px-3.5 py-1.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 font-medium disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800 transition">
          ← Préc.
        </button>
        <button disabled={page >= Math.ceil(totalCount / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}
          className="px-3.5 py-1.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 font-medium disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800 transition">
          Suiv. →
        </button>
      </div>
    </div>
  );

  const inputCls = "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition";

  // ── Si pas de permission lecture → afficher AccessDenied ─────────────────
  if (!permLoading && !canView) {
    return (
      <SidebarLayout>
        <AccessDenied permission="PRODUCTS_VIEW" />
      </SidebarLayout>
    );
  }

  // ── Calcul des onglets disponibles dans la modale edit ───────────────────
  // L'onglet "Supprimer" n'apparaît que si PRODUCTS_DELETE
  const editTabs = [
    { label: "Formulaire", icon: <PencilSquareIcon className="w-4 h-4" />, color: "text-emerald-600" },
    ...(canDelete ? [{ label: "Supprimer", icon: <TrashIcon className="w-4 h-4" />, color: "text-red-500" }] : []),
    { label: "Historique", icon: <ClockIcon className="w-4 h-4" />, color: "text-blue-500" },
  ];

  /* ─────────────────────── RENDER ─────────────────────────── */
  return (
    <SidebarLayout>
      <Toast message={toast?.msg || ""} type={toast?.type || "success"} visible={toastVis} />

      {/* ══ MODAL ══ */}
      <Modal open={!!showModal} onClose={() => { setShowModal(false); setEditProd(null); setDetails(null); }}>

        {/* Détails produit */}
        {showModal === "details" && showDetails && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                <EyeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{showDetails.name}</h2>
                <p className="text-sm text-slate-500">Fiche produit</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Catégorie",      value: categories.find(c => c.id === showDetails.category_id)?.name || "—" },
                { label: "Stock minimum",  value: showDetails.minimum_stock },
                { label: "ID produit",     value: `#${showDetails.id}` },
                { label: "Périssable",     value: showDetails.is_perishable ? "Oui ⚡" : "Non" },
              ].map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                  <p className="text-sm text-slate-600 font-medium mb-1 uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.value}</p>
                </motion.div>
              ))}
            </div>
            {/* Bouton modifier depuis les détails — RBAC */}
            {canEdit && (
              <button
                onClick={() => { setDetails(null); openEdit(showDetails); }}
                className="mt-4 w-full py-2.5 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-sky-600 text-sm font-semibold hover:bg-sky-100 transition flex items-center justify-center gap-2"
              >
                <PencilSquareIcon className="w-4 h-4" /> Modifier ce produit
              </button>
            )}
          </motion.div>
        )}

        {/* Formulaire add/edit */}
        {(showModal === "add" || showModal === "edit") && (
          <Tab.Group>
            <Tab.List className="flex gap-1 mb-5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
              {(showModal === "add"
                ? [{ label: "Formulaire", icon: <PencilSquareIcon className="w-4 h-4" />, color: "text-emerald-600" }]
                : editTabs
              ).map((tab, i) => (
                <Tab key={i} className={({ selected }) =>
                  `flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    selected
                      ? `bg-white dark:bg-slate-900 shadow-sm ${tab.color}`
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-500"
                  }`
                }>
                  {tab.icon}{tab.label}
                </Tab>
              ))}
            </Tab.List>

            <Tab.Panels>
              {/* Onglet 0 : Formulaire */}
              <Tab.Panel as="div">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      showModal === "add" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-sky-100 dark:bg-sky-900/30"
                    }`}>
                      {showModal === "add"
                        ? <PlusIcon className="w-5 h-5 text-emerald-600" />
                        : <PencilSquareIcon className="w-5 h-5 text-sky-600" />}
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {showModal === "add" ? "Nouveau produit" : "Modifier le produit"}
                    </h2>
                  </div>

                  {/* Si l'user peut voir mais pas modifier → formulaire read-only */}
                  {showModal === "edit" && !canEdit && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 text-sm font-semibold">
                      <LockClosedIcon className="w-4 h-4 flex-shrink-0" />
                      Mode lecture seule — permission PRODUCTS_EDIT requise
                    </div>
                  )}

                  <form onSubmit={handleSave} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nom du produit</label>
                      <input
                        placeholder="Ex: Poulet frais"
                        value={formData.name}
                        required
                        readOnly={showModal === "edit" && !canEdit}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className={`${inputCls} ${showModal === "edit" && !canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Catégorie</label>
                        <select
                          value={formData.category_id}
                          required
                          disabled={showModal === "edit" && !canEdit}
                          onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                          className={`${inputCls} ${showModal === "edit" && !canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <option value="">Choisir…</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Unité</label>
                        <select
                          value={formData.unit_id}
                          disabled={showModal === "edit" && !canEdit}
                          onChange={e => setFormData({ ...formData, unit_id: e.target.value })}
                          className={`${inputCls} ${showModal === "edit" && !canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <option value="">Choisir…</option>
                          {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Stock minimum</label>
                      <input
                        type="number"
                        value={formData.minimum_stock}
                        readOnly={showModal === "edit" && !canEdit}
                        onChange={e => setFormData({ ...formData, minimum_stock: e.target.value })}
                        className={`${inputCls} ${showModal === "edit" && !canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                      />
                    </div>
                    <label className={`flex items-center gap-3 p-3.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/40 transition ${
                      showModal === "edit" && !canEdit ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-amber-100/70"
                    }`}>
                      <div className="relative flex-shrink-0 w-10 rounded-full transition-colors duration-300"
                        style={{ height: 22, background: formData.is_perishable ? "#f59e0b" : "#cbd5e1" }}>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={formData.is_perishable}
                          disabled={showModal === "edit" && !canEdit}
                          onChange={e => setFormData({ ...formData, is_perishable: e.target.checked })}
                        />
                        <motion.div
                          animate={{ x: formData.is_perishable ? 20 : 2 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className="absolute top-[3px] w-4 h-4 bg-white rounded-full shadow"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-400">Produit périssable</p>
                        <p className="text-sm text-slate-500">Date d&apos;expiration applicable</p>
                      </div>
                    </label>

                    <div className="flex gap-3 pt-1">
                      <button type="button" onClick={() => { setShowModal(false); setEditProd(null); }}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                        Annuler
                      </button>
                      {/* Bouton save : masqué si read-only */}
                      {(showModal === "add" ? canCreate : canEdit) && (
                        <button type="submit"
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 transition-all active:scale-95">
                          {showModal === "add" ? "Créer le produit" : "Enregistrer"}
                        </button>
                      )}
                    </div>
                  </form>
                </motion.div>
              </Tab.Panel>

              {/* Onglet Supprimer (affiché seulement si canDelete) */}
              {showModal === "edit" && canDelete && (
                <Tab.Panel as="div">
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <TrashIcon className="w-5 h-5 text-red-500" />
                      </div>
                      <h2 className="text-lg font-bold text-red-600">Supprimer le produit</h2>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800/40 text-sm text-red-700 dark:text-red-400">
                      <strong>Attention :</strong> action irréversible. Le produit{" "}
                      <span className="font-bold">« {editProduct?.name} »</span> sera définitivement supprimé.
                    </div>
                    <button onClick={handleDelete}
                      className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
                      <TrashIcon className="w-5 h-5" /> Supprimer définitivement
                    </button>
                  </motion.div>
                </Tab.Panel>
              )}

              {/* Onglet Historique */}
              {showModal === "edit" && (
                <Tab.Panel as="div">
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <ClockIcon className="w-5 h-5 text-blue-500" />
                      </div>
                      <h2 className="text-lg font-bold text-blue-600">Historique</h2>
                    </div>
                    {logs.length === 0
                      ? <div className="text-center py-8 text-slate-600 text-sm">Aucune action enregistrée.</div>
                      : (
                        <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {logs.map((log, i) => (
                            <motion.li key={log.id}
                              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                              className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50">
                              <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                              <div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-400">{log.action}</p>
                                <p className="text-sm text-slate-600 mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                              </div>
                            </motion.li>
                          ))}
                        </ul>
                      )
                    }
                  </motion.div>
                </Tab.Panel>
              )}
            </Tab.Panels>
          </Tab.Group>
        )}
      </Modal>

      {/* ══ CONTENU PAGE ══ */}
      <main className="w-full bg-[#F8FAFC] max-w-7xl mx-auto px-3 py-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg flex-shrink-0">
              <CubeIcon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Produits</h1>
              <p className="text-sm text-slate-500 dark:text-slate-600 hidden sm:flex items-center gap-1 mt-0.5">
                <SparklesIcon className="w-3 h-3 text-emerald-400" /> Suivi des stocks en temps réel
              </p>
            </div>
          </div>

          {/* Bouton Ajouter — RBAC PRODUCTS_CREATE */}
          {canCreate ? (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              onClick={() => {
                setEditProd(null);
                setFormData({ name:"", category_id:"", unit_id:"1", minimum_stock:"10", is_perishable:false });
                setShowModal("add");
              }}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 transition-all flex-shrink-0">
              <PlusIcon className="w-4 h-4" /> <span>Ajouter</span>
            </motion.button>
          ) : (
            // Bouton visible mais verrouillé si pas la permission
            <button disabled title="Permission PRODUCTS_CREATE requise"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 text-sm font-semibold cursor-not-allowed opacity-60 flex-shrink-0">
              <LockClosedIcon className="w-4 h-4" /> <span>Ajouter</span>
            </button>
          )}
        </motion.div>

        {/* Toolbar */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
              <input placeholder="Rechercher…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition shadow-sm"
              />
            </div>
            <div className="relative">
              <FunnelIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
              <select value={selectedCat} onChange={e => { setSelectedCat(e.target.value); setPage(1); }}
                className="pl-8 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition shadow-sm appearance-none">
                <option value="">Tout</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => { setSearch(""); setSelectedCat(""); setPage(1); loadProducts(); }}
              className="px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm">
              ↺
            </button>
            {/* Exports — visibles si PRODUCTS_VIEW */}
            <button onClick={exportXLSX}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition shadow-sm">
              <DocumentArrowDownIcon className="w-4 h-4" /> <span className="hidden sm:inline">XLSX</span>
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition shadow-sm">
              <PrinterIcon className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
            </button>
            <div className="hidden sm:flex rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <button onClick={() => setViewMode("table")}
                className={`px-3 py-2.5 transition ${viewMode==="table" ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                <ListBulletIcon className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("grid")}
                className={`px-3 py-2.5 transition ${viewMode==="grid" ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                <Squares2X2Icon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Count */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Total :</span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
            {totalCount} produits
          </span>
          {/* Indicateur permissions actives */}
          <div className="ml-auto hidden sm:flex items-center gap-1.5 text-sm text-slate-600">
            {canCreate && <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">+ Créer</span>}
            {canEdit   && <span className="px-2 py-0.5 rounded-full bg-sky-50   dark:bg-sky-950/30    text-sky-600    dark:text-sky-400    border border-sky-200   dark:border-sky-900/50">  ✎ Modifier</span>}
            {canDelete && <span className="px-2 py-0.5 rounded-full bg-red-50   dark:bg-red-950/30    text-red-600    dark:text-red-400    border border-red-200   dark:border-red-900/50">  ✕ Supprimer</span>}
          </div>
        </div>

        {/* ── Mobile : cards ── */}
        <div className="sm:hidden space-y-2">
          {loading
            ? [...Array(5)].map((_, i) => <SkeletonCard key={i} />)
            : paginated.length === 0
            ? (
              <div className="py-14 flex flex-col items-center gap-2 text-slate-600 text-sm">
                <CubeIcon className="w-10 h-10 opacity-30" /> Aucun produit trouvé
              </div>
            )
            : (
              <AnimatePresence>
                {paginated.map((p, i) => (
                  <ProductCard key={p.id} product={p} categories={categories} index={i}
                    canEdit={canEdit}
                    onEdit={openEdit}
                    onDetails={prod => { setDetails(prod); setShowModal("details"); }}
                  />
                ))}
              </AnimatePresence>
            )
          }
          {!loading && paginated.length > 0 && <Pagination />}
        </div>

        {/* ── Desktop : table ou grid ── */}
        <AnimatePresence mode="wait">

          {viewMode === "table" && (
            <motion.div key="tbl" className="hidden sm:block"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/60">
                        {([
                          { label: "Produit",    col: "name"          as keyof Product },
                          { label: "Catégorie",  col: "category_name" as keyof Product },
                          { label: "Seuil",      col: "minimum_stock" as keyof Product },
                          { label: "État",       col: "is_perishable" as keyof Product },
                        ]).map(h => (
                          <th key={h.col} onClick={() => handleSort(h.col)}
                            className="px-5 py-3.5 text-left text-sm font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:text-emerald-500 transition select-none">
                            {h.label}<SortIcon col={h.col} />
                          </th>
                        ))}
                        {/* Colonne actions visible si au moins edit OU delete */}
                        {canAny(["PRODUCTS_EDIT", "PRODUCTS_DELETE"]) && (
                          <th className="px-5 py-3.5 text-center text-sm font-bold text-slate-600 uppercase tracking-widest">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {loading
                        ? [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                        : paginated.length === 0
                        ? (
                          <tr><td colSpan={5} className="py-16 text-center text-slate-600">
                            <div className="flex flex-col items-center gap-2">
                              <CubeIcon className="w-10 h-10 opacity-30" /> Aucun produit
                            </div>
                          </td></tr>
                        )
                        : paginated.map((p, i) => (
                          <motion.tr key={p.id}
                            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}
                            className="group border-b border-slate-100 dark:border-slate-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors"
                          >
                            <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-400 truncate max-w-[180px]">
                              {p.name}
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 dark:text-slate-600 truncate max-w-[140px]">
                              {p.category_name || categories.find(c => c.id === p.category_id)?.name || "—"}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center justify-center w-10 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-500">
                                {p.minimum_stock}
                              </span>
                            </td>
                            <td className="px-5 py-3.5"><PerishableBadge value={p.is_perishable} /></td>

                            {/* Cellule actions — seulement si au moins une permission */}
                            {canAny(["PRODUCTS_EDIT", "PRODUCTS_DELETE"]) && (
                              <td className="px-5 py-3.5">
                                <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                  {/* Modifier — PRODUCTS_EDIT */}
                                  <LockedButton
                                    allowed={canEdit}
                                    onClick={() => openEdit(p)}
                                    title="Modifier (PRODUCTS_EDIT)"
                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/30 text-sky-600 hover:bg-sky-200 transition"
                                  >
                                    <PencilSquareIcon className="w-4 h-4" />
                                  </LockedButton>
                                  {/* Détails — lecture seule */}
                                  <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }}
                                    onClick={() => { setDetails(p); setShowModal("details"); }}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-500 hover:bg-slate-200 transition">
                                    <EyeIcon className="w-4 h-4" />
                                  </motion.button>
                                </div>
                              </td>
                            )}
                          </motion.tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
                {!loading && paginated.length > 0 && (
                  <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <Pagination />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {viewMode === "grid" && (
            <motion.div key="grd" className="hidden sm:block"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {loading
                  ? [...Array(8)].map((_, i) => (
                    <div key={i} className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
                      <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800 rounded-full" />
                    </div>
                  ))
                  : paginated.map((p, i) => (
                    <motion.div key={p.id}
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                      className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
                    >
                      {p.is_perishable && <div className="absolute top-3 right-3"><FireIcon className="w-4 h-4 text-amber-400" /></div>}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mb-3">
                        <CubeIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate mb-1">{p.name}</h3>
                      <p className="text-sm text-slate-600 truncate mb-3">
                        {p.category_name || categories.find(c => c.id === p.category_id)?.name || "—"}
                      </p>
                      <div className="flex items-center justify-between mb-3">
                        <PerishableBadge value={p.is_perishable} />
                        <span className="text-sm font-bold text-slate-500">min: {p.minimum_stock}</span>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        {/* Modifier — RBAC */}
                        {canEdit ? (
                          <button onClick={() => openEdit(p)}
                            className="flex-1 py-1.5 text-sm font-semibold rounded-xl bg-sky-50 dark:bg-sky-900/20 text-sky-600 hover:bg-sky-100 transition flex items-center justify-center gap-1">
                            <PencilSquareIcon className="w-3.5 h-3.5" /> Éditer
                          </button>
                        ) : (
                          <div className="flex-1 py-1.5 text-sm font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-600 flex items-center justify-center gap-1 cursor-not-allowed">
                            <LockClosedIcon className="w-3.5 h-3.5" /> Éditer
                          </div>
                        )}
                        <button onClick={() => { setDetails(p); setShowModal("details"); }}
                          className="flex-1 py-1.5 text-sm font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-500 hover:bg-slate-100 transition flex items-center justify-center gap-1">
                          <EyeIcon className="w-3.5 h-3.5" /> Voir
                        </button>
                      </div>
                    </motion.div>
                  ))
                }
              </div>
              {!loading && paginated.length > 0 && <div className="mt-4"><Pagination /></div>}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </SidebarLayout>
  );
}