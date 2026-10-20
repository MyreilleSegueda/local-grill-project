"use client";
import SidebarLayoutAdmin from "@/src/navbar/SidebarLayoutAdmin";
import { useSessions } from "@/lib/hooks/useSessions";
import { useAuth } from "@/lib/hooks/useAuth";
import { DataTable } from "@/src/components/table/data-table";
import {
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  ClockIcon,
  UserCircleIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Session {
  id: number;
  userId: number;
  token: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: { email: string; fullName?: string; status?: string };
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function isExpired(date: string) {
  return new Date(date) < new Date();
}

function isExpiringSoon(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  return diff > 0 && diff < 30 * 60 * 1000; // < 30 min
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatRelative(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

function detectDevice(ua?: string | null) {
  const lower = (ua || "").toLowerCase();

  if (
    lower.includes("mobile") ||
    lower.includes("android") ||
    lower.includes("iphone")
  )
    return "mobile";

  if (lower.includes("tablet") || lower.includes("ipad"))
    return "tablet";

  return "desktop";
}

function detectBrowser(ua?: string | null): string {
  const agent = (ua || "").toLowerCase();

  if (agent.includes("edg")) return "Edge";
  if (agent.includes("chrome")) return "Chrome";
  if (agent.includes("firefox")) return "Firefox";
  if (agent.includes("safari")) return "Safari";

  return "Navigateur";
}

function getStatusInfo(session: Session) {
  if (isExpired(session.expiresAt))
    return { label: "Expirée", color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800/40" };
  if (isExpiringSoon(session.expiresAt))
    return { label: "Expire bientôt", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800/40" };
  return { label: "Active", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800/40" };
}

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";
function Toast({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const configs = {
    success: { bg: "bg-[#009B4D]", icon: <CheckCircleIcon className="w-4 h-4" /> },
    error:   { bg: "bg-red-600",   icon: <ExclamationTriangleIcon className="w-4 h-4" /> },
    info:    { bg: "bg-slate-700", icon: <ShieldExclamationIcon className="w-4 h-4" /> },
  };
  const { bg, icon } = configs[type];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white ${bg}`}
    >
      {icon}
      {message}
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white dark:bg-slate-900
                    border border-gray-100 dark:border-slate-800 shadow-sm">
      <div className="p-2 rounded-xl flex-shrink-0" style={{ backgroundColor: `${color}15`, color }}>
        {icon}
      </div>
      <div>
        <div className="text-xl font-extrabold text-gray-900 dark:text-white tabular-nums">{value}</div>
        <div className="text-sm text-gray-400 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <div className="flex items-center justify-between px-1 pt-4">
      <span className="text-sm text-gray-400">
        Page {page} / {totalPages} — {total} session{total > 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-2 rounded-xl border border-gray-200 dark:border-slate-700
                     text-gray-500 hover:text-gray-800 dark:hover:text-gray-200
                     disabled:opacity-30 disabled:cursor-not-allowed
                     hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="w-9 text-center text-sm text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all
                ${page === p
                  ? "bg-[#009B4D] text-white shadow-md shadow-emerald-500/20"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700"
                }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="p-2 rounded-xl border border-gray-200 dark:border-slate-700
                     text-gray-500 hover:text-gray-800 dark:hover:text-gray-200
                     disabled:opacity-30 disabled:cursor-not-allowed
                     hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Confirm Revoke Modal ─────────────────────────────────────────────────────
function ConfirmModal({ open, session, onClose, onConfirm, loading }: {
  open: boolean; session: Session | null;
  onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900
                       rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden"
          >
            <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 flex-shrink-0">
                <ShieldExclamationIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Révoquer la session</h2>
                <p className="text-sm text-gray-400 mt-0.5">Cette action déconnectera l'utilisateur immédiatement</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {session && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <UserCircleIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{session.user?.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <GlobeAltIcon className="w-3.5 h-3.5" />
                    {session.ipAddress || "IP inconnue"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <ClockIcon className="w-3.5 h-3.5" />
                    Expire le {formatDate(session.expiresAt)}
                  </div>
                </div>
              )}
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                <p className="text-sm text-red-700 dark:text-red-400">
                  La révocation est immédiate et irréversible. L'utilisateur devra se reconnecter.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-slate-800
                             text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold
                             bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg shadow-red-500/20
                             disabled:opacity-50 active:scale-[0.98]"
                >
                  {loading ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : <TrashIcon className="w-4 h-4" />}
                  {loading ? "Révocation…" : "Révoquer"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function AdminSessions() {
  const { token } = useAuth();
  const { sessions: rawSessions, loading, refresh } = useSessions(token || undefined) as {
    sessions: Session[]; loading: boolean; refresh: () => Promise<void>;
  };

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expiring" | "expired">("all");
  const [deviceFilter, setDeviceFilter] = useState<"all" | "desktop" | "mobile">("all");
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(10);
  const [revokeTarget, setRevokeTarget] = useState<Session | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [toast, setToast]             = useState<{ message: string; type: ToastType } | null>(null);
  const [refreshing, setRefreshing]   = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const showToast = (message: string, type: ToastType = "success") => setToast({ message, type });

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    rawSessions.length,
    active:   rawSessions.filter(s => !isExpired(s.expiresAt) && !isExpiringSoon(s.expiresAt)).length,
    expiring: rawSessions.filter(s => isExpiringSoon(s.expiresAt)).length,
    expired:  rawSessions.filter(s => isExpired(s.expiresAt)).length,
  }), [rawSessions]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rawSessions.filter(s => {
      const q = search.toLowerCase();
      const matchSearch =
        (s.user?.email || "").toLowerCase().includes(q) ||
        (s.ipAddress || "").includes(q) ||
        (s.user?.fullName || "").toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "all" ? true :
        statusFilter === "active"   ? (!isExpired(s.expiresAt) && !isExpiringSoon(s.expiresAt)) :
        statusFilter === "expiring" ? isExpiringSoon(s.expiresAt) :
        isExpired(s.expiresAt);

      const device = detectDevice(s.userAgent);
      const matchDevice =
        deviceFilter === "all" ? true :
        deviceFilter === "mobile" ? device === "mobile" :
        device === "desktop";

      return matchSearch && matchStatus && matchDevice;
    });
  }, [rawSessions, search, statusFilter, deviceFilter]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Reset page on filter change
  useEffect(() => setPage(1), [search, statusFilter, deviceFilter, pageSize]);

  // ── Refresh ────────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 600);
    showToast("Sessions actualisées", "info");
  };

  // ── Revoke ─────────────────────────────────────────────────────────────────
  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      const res = await fetch(`/api/admin/sessions/${revokeTarget.id}/revoke`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      showToast("Session révoquée avec succès");
      setRevokeTarget(null);
      await refresh();
    } catch {
      showToast("Erreur lors de la révocation", "error");
    } finally {
      setRevokeLoading(false);
    }
  };

  // ── Export XLSX ────────────────────────────────────────────────────────────
  const exportXLSX = async () => {
    try {
      const XLSX = await import("xlsx");
      const data = filtered.map(s => ({
        "Utilisateur": s.user?.email || "—",
        "Nom complet": s.user?.fullName || "—",
        "Adresse IP": s.ipAddress || "—",
        "Navigateur": detectBrowser(s.userAgent),
        "Appareil": detectDevice(s.userAgent),
        "Statut": getStatusInfo(s).label,
        "Créée le": formatDate(s.createdAt),
        "Expire le": formatDate(s.expiresAt),
        "User Agent": s.userAgent || "—",
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sessions");
      XLSX.writeFile(wb, `sessions_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast("Export XLSX téléchargé");
    } catch {
      showToast("Erreur export XLSX", "error");
    }
  };

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "landscape" });

      doc.setFontSize(14);
      doc.setTextColor(0, 155, 77);
      doc.text("Sessions actives", 14, 16);
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Exporté le ${new Date().toLocaleString("fr-FR")} — ${filtered.length} résultat(s)`, 14, 23);

      autoTable(doc, {
        startY: 28,
        head: [["Utilisateur", "IP", "Navigateur", "Statut", "Créée le", "Expire le"]],
        body: filtered.map(s => [
          s.user?.email || "—",
          s.ipAddress || "—",
          detectBrowser(s.userAgent),
          getStatusInfo(s).label,
          formatDate(s.createdAt),
          formatDate(s.expiresAt),
        ]),
        headStyles: { fillColor: [0, 155, 77], textColor: 255, fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [245, 250, 247] },
        styles: { cellPadding: 3 },
      });

      doc.save(`sessions_${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast("Export PDF téléchargé");
    } catch {
      showToast("Erreur export PDF", "error");
    }
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      header: "Utilisateur",
      accessorKey: "user.email",
      cell: ({ row }: any) => {
        const s: Session = row.original;
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#009B4D]/10 flex items-center justify-center flex-shrink-0">
              <UserCircleIcon className="w-4 h-4 text-[#009B4D]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                {s.user?.email || "—"}
              </div>
              {s.user?.fullName && (
                <div className="text-sm text-gray-400 truncate max-w-[180px]">{s.user.fullName}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "Adresse IP",
      accessorKey: "ipAddress",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <GlobeAltIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />
          <span className="font-mono text-sm">{row.original.ipAddress || "—"}</span>
        </div>
      ),
    },
    {
      header: "Appareil",
      accessorKey: "userAgent",
      cell: ({ row }: any) => {
        const ua = row.original.userAgent || "";
        const device = detectDevice(ua);
        const browser = detectBrowser(ua);
        return (
          <div className="flex items-center gap-1.5">
            {device === "mobile"
              ? <DevicePhoneMobileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              : <ComputerDesktopIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            <span className="text-sm text-gray-600 dark:text-gray-400">{browser}</span>
          </div>
        );
      },
    },
    {
      header: "Statut",
      accessorKey: "_status",
      cell: ({ row }: any) => {
        const info = getStatusInfo(row.original);
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold border ${info.bg} ${info.color} ${info.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              info.label === "Active" ? "bg-emerald-500" :
              info.label === "Expire bientôt" ? "bg-amber-500" : "bg-red-500"
            }`} />
            {info.label}
          </span>
        );
      },
    },
    {
      header: "Créée",
      accessorKey: "createdAt",
      cell: ({ row }: any) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <div>{formatRelative(row.original.createdAt)}</div>
          <div className="text-gray-300 dark:text-gray-600 mt-0.5">{formatDate(row.original.createdAt)}</div>
        </div>
      ),
    },
    {
      header: "Expiration",
      accessorKey: "expiresAt",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <ClockIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isExpired(row.original.expiresAt) ? "text-red-400" : isExpiringSoon(row.original.expiresAt) ? "text-amber-400" : "text-gray-400"}`} />
          <span>{formatDate(row.original.expiresAt)}</span>
        </div>
      ),
    },
    {
      header: "Actions",
      cell: ({ row }: any) => (
        <button
          title="Révoquer la session"
          onClick={() => setRevokeTarget(row.original)}
          className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40
                     text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/50
                     transition-all duration-150"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const filterBtnClass = (active: boolean) =>
    `px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150 border ${
      active
        ? "bg-[#009B4D] text-white border-[#009B4D] shadow-md shadow-emerald-500/20"
        : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
    }`;

  return (
    <SidebarLayoutAdmin>
      <main className="w-full max-w-[1300px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#009B4D]/10">
              <ShieldExclamationIcon className="w-6 h-6 text-[#009B4D]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Sessions actives
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Gérez et surveillez les connexions en cours
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                         bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300
                         border border-gray-200 dark:border-slate-700
                         hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button
              onClick={exportXLSX}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                         bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400
                         border border-emerald-200 dark:border-emerald-800/50
                         hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all shadow-sm"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span className="hidden sm:inline">XLSX</span>
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                         bg-white dark:bg-slate-800 text-red-600 dark:text-red-400
                         border border-red-200 dark:border-red-800/50
                         hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shadow-sm"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </motion.div>

        {/* ── Stats bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <StatCard label="Total" value={stats.total} icon={<ClockIcon className="w-5 h-5" />} color="#6B7280" />
          <StatCard label="Actives" value={stats.active} icon={<CheckCircleIcon className="w-5 h-5" />} color="#009B4D" />
          <StatCard label="Expirent bientôt" value={stats.expiring} icon={<ExclamationTriangleIcon className="w-5 h-5" />} color="#F59E0B" />
          <StatCard label="Expirées" value={stats.expired} icon={<ShieldExclamationIcon className="w-5 h-5" />} color="#EF4444" />
        </motion.div>

        {/* ── Toolbar: search + filters ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher email, nom, IP…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm
                           bg-white dark:bg-slate-900
                           border border-gray-200 dark:border-slate-700
                           text-gray-800 dark:text-gray-200 placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-[#009B4D]/25 focus:border-[#009B4D]
                           shadow-sm transition-all duration-200"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter toggle (mobile) */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border shadow-sm transition-all sm:hidden
                ${showFilters ? "bg-[#009B4D] text-white border-[#009B4D]" : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700"}`}
            >
              <FunnelIcon className="w-4 h-4" />
              Filtres
            </button>

            {/* Filters – always visible on sm+ */}
            <div className={`flex flex-wrap gap-2 items-center sm:flex ${showFilters ? "flex" : "hidden"}`}>
              <div className="flex gap-1.5 flex-wrap">
                {(["all", "active", "expiring", "expired"] as const).map(f => (
                  <button key={f} onClick={() => setStatusFilter(f)} className={filterBtnClass(statusFilter === f)}>
                    {f === "all" ? "Tous" : f === "active" ? "Actives" : f === "expiring" ? "Expirent bientôt" : "Expirées"}
                  </button>
                ))}
              </div>
              <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 hidden sm:block" />
              <div className="flex gap-1.5 flex-wrap">
                {(["all", "desktop", "mobile"] as const).map(f => (
                  <button key={f} onClick={() => setDeviceFilter(f)} className={filterBtnClass(deviceFilter === f)}>
                    {f === "all" ? "Tous appareils" : f === "desktop" ? "Desktop" : "Mobile"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results count */}
          {(search || statusFilter !== "all" || deviceFilter !== "all") && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filtered.length} résultat{filtered.length > 1 ? "s" : ""} trouvé{filtered.length > 1 ? "s" : ""}
              </span>
              <button
                onClick={() => { setSearch(""); setStatusFilter("all"); setDeviceFilter("all"); }}
                className="text-sm text-[#009B4D] font-semibold hover:underline flex items-center gap-1"
              >
                <XMarkIcon className="w-3 h-3" />
                Réinitialiser
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* ── Desktop table ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="hidden sm:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm
                          border border-gray-100 dark:border-slate-800 overflow-hidden">
            <DataTable data={paginated} columns={columns} loading={loading} />
          </div>

          {/* Page size selector */}
          <div className="hidden sm:flex items-center gap-2 mt-3 text-sm text-gray-500 dark:text-gray-400">
            <span>Lignes par page :</span>
            {PAGE_SIZE_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setPageSize(n)}
                className={`px-2.5 py-1 rounded-lg font-semibold border transition-all ${
                  pageSize === n
                    ? "bg-[#009B4D] text-white border-[#009B4D]"
                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Pagination */}
          <div className="hidden sm:block">
            <Pagination page={page} total={filtered.length} pageSize={pageSize} onChange={setPage} />
          </div>
        </motion.div>

        {/* ── Mobile cards ── */}
        <div className="block sm:hidden space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShieldExclamationIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucune session trouvée</p>
              <p className="text-sm mt-1">Modifiez vos filtres ou lancez une recherche</p>
            </div>
          ) : (
            paginated.map((session: Session, i) => {
              const info = getStatusInfo(session);
              const device = detectDevice(session.userAgent);
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#009B4D]/10 flex items-center justify-center flex-shrink-0">
                        <UserCircleIcon className="w-5 h-5 text-[#009B4D]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                          {session.user?.email || "—"}
                        </p>
                        {session.user?.fullName && (
                          <p className="text-sm text-gray-400 truncate">{session.user.fullName}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setRevokeTarget(session)}
                      className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40
                                 text-red-400 hover:text-red-600 flex-shrink-0 transition-all"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <GlobeAltIcon className="w-3.5 h-3.5" />
                      <span className="font-mono">{session.ipAddress || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      {device === "mobile"
                        ? <DevicePhoneMobileIcon className="w-3.5 h-3.5" />
                        : <ComputerDesktopIcon className="w-3.5 h-3.5" />}
                      {detectBrowser(session.userAgent)}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {formatRelative(session.createdAt)}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border w-fit ${info.bg} ${info.color} ${info.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${info.label === "Active" ? "bg-emerald-500" : info.label === "Expire bientôt" ? "bg-amber-500" : "bg-red-500"}`} />
                      {info.label}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}

          {/* Mobile pagination */}
          <Pagination page={page} total={filtered.length} pageSize={10} onChange={setPage} />
        </div>

        {/* ── Modals & Toast ── */}
        <ConfirmModal
          open={!!revokeTarget}
          session={revokeTarget}
          onClose={() => setRevokeTarget(null)}
          onConfirm={handleRevoke}
          loading={revokeLoading}
        />
        <AnimatePresence>
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </AnimatePresence>

      </main>
    </SidebarLayoutAdmin>
  );
}
