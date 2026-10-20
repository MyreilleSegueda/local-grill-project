"use client";
import SidebarLayoutAdmin from "@/src/navbar/SidebarLayoutAdmin";
import { DataTable } from "@/src/components/table/data-table";
import { useAuth } from "@/lib/hooks/useAuth";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  DocumentTextIcon,
  UserCircleIcon,
  GlobeAltIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  TrashIcon,
  PencilSquareIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  KeyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuditLog {
  id: number | string;
  userId: number;
  action: string;
  entity: string;
  entityId?: number;
  ip?: string;
  timestamp: string;
  user?: { email: string; fullName?: string };
}

// ─── Action metadata ──────────────────────────────────────────────────────────
const ACTION_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode; category: string }> = {
  LOGIN:             { label: "Connexion",        color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800/40", icon: <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />, category: "auth" },
  LOGOUT:            { label: "Déconnexion",      color: "text-gray-600 dark:text-gray-400",       bg: "bg-gray-50 dark:bg-slate-800",          border: "border-gray-200 dark:border-slate-700",          icon: <ArrowLeftOnRectangleIcon className="w-3.5 h-3.5" />, category: "auth" },
  CREATE_USER:       { label: "Créer utilisateur",color: "text-sky-700 dark:text-sky-400",         bg: "bg-sky-50 dark:bg-sky-950/30",          border: "border-sky-200 dark:border-sky-800/40",          icon: <UserCircleIcon className="w-3.5 h-3.5" />, category: "user" },
  UPDATE_USER:       { label: "Modifier util.",   color: "text-violet-700 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-950/30",    border: "border-violet-200 dark:border-violet-800/40",    icon: <PencilSquareIcon className="w-3.5 h-3.5" />, category: "user" },
  DELETE_USER:       { label: "Supprimer util.",  color: "text-red-700 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-950/30",          border: "border-red-200 dark:border-red-800/40",          icon: <TrashIcon className="w-3.5 h-3.5" />, category: "user" },
  CREATE_ROLE:       { label: "Créer rôle",       color: "text-sky-700 dark:text-sky-400",         bg: "bg-sky-50 dark:bg-sky-950/30",          border: "border-sky-200 dark:border-sky-800/40",          icon: <ShieldCheckIcon className="w-3.5 h-3.5" />, category: "role" },
  UPDATE_ROLE:       { label: "Modifier rôle",    color: "text-violet-700 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-950/30",    border: "border-violet-200 dark:border-violet-800/40",    icon: <PencilSquareIcon className="w-3.5 h-3.5" />, category: "role" },
  DELETE_ROLE:       { label: "Supprimer rôle",   color: "text-red-700 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-950/30",          border: "border-red-200 dark:border-red-800/40",          icon: <TrashIcon className="w-3.5 h-3.5" />, category: "role" },
  CREATE_PERMISSION: { label: "Créer permission", color: "text-sky-700 dark:text-sky-400",         bg: "bg-sky-50 dark:bg-sky-950/30",          border: "border-sky-200 dark:border-sky-800/40",          icon: <KeyIcon className="w-3.5 h-3.5" />, category: "perm" },
  UPDATE_PERMISSION: { label: "Modifier perm.",   color: "text-violet-700 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-950/30",    border: "border-violet-200 dark:border-violet-800/40",    icon: <PencilSquareIcon className="w-3.5 h-3.5" />, category: "perm" },
  DELETE_PERMISSION: { label: "Supprimer perm.",  color: "text-red-700 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-950/30",          border: "border-red-200 dark:border-red-800/40",          icon: <TrashIcon className="w-3.5 h-3.5" />, category: "perm" },
  SESSION_EXPIRE:    { label: "Session expirée",  color: "text-amber-700 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-950/30",      border: "border-amber-200 dark:border-amber-800/40",      icon: <ClockIcon className="w-3.5 h-3.5" />, category: "auth" },
  SESSION_REVOKE:    { label: "Session révoquée", color: "text-orange-700 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-950/30",    border: "border-orange-200 dark:border-orange-800/40",    icon: <ExclamationTriangleIcon className="w-3.5 h-3.5" />, category: "auth" },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? {
    label: action,
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-slate-800",
    border: "border-gray-200 dark:border-slate-700",
    icon: <InformationCircleIcon className="w-3.5 h-3.5" />,
    category: "other",
  };
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatRelative(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `Il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";
function Toast({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const cfg = {
    success: { bg: "bg-[#009B4D]", icon: <CheckCircleIcon className="w-4 h-4" /> },
    error:   { bg: "bg-red-600",   icon: <ExclamationTriangleIcon className="w-4 h-4" /> },
    info:    { bg: "bg-slate-700", icon: <InformationCircleIcon className="w-4 h-4" /> },
  }[type];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white ${cfg.bg}`}
    >
      {cfg.icon}{message}
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100"><XMarkIcon className="w-4 h-4" /></button>
    </motion.div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm">
      <div className="p-2 rounded-xl flex-shrink-0" style={{ backgroundColor: `${color}15`, color }}>{icon}</div>
      <div>
        <div className="text-xl font-extrabold text-gray-900 dark:text-white tabular-nums">{value.toLocaleString("fr-FR")}</div>
        <div className="text-sm text-gray-400 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    <div className="flex items-center justify-between px-1 pt-4 flex-wrap gap-3">
      <span className="text-sm text-gray-400">Page {page} / {totalPages} — {total.toLocaleString("fr-FR")} entrée{total > 1 ? "s" : ""}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        {pages.map((p, i) => p === "…"
          ? <span key={`e${i}`} className="w-8 text-center text-sm text-gray-400">…</span>
          : <button key={p} onClick={() => onChange(p as number)}
              className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${page === p ? "bg-[#009B4D] text-white shadow-md shadow-emerald-500/20" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700"}`}>
              {p}
            </button>
        )}
        <button onClick={() => onChange(page + 1)} disabled={page === Math.ceil(total / pageSize)}
          className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Log Detail Modal ─────────────────────────────────────────────────────────
function LogDetailModal({ log, onClose }: { log: AuditLog | null; onClose: () => void }) {
  useEffect(() => {
    if (!log) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [log, onClose]);

  const meta = log ? getActionMeta(log.action) : null;

  return (
    <AnimatePresence>
      {log && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className={`p-2 rounded-xl flex-shrink-0 ${meta?.bg}`}>
                <span className={meta?.color}>{meta?.icon}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Détail du log #{log.id}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{formatDate(log.timestamp)}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-3">
              {[
                { label: "Utilisateur", value: log.user?.email || "—", icon: <UserCircleIcon className="w-4 h-4" /> },
                { label: "Nom complet", value: log.user?.fullName || "—", icon: <UserCircleIcon className="w-4 h-4" /> },
                { label: "Action", value: meta?.label || log.action, icon: meta?.icon },
                { label: "Entité", value: log.entity || "—", icon: <DocumentTextIcon className="w-4 h-4" /> },
                { label: "ID entité", value: log.entityId ? `#${log.entityId}` : "—", icon: <InformationCircleIcon className="w-4 h-4" /> },
                { label: "Adresse IP", value: log.ip || "—", icon: <GlobeAltIcon className="w-4 h-4" /> },
                { label: "Horodatage", value: formatDate(log.timestamp), icon: <ClockIcon className="w-4 h-4" /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50">
                  <span className="text-gray-400 flex-shrink-0">{icon}</span>
                  <span className="text-sm text-gray-400 w-24 flex-shrink-0">{label}</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{String(value)}</span>
                </div>
              ))}
            </div>

            <div className="px-6 pb-5">
              <button onClick={onClose}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all">
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Category filter pills ────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  all: "Toutes", auth: "Authentification", user: "Utilisateurs",
  role: "Rôles", perm: "Permissions", other: "Autres",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminLogs() {
  const { token } = useAuth();
  const [logs, setLogs]               = useState<AuditLog[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const [search, setSearch]           = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(25);

  const [detailLog, setDetailLog]     = useState<AuditLog | null>(null);
  const [toast, setToast]             = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (msg: string, type: ToastType = "success") => setToast({ message: msg, type });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setTableLoading(true);
    try {
      const res = await fetch("/api/admin/auditlogs", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur lors du chargement des logs");
      setLogs(Array.isArray(data) ? data : data.logs || []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erreur lors du chargement des logs", "error");
    } finally {
      setTableLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs(true);
    setTimeout(() => setRefreshing(false), 500);
    showToast("Logs actualisés", "info");
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return {
      total:   logs.length,
      today:   logs.filter(l => new Date(l.timestamp) >= today).length,
      logins:  logs.filter(l => l.action === "LOGIN").length,
      deletes: logs.filter(l => l.action.startsWith("DELETE")).length,
    };
  }, [logs]);

  // ── Unique actions for filter dropdown ────────────────────────────────────
  const uniqueActions = useMemo(() => {
    const set = new Set(logs.map(l => l.action));
    return Array.from(set).sort();
  }, [logs]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return logs.filter(l => {
      const q = search.toLowerCase();
      const matchSearch =
        (l.user?.email || "").toLowerCase().includes(q) ||
        (l.user?.fullName || "").toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.entity.toLowerCase().includes(q) ||
        (l.ip || "").includes(q);

      const meta = getActionMeta(l.action);
      const matchCat = categoryFilter === "all" || meta.category === categoryFilter;
      const matchAction = actionFilter === "all" || l.action === actionFilter;

      const ts = new Date(l.timestamp).getTime();
      const matchFrom = !dateFrom || ts >= new Date(dateFrom).getTime();
      const matchTo   = !dateTo   || ts <= new Date(dateTo + "T23:59:59").getTime();

      return matchSearch && matchCat && matchAction && matchFrom && matchTo;
    });
  }, [logs, search, categoryFilter, actionFilter, dateFrom, dateTo]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => setPage(1), [search, categoryFilter, actionFilter, dateFrom, dateTo, pageSize]);

  const hasActiveFilters = search || categoryFilter !== "all" || actionFilter !== "all" || dateFrom || dateTo;

  const resetFilters = () => {
    setSearch(""); setCategoryFilter("all"); setActionFilter("all");
    setDateFrom(""); setDateTo("");
  };

  // ── Export XLSX ────────────────────────────────────────────────────────────
  const exportXLSX = async () => {
    try {
      const XLSX = await import("xlsx");
      const data = filtered.map(l => ({
        "ID":           l.id,
        "Utilisateur":  l.user?.email || "—",
        "Nom complet":  l.user?.fullName || "—",
        "Action":       getActionMeta(l.action).label,
        "Code action":  l.action,
        "Entité":       l.entity,
        "ID entité":    l.entityId ?? "—",
        /*"Adresse IP":   l.ip || "—",*/
        "Horodatage":   formatDate(l.timestamp),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
      XLSX.writeFile(wb, `audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast("Export XLSX téléchargé");
    } catch { showToast("Erreur export XLSX", "error"); }
  };

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14); doc.setTextColor(0, 155, 77);
      doc.text("Logs d'audit", 14, 16);
      doc.setFontSize(9); doc.setTextColor(120, 120, 120);
      doc.text(`Exporté le ${new Date().toLocaleString("fr-FR")} — ${filtered.length} entrée(s)`, 14, 23);
      autoTable(doc, {
        startY: 28,
        head: [["ID", "Utilisateur", "Action", "Entité", "ID entité", "IP", "Date"]],
        body: filtered.map(l => [
          l.id, l.user?.email || "—", getActionMeta(l.action).label,
          l.entity, l.entityId ?? "—", l.ip || "—", formatDate(l.timestamp),
        ]),
        headStyles: { fillColor: [0, 155, 77], textColor: 255, fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [245, 250, 247] },
        styles: { cellPadding: 2.5 },
      });
      doc.save(`audit_logs_${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast("Export PDF téléchargé");
    } catch { showToast("Erreur export PDF", "error"); }
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      header: "#",
      accessorKey: "id",
      cell: ({ row }: any) => (
        <span className="text-sm font-mono text-gray-400 dark:text-gray-500">#{row.original.id}</span>
      ),
    },
    {
      header: "Utilisateur",
      accessorKey: "user.email",
      cell: ({ row }: any) => {
        const l: AuditLog = row.original;
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#009B4D]/10 flex items-center justify-center flex-shrink-0">
              <UserCircleIcon className="w-4 h-4 text-[#009B4D]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[160px]">
                {l.user?.email || "—"}
              </p>
              {l.user?.fullName && (
                <p className="text-sm text-gray-400 truncate max-w-[160px]">{l.user.fullName}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "Action",
      accessorKey: "action",
      cell: ({ row }: any) => {
        const meta = getActionMeta(row.original.action);
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold border ${meta.bg} ${meta.color} ${meta.border}`}>
            {meta.icon}{meta.label}
          </span>
        );
      },
    },
    {
      header: "Entité",
      accessorKey: "entity",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1.5">
          <DocumentTextIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-700 dark:text-gray-300">{row.original.entity || "—"}</span>
          {row.original.entityId && (
            <span className="text-sm font-mono text-gray-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-lg">
              #{row.original.entityId}
            </span>
          )}
        </div>
      ),
    },
    /*{
      header: "IP",
      accessorKey: "ip",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <GlobeAltIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span className="font-mono">{row.original.ip || "—"}</span>
        </div>
      ),
    },*/
    {
      header: "Date",
      accessorKey: "timestamp",
      cell: ({ row }: any) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <div className="font-medium text-gray-700 dark:text-gray-300">{formatRelative(row.original.timestamp)}</div>
          <div className="text-gray-400 mt-0.5">{formatDate(row.original.timestamp)}</div>
        </div>
      ),
    },
    {
      header: "",
      accessorKey: "_detail",
      cell: ({ row }: any) => (
        <button
          onClick={() => setDetailLog(row.original)}
          title="Voir le détail"
          className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                     text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700
                     transition-all duration-150"
        >
          <EyeIcon className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all duration-150 whitespace-nowrap ${
      active
        ? "bg-[#009B4D] text-white border-[#009B4D] shadow-sm shadow-emerald-500/20"
        : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
    }`;

  const inputClass = `px-3 py-2 rounded-xl text-sm
    bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
    text-gray-800 dark:text-gray-200 placeholder-gray-400
    focus:outline-none focus:ring-2 focus:ring-[#009B4D]/25 focus:border-[#009B4D]
    shadow-sm transition-all duration-200`;

  return (
    <SidebarLayoutAdmin>
      <main className="w-full max-w-[1300px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#009B4D]/10">
              <DocumentTextIcon className="w-6 h-6 text-[#009B4D]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Logs d'audit
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Traçabilité complète de toutes les actions système
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm">
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button onClick={exportXLSX}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all shadow-sm">
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span className="hidden sm:inline">XLSX</span>
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shadow-sm">
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <StatCard label="Total logs"      value={stats.total}   icon={<DocumentTextIcon className="w-5 h-5" />}      color="#6B7280" />
          <StatCard label="Aujourd'hui"     value={stats.today}   icon={<ClockIcon className="w-5 h-5" />}             color="#009B4D" />
          <StatCard label="Connexions"      value={stats.logins}  icon={<ArrowRightOnRectangleIcon className="w-5 h-5" />} color="#0EA5E9" />
          <StatCard label="Suppressions"   value={stats.deletes} icon={<TrashIcon className="w-5 h-5" />}             color="#EF4444" />
        </motion.div>

        {/* ── Toolbar ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-3"
        >
          {/* Row 1: search + filter toggle */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Email, action, entité, IP…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full pl-10 pr-9 ${inputClass}`}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border shadow-sm transition-all ${showFilters ? "bg-[#009B4D] text-white border-[#009B4D]" : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50"}`}
            >
              <FunnelIcon className="w-4 h-4" />
              Filtres avancés
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              )}
            </button>
          </div>

          {/* Row 2: category pills — always visible */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button key={key} onClick={() => setCategoryFilter(key)} className={pillClass(categoryFilter === key)}>
                {label}
              </button>
            ))}
          </div>

          {/* Advanced filters panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Action filter */}
                    <div>
                      <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Action spécifique
                      </label>
                      <select
                        value={actionFilter}
                        onChange={e => setActionFilter(e.target.value)}
                        className={`w-full ${inputClass}`}
                      >
                        <option value="all">Toutes les actions</option>
                        {uniqueActions.map(a => (
                          <option key={a} value={a}>{getActionMeta(a).label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date from */}
                    <div>
                      <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Date de début
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className={`w-full ${inputClass}`}
                      />
                    </div>

                    {/* Date to */}
                    <div>
                      <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Date de fin
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className={`w-full ${inputClass}`}
                      />
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {filtered.length.toLocaleString("fr-FR")} résultat{filtered.length > 1 ? "s" : ""} sur {logs.length.toLocaleString("fr-FR")}
                      </span>
                      <button onClick={resetFilters}
                        className="text-sm font-semibold text-[#009B4D] hover:underline flex items-center gap-1">
                        <XMarkIcon className="w-3 h-3" />Réinitialiser les filtres
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filter summary (when panel closed) */}
          {!showFilters && hasActiveFilters && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{filtered.length.toLocaleString("fr-FR")} résultat{filtered.length > 1 ? "s" : ""}</span>
              <button onClick={resetFilters} className="text-sm text-[#009B4D] font-semibold hover:underline flex items-center gap-1">
                <XMarkIcon className="w-3 h-3" />Réinitialiser
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* ── Desktop Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="hidden sm:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
            <DataTable data={paginated} columns={columns} loading={tableLoading} />
          </div>

          {/* Page size + pagination */}
          <div className="hidden sm:flex items-center gap-2 mt-3 text-sm text-gray-500 dark:text-gray-400">
            <span>Lignes :</span>
            {PAGE_SIZE_OPTIONS.map(n => (
              <button key={n} onClick={() => setPageSize(n)}
                className={`px-2.5 py-1 rounded-lg font-semibold border transition-all ${pageSize === n ? "bg-[#009B4D] text-white border-[#009B4D]" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300"}`}>
                {n}
              </button>
            ))}
          </div>
          <div className="hidden sm:block">
            <Pagination page={page} total={filtered.length} pageSize={pageSize} onChange={setPage} />
          </div>
        </motion.div>

        {/* ── Mobile Cards ── */}
        <div className="block sm:hidden space-y-3">
          {tableLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <DocumentTextIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucun log trouvé</p>
              <p className="text-sm mt-1">Modifiez vos filtres ou votre recherche</p>
            </div>
          ) : (
            paginated.map((log: AuditLog, i) => {
              const meta = getActionMeta(log.action);
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#009B4D]/10 flex items-center justify-center flex-shrink-0">
                        <UserCircleIcon className="w-5 h-5 text-[#009B4D]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{log.user?.email || "—"}</p>
                        <p className="text-sm text-gray-400">{formatRelative(log.timestamp)}</p>
                      </div>
                    </div>
                    <button onClick={() => setDetailLog(log)}
                      className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-400 flex-shrink-0 hover:text-gray-700 transition-all">
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold border ${meta.bg} ${meta.color} ${meta.border}`}>
                      {meta.icon}{meta.label}
                    </span>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <DocumentTextIcon className="w-3.5 h-3.5" />
                      {log.entity}{log.entityId ? ` #${log.entityId}` : ""}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          <Pagination page={page} total={filtered.length} pageSize={25} onChange={setPage} />
        </div>

        {/* ── Detail modal & Toast ── */}
        <LogDetailModal log={detailLog} onClose={() => setDetailLog(null)} />
        <AnimatePresence>
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </AnimatePresence>

      </main>
    </SidebarLayoutAdmin>
  );
}
