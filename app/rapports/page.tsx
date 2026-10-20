"use client";

import React, { useEffect, useState, useRef } from "react";
import SidebarLayout from "@/src/navbar/SidebarLayout";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePagePermissions } from "@/lib/hooks/usePagePermissions";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  TrendingDown, TrendingUp, BarChart2, FileSpreadsheet,
  FileDown, RefreshCw, AlertTriangle, CheckCircle2,
  XCircle, AlertCircle, Activity, Package, Users,
  ShieldCheck, Layers, Search, X, Calendar, Database,
  LucideIcon, ChevronDown,
} from "lucide-react";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import type { JSX } from "react";

/* ═══════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════ */

type NotifType = "success" | "error" | "warning";
interface Notif { type: NotifType; message: string; }

interface DailyConsumption { date: string; total_consumed: number; }
interface TopProduct       { product_id: number; name: string; category_name: string; total_consumed: number; avg_consumption: number; }
interface Losses           { total_loss_value: number; expired_count: number; loss_percentage: number; }
interface InventoryHealth  { accuracy_percentage: number; total_items: number; discrepancies: number; }
interface Movement         { id: number; product_name: string; quantity: number; type: string; created_at: string; user_name: string; }
interface AppUser          { id: number; name: string; email: string; role: string; created_at: string; }
interface Role             { id: number; name: string; description: string; }
interface Permission       { id: number; name: string; description: string; }
interface Category         { id: number; name: string; }
interface Supplier         { id: number; name: string; email: string; phone: string; }
interface Unit             { id: number; name: string; symbol: string; }
interface AlertItem        { id: number; type: string; severity: string; message: string; is_resolved: boolean; created_at: string; }
interface ActivityLog      { id: number; user_id: number; action: string; entity_type: string; created_at: string; }
interface KPIs             { totalStockValue: number; totalProducts: number; criticalAlerts: number; totalMovements: number; }

interface ReportData {
  kpis:              KPIs;
  daily_consumption: DailyConsumption[];
  top_products:      TopProduct[];
  losses:            Losses;
  inventory_health:  InventoryHealth;
  movements:         Movement[];
  users:             AppUser[];
  roles:             Role[];
  permissions:       Permission[];
  categories:        Category[];
  suppliers:         Supplier[];
  units:             Unit[];
  alerts:            AlertItem[];
  activity_logs:     ActivityLog[];
}

type RGB    = [number, number, number];
type TabKey = "consumption" | "products" | "movements" | "alerts" | "losses" | "users" | "logs";

interface KpiConfig {
  title:   string;
  value:   number;
  suffix?: string;
  Icon:    LucideIcon;
  accent:  string;
  iconBg:  string;
  iconCol: string;
  valCol:  string;
  sub?:    string;
}

/* ═══════════════════════════════════════════════════════════════════
   DESIGN SYSTEM
═══════════════════════════════════════════════════════════════════ */

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap');
`;

const CSS = `
  :root {
    --bg:            #F8F7F4;
    --surface:       #FFFFFF;
    --surface-2:     #F1F0EC;
    --border:        #E5E2DB;
    --border-strong: #CCCAB8;
    --text:          #0F1117;
    --text-2:        #5C5A52;
    --text-3:        #9C9A92;
    --accent:        #4F46E5;
    --accent-light:  #EEF2FF;
    --accent-dark:   #3730A3;
  }

  * { font-family: 'DM Sans', system-ui, sans-serif; box-sizing: border-box; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border-strong); border-radius:99px; }
  ::-webkit-scrollbar-thumb:hover { background:var(--text-3); }
  .serif { font-family:'Instrument Serif', Georgia, serif; }

  /* ── inputs ─────────────────────────────────────────────────── */
  .fi {
    width:100%; background:var(--surface);
    border:1.5px solid var(--border); border-radius:10px;
    padding:10px 14px; font-size:14px; color:var(--text);
    transition:border-color .2s, box-shadow .2s; outline:none; -webkit-appearance:none;
  }
  .fi::placeholder { color:var(--text-3); }
  .fi:hover  { border-color:var(--border-strong); }
  .fi:focus  { border-color:var(--accent); box-shadow:0 0 0 3px rgba(79,70,229,.1); }

  /* ── buttons ─────────────────────────────────────────────────── */
  .btn-primary {
    display:inline-flex; align-items:center; justify-content:center; gap:7px;
    padding:10px 18px; border-radius:10px;
    background:var(--accent); color:#fff;
    font-size:13.5px; font-weight:600; border:none; cursor:pointer;
    transition:background .18s, box-shadow .18s, transform .12s;
    box-shadow:0 2px 8px rgba(79,70,229,.28); white-space:nowrap;
  }
  .btn-primary:hover   { background:var(--accent-dark); transform:translateY(-1px); }
  .btn-primary:active  { transform:translateY(0); }
  .btn-primary:disabled { opacity:.4; cursor:not-allowed; transform:none; }

  .btn-ghost {
    display:inline-flex; align-items:center; justify-content:center; gap:6px;
    padding:9px 14px; border-radius:10px;
    background:transparent; color:var(--text-2);
    font-size:13px; font-weight:500;
    border:1.5px solid var(--border); cursor:pointer; transition:all .18s;
    white-space:nowrap;
  }
  .btn-ghost:hover    { border-color:var(--border-strong); color:var(--text); background:var(--surface-2); }
  .btn-ghost:disabled { opacity:.4; cursor:not-allowed; }

  .btn-xlsx {
    display:inline-flex; align-items:center; justify-content:center; gap:6px;
    padding:8px 13px; border-radius:10px;
    background:#F0FDF4; color:#166534;
    font-size:12.5px; font-weight:600;
    border:1.5px solid #BBF7D0; cursor:pointer; transition:all .18s;
    white-space:nowrap;
  }
  .btn-xlsx:hover    { background:#DCFCE7; border-color:#86EFAC; transform:translateY(-1px); }
  .btn-xlsx:disabled { opacity:.4; cursor:not-allowed; transform:none; }

  .btn-pdf {
    display:inline-flex; align-items:center; justify-content:center; gap:6px;
    padding:8px 13px; border-radius:10px;
    background:#FFF1F2; color:#9F1239;
    font-size:12.5px; font-weight:600;
    border:1.5px solid #FECDD3; cursor:pointer; transition:all .18s;
    white-space:nowrap;
  }
  .btn-pdf:hover    { background:#FFE4E6; border-color:#FCA5A5; transform:translateY(-1px); }
  .btn-pdf:disabled { opacity:.4; cursor:not-allowed; transform:none; }

  /* ── table ───────────────────────────────────────────────────── */
  .tbl { width:100%; border-collapse:collapse; font-size:13px; }
  .tbl thead th {
    padding:10px 14px; text-align:left;
    font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
    color:var(--text-3); background:var(--surface-2);
    border-bottom:1.5px solid var(--border); white-space:nowrap;
  }
  .tbl tbody td {
    padding:11px 14px; color:var(--text-2);
    border-bottom:1px solid var(--border); vertical-align:middle;
  }
  .tbl tbody tr:hover { background:#F7F6F2; }
  .tbl tbody tr:last-child td { border-bottom:none; }

  /* ── tags ────────────────────────────────────────────────────── */
  .tag {
    display:inline-flex; align-items:center; gap:4px;
    padding:3px 9px; border-radius:99px;
    font-size:11px; font-weight:600; letter-spacing:.03em;
  }
  .tag-green { background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0; }
  .tag-red   { background:#FEF2F2; color:#991B1B; border:1px solid #FCA5A5; }
  .tag-amber { background:#FFFBEB; color:#92400E; border:1px solid #FDE68A; }
  .tag-blue  { background:#EEF2FF; color:#3730A3; border:1px solid #C7D2FE; }
  .tag-stone { background:var(--surface-2); color:var(--text-2); border:1px solid var(--border); }

  /* ── tabs ────────────────────────────────────────────────────── */
  .tab-pill {
    display:inline-flex; align-items:center; gap:5px;
    padding:7px 12px; border-radius:8px;
    font-size:12.5px; font-weight:600; cursor:pointer;
    border:1.5px solid transparent;
    background:transparent; color:var(--text-3);
    transition:all .18s; white-space:nowrap;
  }
  .tab-pill:hover { color:var(--text-2); background:var(--surface-2); }
  .tab-pill.active { background:var(--surface); color:var(--text); border-color:var(--border); box-shadow:0 1px 4px rgba(0,0,0,.07); }

  /* mobile tab select */
  .tab-select {
    width:100%; background:var(--surface);
    border:1.5px solid var(--border); border-radius:10px;
    padding:10px 36px 10px 14px; font-size:13.5px; color:var(--text);
    outline:none; cursor:pointer; -webkit-appearance:none; appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239C9A92' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 12px center;
  }
  .tab-select:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(79,70,229,.1); }

  /* ── misc ────────────────────────────────────────────────────── */
  .kpi-stripe { position:absolute; top:0; left:0; right:0; height:2px; border-radius:99px 99px 0 0; }

  @keyframes spin { to { transform:rotate(360deg); } }
  .spin { animation:spin .7s linear infinite; display:inline-block; }

  @keyframes sk { 0%,100%{opacity:1}50%{opacity:.4} }
  .sk { background:var(--border); border-radius:8px; animation:sk 1.6s ease infinite; }

  .bar-track { background:var(--border); border-radius:99px; overflow:hidden; }
  .bar-fill  { border-radius:99px; }

  /* ── responsive utilities ────────────────────────────────────── */
  @media (max-width: 639px) {
    .hide-xs   { display:none !important; }
    .show-xs   { display:flex !important; }
    .col-xs    { flex-direction:column !important; align-items:stretch !important; }
    .gap-xs-2  { gap:8px !important; }
    .full-xs   { width:100% !important; }
    .text-sm-sm{ font-size:13px !important; }
  }
  @media (min-width: 640px) {
    .show-xs   { display:none !important; }
  }
`;

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════ */

const fmt = (n: number, dec = 0): string =>
  n?.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec }) ?? "0";

const fmtDate = (d: string): string =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }) : "—";

/* ═══════════════════════════════════════════════════════════════════
   MICRO-COMPONENTS
═══════════════════════════════════════════════════════════════════ */

function Fonts(): null {
  useEffect(() => {
    if (document.getElementById("rp-fonts")) return;
    const s = document.createElement("style");
    s.id = "rp-fonts"; s.textContent = FONTS;
    document.head.appendChild(s);
  }, []);
  return null;
}

function Toast({ show, notif }: { show: boolean; notif: Notif | null }): JSX.Element {
  const icons: Record<NotifType, React.ReactNode> = {
    success: <CheckCircle2 size={15}/>,
    error:   <XCircle size={15}/>,
    warning: <AlertCircle size={15}/>,
  };
  const cls: Record<NotifType, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error:   "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  };
  return (
    <AnimatePresence>
      {show && notif && (
        <motion.div
          initial={{ opacity:0, y:-24, scale:.94 }}
          animate={{ opacity:1, y:0, scale:1 }}
          exit={{ opacity:0, y:-20, scale:.94 }}
          transition={{ type:"spring", stiffness:420, damping:28 }}
          className={`fixed top-4 right-4 z-[70] flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl max-w-xs ${cls[notif.type]}`}
          style={{ left:"1rem", right:"1rem", maxWidth:"calc(100vw - 2rem)" }}
        >
          {icons[notif.type]}
          <span className="flex-1 min-w-0 leading-snug">{notif.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ icon: Icon, text }: { icon: LucideIcon; text: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <Icon size={11} style={{ color:"#0b0c0ec0", flexShrink:0 }}/>
      <span className="text-[12px] font-bold tracking-[0.22em] uppercase whitespace-nowrap" style={{ color:"#0b0c0ec0" }}>{text}</span>
      <div className="flex-1 h-px" style={{ background:"var(--border)" }}/>
    </div>
  );
}

function CountUp({ end }: { end: number }): JSX.Element {
  const [val, setVal] = useState(0);
  const ref    = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let s = 0;
    const step = (end || 0) / (900 / 16);
    const t = setInterval(() => {
      s += step;
      if (s >= end) { setVal(end || 0); clearInterval(t); }
      else setVal(Math.floor(s));
    }, 16);
    return () => clearInterval(t);
  }, [inView, end]);
  return <span ref={ref}>{val.toLocaleString("fr-FR")}</span>;
}

function AnimBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }): JSX.Element {
  return (
    <div className="flex-1 h-1.5 bar-track">
      <motion.div
        className="h-1.5 bar-fill"
        initial={{ width:0 }}
        animate={{ width:`${Math.min(pct, 100)}%` }}
        transition={{ duration:1, ease:[.16,1,.3,1], delay }}
        style={{ background: color }}
      />
    </div>
  );
}

function KpiCard({ cfg, idx }: { cfg: KpiConfig; idx: number }): JSX.Element {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity:0, y:24 }}
      animate={{ opacity:1, y:0 }}
      transition={{ delay: idx * .06, type:"spring", stiffness:100, damping:18 }}
    >
      <motion.div
        animate={{ y:hov?-3:0, boxShadow:hov?"0 14px 40px -8px rgba(15,17,23,.12)":"0 1px 4px rgba(15,17,23,.06)" }}
        transition={{ duration:.22 }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className="relative overflow-hidden rounded-2xl border p-4 sm:p-5 h-full"
        style={{ background:"var(--surface)", borderColor: hov ? cfg.accent : "var(--border)" }}
      >
        <div className="kpi-stripe" style={{ background: cfg.accent }}/>
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl mb-3 sm:mb-4" style={{ background: cfg.iconBg }}>
          <cfg.Icon size={15} style={{ color: cfg.iconCol }}/>
        </div>
        <p className="text-[12px] sm:text-[12px] font-bold tracking-[.14em] uppercase mb-1" style={{ color:"#0b0c0ec0" }}>{cfg.title}</p>
        <p className="text-2xl sm:text-3xl font-light leading-none" style={{ color: cfg.valCol }}>
          <CountUp end={cfg.value}/>{cfg.suffix}
        </p>
        {cfg.sub && <p className="mt-1.5 text-[14px] sm:text-[14px]" style={{ color:"#0b0c0ec0" }}>{cfg.sub}</p>}
      </motion.div>
    </motion.div>
  );
}

/* Export pair — wraps on mobile */
function ExportPair({ onXlsx, onPdf, lx, lp }: { onXlsx: () => void; onPdf: () => void; lx: boolean; lp: boolean }): JSX.Element {
  return (
    <div className="flex gap-2 shrink-0 flex-wrap">
      <button className="btn-xlsx" onClick={onXlsx} disabled={lx}>
        {lx ? <span className="w-3 h-3 border-2 border-green-400/40 border-t-green-600 rounded-full spin"/> : <FileSpreadsheet size={13}/>}
        <span>Excel</span>
      </button>
      <button className="btn-pdf" onClick={onPdf} disabled={lp}>
        {lp ? <span className="w-3 h-3 border-2 border-red-300/40 border-t-red-600 rounded-full spin"/> : <FileDown size={13}/>}
        <span>PDF</span>
      </button>
    </div>
  );
}

/* Mobile card */
function MobileCard({ children, bc = "var(--border)" }: { children: React.ReactNode; bc?: string }): JSX.Element {
  return (
    <div className="rounded-xl p-4 shadow-sm" style={{ background:"var(--surface)", border:`1.5px solid ${bc}` }}>
      {children}
    </div>
  );
}

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
          Permission requise: <code className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{permission}</code>
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════ */

export default function RapportsPage(): JSX.Element {
  const { token } = useAuth();
  const { can, isLoading: permLoading } = usePagePermissions();

  const canView = can("REPORTS_VIEW");

  if (!permLoading && !canView) {
    return (
      <SidebarLayout>
        <AccessDenied permission="REPORTS_VIEW" />
      </SidebarLayout>
    );
  }

  /* notification */
  const [notif, setNotif] = useState<Notif | null>(null);
  const [show,  setShow]  = useState(false);
  const notify = (type: NotifType, message: string) => setNotif({ type, message });
  useEffect(() => {
    if (!notif) return;
    setShow(true);
    const t = setTimeout(() => { setShow(false); setTimeout(() => setNotif(null), 300); }, 3800);
    return () => clearTimeout(t);
  }, [notif]);

  /* state */
  const [reports,   setReports]   = useState<ReportData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end:   new Date().toISOString().split("T")[0],
  });
  const [tab,      setTab]     = useState<TabKey>("consumption");
  const [xlLoad,   setXlLoad]  = useState(false);
  const [pdfLoad,  setPdfLoad] = useState(false);
  const [txl,      setTxl]     = useState(false);
  const [tpdf,     setTpdf]    = useState(false);

  useEffect(() => { if (token) fetchReports(); }, [token, dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const p   = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
      const res = await fetch(`/api/reports?${p.toString()}`, { headers: { Authorization:`Bearer ${token}` } });
      if (res.ok) {
        const d: { data: ReportData } = await res.json();
        setReports(d.data);
      } else {
        notify("error", "Erreur lors du chargement");
      }
    } catch { notify("error", "Erreur réseau"); }
    finally  { setLoading(false); }
  };

  const handleGlobalXlsx = async () => {
    if (!reports) return; setXlLoad(true);
    try {
      const r = await fetch("/api/exports/reports?format=xlsx", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ data: reports, start: dateRange.start, end: dateRange.end })
      });
      
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        notify("error", err.error || "Erreur export XLSX");
        return;
      }
      
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LocalGrill_Rapport_${dateRange.start}_${dateRange.end}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      notify("success", "Export XLSX réussi !");
    } catch {
      notify("error", "Erreur réseau lors de l'export XLSX");
    } finally {
      setXlLoad(false);
    }
  };

  const handleGlobalPdf = async () => {
    if (!reports) return; setPdfLoad(true);
    try {
      const r = await fetch("/api/exports/reports?format=pdf", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ data: reports, start: dateRange.start, end: dateRange.end })
      });
      
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        notify("error", err.error || "Erreur export PDF");
        return;
      }
      
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LocalGrill_Rapport_${dateRange.start}_${dateRange.end}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      notify("success", "Export PDF réussi !");
    } catch {
      notify("error", "Erreur réseau lors de l'export PDF");
    } finally {
      setPdfLoad(false);
    }
  };

  /* per-tab XLSX */
  const exportTabXlsx = async () => {
    if (!reports) return; setTxl(true);
    try {
      const XLSX = await import("xlsx");
      const wb   = XLSX.utils.book_new();
      const now  = new Date().toLocaleDateString("fr-FR").replace(/\//g,"-");
      type SR = Record<string, string | number | boolean>;
      const add = (rows: SR[], name: string) => {
        if (!rows.length) return;
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length+4, 16) }));
        XLSX.utils.book_append_sheet(wb, ws, name);
      };
      if (tab === "consumption") add(reports.daily_consumption.map(d => ({ "Date":d.date, "Consommation":d.total_consumed })), "Consommation");
      if (tab === "products")    add(reports.top_products.map(p => ({ "Produit":p.name, "Catégorie":p.category_name, "Total":p.total_consumed, "Moy":+p.avg_consumption.toFixed(2) })), "Top Produits");
      if (tab === "movements")   add(reports.movements.map(m => ({ "Produit":m.product_name, "Qté":m.quantity, "Type":m.type, "Date":fmtDate(m.created_at), "User":m.user_name })), "Mouvements");
      if (tab === "alerts")      add(reports.alerts.map(a => ({ "Type":a.type, "Sévérité":a.severity, "Message":a.message, "Résolue":a.is_resolved?"Oui":"Non", "Date":fmtDate(a.created_at) })), "Alertes");
      if (tab === "losses")      add([{ "Pertes (FCFA)":reports.losses.total_loss_value, "Expirés":reports.losses.expired_count, "% perte":reports.losses.loss_percentage }], "Pertes");
      if (tab === "users")       add(reports.users.map(u => ({ "Nom":u.name, "Email":u.email, "Rôle":u.role, "Depuis":fmtDate(u.created_at) })), "Utilisateurs");
      if (tab === "logs")        add(reports.activity_logs.map(l => ({ "User":l.user_id, "Action":l.action, "Entité":l.entity_type, "Date":fmtDate(l.created_at) })), "Logs");
      XLSX.writeFile(wb, `${tab}-${now}.xlsx`);
      notify("success","Export Excel réussi !");
    } catch { notify("error","Erreur export"); }
    finally { setTxl(false); }
  };

  /* per-tab PDF */
  const exportTabPdf = async () => {
    if (!reports) return; setTpdf(true);
    try {
      const { default: jsPDF }     = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc  = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
      const now  = new Date().toLocaleDateString("fr-FR");
      const W    = doc.internal.pageSize.getWidth();
      const H    = doc.internal.pageSize.getHeight();
      const dark:   RGB = [15,17,23];
      const white:  RGB = [255,255,255];
      const light:  RGB = [241,240,236];
      const accent: RGB = [79,70,229];

      const titles: Record<TabKey, string> = {
        consumption:"Consommation quotidienne", products:"Top produits consommés",
        movements:"Mouvements récents",         alerts:"Alertes",
        losses:"Pertes & gaspillage",           users:"Utilisateurs",
        logs:"Logs d'activité",
      };

      doc.setFillColor(...accent); doc.rect(0,0,W,14,"F");
      doc.setTextColor(...white);
      doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.text(titles[tab].toUpperCase(), 14, 10);
      doc.setFontSize(8);  doc.setFont("helvetica","normal"); doc.text(`Généré le ${now}  |  ${dateRange.start} → ${dateRange.end}`, W-14, 10, { align:"right" });

      let head: string[][];
      let body: (string | number)[][];

      if (tab === "consumption") {
        head = [["Date","Consommation"]];
        body = reports.daily_consumption.map(d => [d.date, fmt(d.total_consumed)]);
      } else if (tab === "products") {
        head = [["Produit","Catégorie","Total","Moyenne"]];
        body = reports.top_products.map(p => [p.name, p.category_name, fmt(p.total_consumed), p.avg_consumption.toFixed(2)]);
      } else if (tab === "movements") {
        head = [["Produit","Quantité","Type","Date","Utilisateur"]];
        body = reports.movements.map(m => [m.product_name, m.quantity, m.type, fmtDate(m.created_at), m.user_name]);
      } else if (tab === "alerts") {
        head = [["Type","Sévérité","Message","Résolue","Date"]];
        body = reports.alerts.map(a => [a.type, a.severity, a.message, a.is_resolved?"Oui":"Non", fmtDate(a.created_at)]);
      } else if (tab === "losses") {
        head = [["Valeur pertes (FCFA)","Produits expirés","% perte / stock"]];
        body = [[fmt(reports.losses.total_loss_value), reports.losses.expired_count, `${reports.losses.loss_percentage.toFixed(2)}%`]];
      } else if (tab === "users") {
        head = [["Nom","Email","Rôle","Depuis"]];
        body = reports.users.map(u => [u.name, u.email, u.role, fmtDate(u.created_at)]);
      } else {
        head = [["User ID","Action","Entité","Date"]];
        body = reports.activity_logs.map(l => [l.user_id, l.action, l.entity_type, fmtDate(l.created_at)]);
      }

      autoTable(doc, {
        startY:18, head, body,
        styles:{ fontSize:9, cellPadding:3, textColor:dark },
        headStyles:{ fillColor:dark, textColor:white, fontStyle:"bold", fontSize:9 },
        alternateRowStyles:{ fillColor:light },
        margin:{ left:14, right:14 },
      });

      const total: number = (doc.internal as unknown as { pages: unknown[] }).pages.length - 1;
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(155,149,145);
        doc.text(`Page ${i} / ${total}`, W-14, H-5, { align:"right" });
        doc.text("Système de gestion de stock", 14, H-5);
      }
      doc.save(`${tab}-${dateRange.start}.pdf`);
      notify("success","Export PDF réussi !");
    } catch { notify("error","Erreur export PDF"); }
    finally { setTpdf(false); }
  };

  /* KPI configs */
  const kpiCfgs: KpiConfig[] = reports ? [
    { title:"Valeur stock",      value:reports.kpis.totalStockValue,                suffix:" FCFA",  Icon:Database,      accent:"#4F46E5", iconBg:"#EEF2FF", iconCol:"#4F46E5", valCol:"#3730A3", sub:"valeur totale"  },
    { title:"Produits actifs",   value:reports.kpis.totalProducts,                                   Icon:Package,       accent:"#059669", iconBg:"#ECFDF5", iconCol:"#059669", valCol:"#065F46", sub:"références"     },
    { title:"Alertes critiques", value:reports.kpis.criticalAlerts,                                  Icon:AlertTriangle, accent:"#DC2626", iconBg:"#FEF2F2", iconCol:"#DC2626", valCol:"#7F1D1D", sub:"non résolues"   },
    { title:"Santé inventaire",  value:reports.inventory_health.accuracy_percentage, suffix:"%",     Icon:ShieldCheck,   accent:"#059669", iconBg:"#ECFDF5", iconCol:"#059669", valCol:"#065F46", sub:"précision"      },
    { title:"Pertes totales",    value:reports.losses.total_loss_value,               suffix:" FCFA", Icon:TrendingDown,  accent:"#D97706", iconBg:"#FFFBEB", iconCol:"#D97706", valCol:"#78350F", sub:"gaspillage"     },
    { title:"Mouvements",        value:reports.kpis.totalMovements,                                  Icon:Activity,      accent:"#7C3AED", iconBg:"#F5F3FF", iconCol:"#7C3AED", valCol:"#4C1D95", sub:"sur la période" },
  ] : [];

  const TABS: Array<{ key: TabKey; label: string; Icon: LucideIcon }> = [
    { key:"consumption", label:"Consommation", Icon:TrendingDown  },
    { key:"products",    label:"Top Produits", Icon:TrendingUp    },
    { key:"movements",   label:"Mouvements",   Icon:Activity      },
    { key:"alerts",      label:"Alertes",      Icon:AlertTriangle },
    { key:"losses",      label:"Pertes",       Icon:XCircle       },
    { key:"users",       label:"Utilisateurs", Icon:Users         },
    { key:"logs",        label:"Logs",         Icon:Layers        },
  ];

  const tabCount: Record<TabKey, string> = reports ? {
    consumption: `${reports.daily_consumption.length} entrées`,
    products:    `${reports.top_products.length} produits`,
    movements:   `${reports.movements.length} mouvements`,
    alerts:      `${reports.alerts.length} alertes`,
    losses:      "Pertes & gaspillage",
    users:       `${reports.users.length} utilisateurs`,
    logs:        `${reports.activity_logs.length} logs`,
  } : { consumption:"", products:"", movements:"", alerts:"", losses:"", users:"", logs:"" };

  return (
    <SidebarLayout>
      <Fonts/>
      <style>{CSS}</style>
      <Toast show={show} notif={notif}/>

      <main
        className="min-h-screen pb-20 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
        style={{ background:"var(--bg)", color:"var(--text)" }}
      >
        <div className="max-w-7xl mx-auto">

          {/* ── HEADER ──────────────────────────────────────────── */}
          <motion.header
            initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:.38, ease:[.25,.46,.45,.94] }}
            className="mb-8"
          >
            {/* Title row */}
            <div className="mb-4">
              <p className="text-[12px] tracking-[.28em] uppercase font-bold mb-1.5" style={{ color:"#0b0c0ec0" }}>Gestion de stock</p>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight" style={{ color:"var(--text)" }}>Rapports & Exports</h1>
              <p className="mt-1 text-sm" style={{ color:"#0b0c0ec0" }}>Analyse complète · Exportation XLSX &amp; PDF · Filtrage par période</p>
            </div>

            {/* Action buttons — stack on mobile */}
            <div className="flex flex-wrap gap-2">
              <button className="btn-xlsx" onClick={handleGlobalXlsx} disabled={!reports || xlLoad} style={{ flex:"1 1 auto", minWidth:0 }}>
                {xlLoad ? <span className="w-3 h-3 border-2 border-green-400/40 border-t-green-600 rounded-full spin"/> : <FileSpreadsheet size={13}/>}
                <span className="truncate">Export complet XLSX</span>
              </button>
              <button className="btn-pdf" onClick={handleGlobalPdf} disabled={!reports || pdfLoad} style={{ flex:"1 1 auto", minWidth:0 }}>
                {pdfLoad ? <span className="w-3 h-3 border-2 border-red-300/40 border-t-red-600 rounded-full spin"/> : <FileDown size={13}/>}
                <span className="truncate">Export complet PDF</span>
              </button>
              <button className="btn-ghost" onClick={fetchReports} disabled={loading} style={{ flex:"0 0 auto" }}>
                <RefreshCw size={13} className={loading ? "spin" : ""}/>
                <span className="hidden sm:inline">Actualiser</span>
              </button>
            </div>
          </motion.header>

          {/* ── DATE FILTER ─────────────────────────────────────── */}
          <SectionLabel icon={Calendar} text="Période"/>
          <motion.div
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:.04, duration:.34 }}
            className="mb-8 rounded-2xl p-4 sm:p-5"
            style={{ background:"var(--surface)", border:"1.5px solid var(--border)" }}
          >
            {/* Date inputs row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-[12px] font-bold tracking-[.1em] uppercase mb-1.5" style={{ color:"#0b0c0ec0" }}>Début</p>
                <input type="date" className="fi" value={dateRange.start}
                  onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}/>
              </div>
              <div>
                <p className="text-[12px] font-bold tracking-[.1em] uppercase mb-1.5" style={{ color:"#0b0c0ec0" }}>Fin</p>
                <input type="date" className="fi" value={dateRange.end}
                  onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}/>
              </div>
            </div>
            {/* Submit row */}
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-primary" onClick={fetchReports} disabled={loading} style={{ flex:"1 1 auto", maxWidth:220 }}>
                {loading
                  ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full spin"/>
                  : <Search size={13}/>
                }
                Générer le rapport
              </button>
              {dateRange.start && dateRange.end && (
                <p className="text-[13px]" style={{ color:"#0b0c0ec0" }}>
                  {fmtDate(dateRange.start)} → {fmtDate(dateRange.end)}
                </p>
              )}
            </div>
          </motion.div>

          {/* ── LOADING SKELETONS ───────────────────────────────── */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
              {[...Array(6)].map((_, i) => <div key={i} className="sk h-24 sm:h-28 rounded-2xl"/>)}
            </div>
          )}

          {!loading && reports && (
            <>
              {/* ── KPIs ──────────────────────────────────────── */}
              <SectionLabel icon={BarChart2} text="Tableau de bord"/>
              <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                {kpiCfgs.map((k, i) => <KpiCard key={i} cfg={k} idx={i}/>)}
              </div>

              {/* ── SEVERITY BAR ──────────────────────────────── */}
              <motion.div
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                transition={{ delay:.1, duration:.36 }}
                className="mb-8 rounded-2xl p-4 sm:p-5"
                style={{ background:"var(--surface)", border:"1.5px solid var(--border)" }}
              >
                <p className="text-[12px] font-bold tracking-[.12em] uppercase mb-4" style={{ color:"#0b0c0ec0" }}>
                  Distribution des alertes par sévérité
                </p>
                <div className="space-y-3">
                  {(["CRITICAL","WARNING","INFO"] as const).map((sev, i) => {
                    const count  = reports.alerts.filter(a => a.severity === sev).length;
                    const total  = reports.alerts.length || 1;
                    const pct    = (count / total) * 100;
                    const colors: Record<string, string> = { CRITICAL:"#DC2626", WARNING:"#D97706", INFO:"#2563EB" };
                    const labels: Record<string, string> = { CRITICAL:"Critique",      WARNING:"Avertissement", INFO:"Info" };
                    return (
                      <div key={sev} className="flex items-center gap-2 sm:gap-3">
                        <span className="text-sm w-20 sm:w-28 shrink-0 truncate" style={{ color:"var(--text-2)" }}>{labels[sev]}</span>
                        <AnimBar pct={pct} color={colors[sev]} delay={i * 0.1}/>
                        <div className="flex gap-1 items-center shrink-0 w-12 sm:w-16 justify-end">
                          <span className="text-sm font-light" style={{ color:"var(--text)" }}>{count}</span>
                          <span className="text-[12px] hidden sm:inline" style={{ color:"#0b0c0ec0" }}>{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* ── TABS ──────────────────────────────────────── */}
              <SectionLabel icon={Database} text="Données détaillées"/>

              {/* Mobile: native select dropdown */}
              <div className="block sm:hidden mb-4">
                <div className="relative">
                  <select
                    className="tab-select"
                    value={tab}
                    onChange={e => setTab(e.target.value as TabKey)}
                  >
                    {TABS.map(t => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Desktop: pill tabs */}
              <motion.div
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                transition={{ delay:.12, duration:.34 }}
                className="hidden sm:block mb-4 overflow-x-auto pb-1"
              >
                <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background:"var(--surface-2)", border:"1.5px solid var(--border)" }}>
                  {TABS.map(t => (
                    <button key={t.key}
                      className={`tab-pill ${tab === t.key ? "active" : ""}`}
                      onClick={() => setTab(t.key)}>
                      <t.Icon size={12}/>
                      {t.label}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Tab toolbar */}
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="text-sm" style={{ color:"#0b0c0ec0" }}>{tabCount[tab]}</p>
                <ExportPair onXlsx={exportTabXlsx} onPdf={exportTabPdf} lx={txl} lp={tpdf}/>
              </div>

              {/* ── TAB PANEL ─────────────────────────────────── */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                  transition={{ duration:.28, ease:[.25,.46,.45,.94] }}
                  className="rounded-2xl overflow-hidden"
                  style={{ background:"var(--surface)", border:"1.5px solid var(--border)" }}
                >

                  {/* CONSUMPTION */}
                  {tab === "consumption" && (
                    <>
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="tbl">
                          <thead><tr><th>Date</th><th style={{ textAlign:"right" }}>Consommation</th></tr></thead>
                          <tbody>
                            {reports.daily_consumption.map((d, i) => (
                              <motion.tr key={d.date} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*.03 }}>
                                <td className="font-medium">{fmtDate(d.date)}</td>
                                <td style={{ textAlign:"right", fontWeight:600, color:"var(--accent)" }}>{fmt(d.total_consumed)}</td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="sm:hidden p-3 space-y-2">
                        {reports.daily_consumption.map((d, i) => (
                          <motion.div key={d.date} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.03 }}>
                            <MobileCard>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-sm truncate">{fmtDate(d.date)}</span>
                                <span className="tag tag-blue shrink-0">{fmt(d.total_consumed)} unités</span>
                              </div>
                            </MobileCard>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* TOP PRODUCTS */}
                  {tab === "products" && (
                    <>
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="tbl">
                          <thead><tr><th>#</th><th>Produit</th><th>Catégorie</th><th style={{ textAlign:"right" }}>Total</th><th style={{ textAlign:"right" }}>Moyenne</th></tr></thead>
                          <tbody>
                            {reports.top_products.map((p, i) => (
                              <motion.tr key={p.product_id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*.04 }}>
                                <td className="w-8 text-center" style={{ color:"#0b0c0ec0" }}>{i+1}</td>
                                <td className="font-semibold">{p.name}</td>
                                <td><span className="tag tag-stone">{p.category_name}</span></td>
                                <td style={{ textAlign:"right", fontWeight:600, color:"var(--accent)" }}>{fmt(p.total_consumed)}</td>
                                <td style={{ textAlign:"right", color:"var(--text-2)" }}>{p.avg_consumption.toFixed(2)}</td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="sm:hidden p-3 space-y-2">
                        {reports.top_products.map((p, i) => (
                          <motion.div key={p.product_id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.04 }}>
                            <MobileCard bc="#C7D2FE">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm truncate">{p.name}</p>
                                  <span className="tag tag-stone mt-1 inline-flex">{p.category_name}</span>
                                </div>
                                <span className="text-xl font-light shrink-0" style={{ color:"var(--accent)" }}>#{i+1}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-sm" style={{ color:"var(--text-2)" }}>
                                <div>Total : <strong>{fmt(p.total_consumed)}</strong></div>
                                <div>Moy. : <strong>{p.avg_consumption.toFixed(2)}</strong></div>
                              </div>
                            </MobileCard>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* MOVEMENTS */}
                  {tab === "movements" && (
                    <>
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="tbl">
                          <thead><tr><th>Produit</th><th style={{ textAlign:"center" }}>Qté</th><th style={{ textAlign:"center" }}>Type</th><th>Date</th><th>Utilisateur</th></tr></thead>
                          <tbody>
                            {reports.movements.map((m, i) => (
                              <motion.tr key={m.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*.025 }}>
                                <td className="font-medium">{m.product_name}</td>
                                <td style={{ textAlign:"center", fontWeight:600 }}>{m.quantity}</td>
                                <td style={{ textAlign:"center" }}>
                                  <span className={`tag ${m.type === "ENTREE" ? "tag-green" : "tag-red"}`}>{m.type}</span>
                                </td>
                                <td style={{ color:"var(--text-2)" }}>{fmtDate(m.created_at)}</td>
                                <td style={{ color:"var(--text-2)" }}>{m.user_name}</td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="sm:hidden p-3 space-y-2">
                        {reports.movements.map((m, i) => (
                          <motion.div key={m.id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.025 }}>
                            <MobileCard bc={m.type === "ENTREE" ? "#A7F3D0" : "#FCA5A5"}>
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <p className="font-semibold text-sm truncate">{m.product_name}</p>
                                <span className={`tag shrink-0 ${m.type === "ENTREE" ? "tag-green" : "tag-red"}`}>{m.type}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm" style={{ color:"var(--text-2)" }}>
                                <span>Qté : <strong>{m.quantity}</strong></span>
                                <span>{fmtDate(m.created_at)}</span>
                                <span>{m.user_name}</span>
                              </div>
                            </MobileCard>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* ALERTS */}
                  {tab === "alerts" && (
                    <>
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="tbl">
                          <thead><tr><th>Type</th><th>Sévérité</th><th>Message</th><th style={{ textAlign:"center" }}>Résolue</th><th>Date</th></tr></thead>
                          <tbody>
                            {reports.alerts.map((a, i) => (
                              <motion.tr key={a.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*.02 }}>
                                <td><span className="tag tag-stone">{a.type}</span></td>
                                <td>
                                  <span className={`tag ${a.severity === "CRITICAL" ? "tag-red" : a.severity === "WARNING" ? "tag-amber" : "tag-blue"}`}>
                                    {a.severity}
                                  </span>
                                </td>
                                <td style={{ color:"var(--text-2)", maxWidth:260, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.message}</td>
                                <td style={{ textAlign:"center" }}>
                                  {a.is_resolved
                                    ? <CheckCircle2 size={15} style={{ color:"#059669", margin:"0 auto" }}/>
                                    : <X size={15} style={{ color:"#0b0c0ec0", margin:"0 auto" }}/>}
                                </td>
                                <td style={{ color:"var(--text-2)" }}>{fmtDate(a.created_at)}</td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="sm:hidden p-3 space-y-2">
                        {reports.alerts.map((a, i) => (
                          <motion.div key={a.id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.02 }}>
                            <MobileCard bc={a.severity === "CRITICAL" ? "#FCA5A5" : a.severity === "WARNING" ? "#FDE68A" : "#BFDBFE"}>
                              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                <span className="tag tag-stone">{a.type}</span>
                                <span className={`tag ${a.severity === "CRITICAL" ? "tag-red" : a.severity === "WARNING" ? "tag-amber" : "tag-blue"}`}>{a.severity}</span>
                                {a.is_resolved && <span className="tag tag-green">Résolue</span>}
                              </div>
                              <p className="text-sm leading-relaxed mb-1" style={{ color:"var(--text-2)" }}>{a.message}</p>
                              <p className="text-[13px]" style={{ color:"#0b0c0ec0" }}>{fmtDate(a.created_at)}</p>
                            </MobileCard>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* LOSSES */}
                  {tab === "losses" && (
                    <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      {([
                        { label:"Valeur totale des pertes", value:`${fmt(reports.losses.total_loss_value)} FCFA`, color:"#DC2626", bg:"#FEF2F2", bc:"#FCA5A5" },
                        { label:"Produits expirés",         value:`${reports.losses.expired_count} unités`,       color:"#D97706", bg:"#FFFBEB", bc:"#FDE68A" },
                        { label:"% perte / stock",          value:`${reports.losses.loss_percentage.toFixed(2)}%`,color:"#7C3AED", bg:"#F5F3FF", bc:"#DDD6FE" },
                      ] as const).map((row, i) => (
                        <motion.div key={row.label} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.08 }}
                          className="rounded-xl p-4 sm:p-5" style={{ background:row.bg, border:`1.5px solid ${row.bc}` }}>
                          <p className="text-sm font-semibold mb-3" style={{ color:"var(--text-2)" }}>{row.label}</p>
                          <p className="text-2xl sm:text-3xl font-light" style={{ color:row.color }}>{row.value}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* USERS */}
                  {tab === "users" && (
                    <>
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="tbl">
                          <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Depuis</th></tr></thead>
                          <tbody>
                            {reports.users.map((u, i) => (
                              <motion.tr key={u.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*.04 }}>
                                <td className="font-medium">{u.name}</td>
                                <td style={{ color:"var(--text-2)" }}>{u.email}</td>
                                <td><span className="tag tag-blue">{u.role}</span></td>
                                <td style={{ color:"#0b0c0ec0" }}>{fmtDate(u.created_at)}</td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="sm:hidden p-3 space-y-2">
                        {reports.users.map((u, i) => (
                          <motion.div key={u.id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.04 }}>
                            <MobileCard bc="#C7D2FE">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="font-semibold text-sm truncate">{u.name}</p>
                                <span className="tag tag-blue shrink-0">{u.role}</span>
                              </div>
                              <p className="text-sm truncate" style={{ color:"var(--text-2)" }}>{u.email}</p>
                              <p className="text-[13px] mt-1" style={{ color:"#0b0c0ec0" }}>Depuis {fmtDate(u.created_at)}</p>
                            </MobileCard>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* LOGS */}
                  {tab === "logs" && (
                    <>
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="tbl">
                          <thead><tr><th>User ID</th><th>Action</th><th>Entité</th><th>Date</th></tr></thead>
                          <tbody>
                            {reports.activity_logs.map((l, i) => (
                              <motion.tr key={l.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*.015 }}>
                                <td className="font-mono text-sm" style={{ color:"#0b0c0ec0" }}>#{l.user_id}</td>
                                <td className="font-medium">{l.action}</td>
                                <td><span className="tag tag-stone">{l.entity_type}</span></td>
                                <td style={{ color:"var(--text-2)" }}>{fmtDate(l.created_at)}</td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="sm:hidden p-3 space-y-2">
                        {reports.activity_logs.map((l, i) => (
                          <motion.div key={l.id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.015 }}>
                            <MobileCard>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="font-semibold text-sm truncate">{l.action}</p>
                                <span className="tag tag-stone shrink-0">{l.entity_type}</span>
                              </div>
                              <p className="text-[13px]" style={{ color:"#0b0c0ec0" }}>
                                User #{l.user_id}  ·  {fmtDate(l.created_at)}
                              </p>
                            </MobileCard>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                </motion.div>
              </AnimatePresence>
            </>
          )}

          {/* ── EMPTY STATE ─────────────────────────────────────── */}
          {!loading && !reports && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              className="flex flex-col items-center justify-center py-16 sm:py-20 rounded-2xl text-center px-4"
              style={{ border:"1.5px solid var(--border)", background:"var(--surface)" }}>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4" style={{ background:"var(--surface-2)" }}>
                <BarChart2 size={22} style={{ color:"#0b0c0ec0" }}/>
              </div>
              <p className="text-lg mb-1" style={{ color:"var(--text-2)" }}>Aucune donnée</p>
              <p className="text-sm mb-5" style={{ color:"#0b0c0ec0" }}>Sélectionnez une période et cliquez sur "Générer"</p>
              <button className="btn-primary" onClick={fetchReports}>
                <RefreshCw size={13}/> Générer
              </button>
            </motion.div>
          )}

        </div>
      </main>
    </SidebarLayout>
  );
}