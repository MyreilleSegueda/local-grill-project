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
  ShieldCheck, Layers, Search, X, Calendar, CalendarClock, Database,
  LucideIcon, ChevronDown,
} from "lucide-react";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { JSX } from "react";

/* ═══════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════ */

type NotifType = "success" | "error" | "warning";
interface Notif { type: NotifType; message: string; }

interface DailyConsumption { date: string; total_consumed: number; }
interface ConsumptionDetail { date: string; product_name: string | null; sku?: string | null; quantity: number; unit: string | null; unit_cost?: number | null; value?: number | null; }
interface TopProduct       { product_id: number; name: string; category_name: string | null; unit?: string | null; total_consumed: number; avg_consumption: number; }
interface Losses           { total_loss_value: number; total_losses?: number; expired_count: number; loss_percentage: number; }
interface InventoryHealth  { accuracy_percentage: number; total_items: number; discrepancies: number; }
interface Movement         { id: number; product_id?: number; product_name: string; category_name?: string | null; sku?: string | null; quantity: number; unit?: string | null; unit_cost?: number | null; movement_value?: number | null; type: string; reason?: string | null; reference_number?: string | null; destination?: "CUISINE" | null; created_at: string; user_name: string; }
interface AppUser          { id: number; name: string; email: string; role: string; created_at: string; }
interface Role             { id: number; name: string; description: string; }
interface Permission       { id: number; name: string; description: string; }
interface Category         { id: number; name: string; }
interface Supplier         { id: number; name: string; email: string; phone: string; }
interface Unit             { id: number; name: string; symbol: string; }
interface AlertItem        { id: number; type: string; severity: string; message: string; is_resolved: boolean; created_at: string; }
interface ActivityLog      { id: number; user_id: number; user_name?: string | null; action: string; entity_type: string | null; entity_id?: number | null; created_at: string; }
interface KPIs             { totalStockValue: number; totalProducts: number; criticalAlerts: number; totalMovements: number; }

interface ReportData {
  kpis:              KPIs;
  stock_by_category?: Array<{ name: string; value: number }>;
  inventory_variances?: Array<{ product_name: string; category_name: string | null; theoretical_quantity: number; real_quantity: number; difference: number; unit: string | null; counted_at: string }>;
  inventory_counted_products?: number;
  daily_consumption: DailyConsumption[];
  consumption_details?: ConsumptionDetail[];
  loss_movements?: Array<{ product_name: string; quantity: number; unit: string | null; cause: string | null; type: string; value: number | null; created_at: string }>;
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
type MovementView = "all" | "entries" | "exits";

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
  detail?: string;
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
    --surface-2:     #ba1065;
    --border:        #E5E2DB;
    --border-strong: #a2752b;
    --text:          #0F1117;
    --text-2:        #5C5A52;
    --text-3:        #9C9A92;
    --accent:        #059669;
    --accent-light:  #ECFDF5;
    --accent-dark:   #065F46;
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
    border:1px solid #93B4E8;
    padding:10px 14px; font-size:14px; color:var(--text);
    transition:border-color .2s, box-shadow .2s; outline:none; -webkit-appearance:none;
  }
  .fi::placeholder { color:var(--text-3); }
  .fi:hover  { border-color:var(--border-strong); }
  .fi:focus  { border-color:var(--accent); box-shadow:0 0 0 3px rgba(5,150,105,.12); }
  .report-hero {
    display:flex; align-items:center; justify-content:space-between; gap:24px;
    padding:22px 24px; border:1px solid #eae4d8; border-radius:22px;
    background:linear-gradient(115deg, #e7240b 0%, #ee0f0f 58%, #e71b18 100%);
    box-shadow:0 10px 30px rgba(5,150,105,.07);
  }
  .report-hero-actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; flex-wrap:wrap; }
  .report-hero-mark { display:flex; height:48px; width:48px; flex:none; align-items:center; justify-content:center; border-radius:16px; color:var(--accent); background:var(--accent-light); box-shadow:inset 0 0 0 1px rgba(5,150,105,.1); }
  .report-date-card { box-shadow:0 8px 24px rgba(15,17,23,.035); }
  @media (max-width: 767px) {
    .report-hero { align-items:stretch; flex-direction:column; gap:18px; padding:18px; }
    .report-hero-actions { justify-content:flex-start; }
    .report-hero-actions > button { flex:1 1 auto !important; }
  }

  /* ── buttons ─────────────────────────────────────────────────── */
  .btn-primary {
    display:inline-flex; align-items:center; justify-content:center; gap:7px;
    padding:10px 18px; border-radius:10px;
    background:var(--accent); color:#fff;
    font-size:13.5px; font-weight:600; border:none; cursor:pointer;
    transition:background .18s, box-shadow .18s, transform .12s;
    box-shadow:0 2px 8px rgba(5,150,105,.24); white-space:nowrap;
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
    color:var(--accent-dark); background:#ECFDF5;
    border-bottom:1.5px solid var(--border); white-space:nowrap;
  }
  .tbl tbody td {
    padding:11px 14px; color:var(--text-2);
    border-bottom:1px solid var(--border); vertical-align:middle;
  }
  .tbl tbody tr:hover { background:#F7F6FF; }
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
  .tab-pill:hover { color:var(--accent-dark); background:#E6F5EF; }
  .tab-pill.active { background:var(--accent); color:#fff; border-color:var(--accent); box-shadow:0 3px 10px rgba(5,150,105,.2); }

  /* mobile tab select */
  .tab-select {
    width:100%; background:var(--surface);
    border:1.5px solid var(--border); border-radius:10px;
    padding:10px 36px 10px 14px; font-size:13.5px; color:var(--text);
    outline:none; cursor:pointer; -webkit-appearance:none; appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239C9A92' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 12px center;
  }
  .tab-select:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(5,150,105,.12); }

  /* ── misc ────────────────────────────────────────────────────── */
  .kpi-stripe { position:absolute; top:0; left:0; right:0; height:2px; border-radius:99px 99px 0 0; }
  .report-panel { box-shadow:0 8px 24px rgba(15,17,23,.045); transition:box-shadow .2s ease, border-color .2s ease, transform .2s ease; }
  .report-panel:hover { box-shadow:0 14px 34px rgba(15,17,23,.075); border-color:var(--border-strong) !important; transform:translateY(-1px); }
  .report-panel-heading { display:flex; align-items:center; gap:9px; padding-bottom:12px; margin-bottom:15px; border-bottom:1px solid var(--border); }
  .report-panel-icon { display:flex; width:30px; height:30px; align-items:center; justify-content:center; flex:none; border-radius:10px; background:var(--accent-light); color:var(--accent); }
  .section-label { gap:10px !important; margin-bottom:14px !important; }
  .section-label > span { letter-spacing:.16em !important; color:var(--text-2) !important; }

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
  @media print {
    @page { size: landscape; margin: 12mm; }
    body { background:#fff !important; }
    .report-no-print, aside, nav { display:none !important; }
    main { min-height:0 !important; padding:0 !important; background:#fff !important; }
    main > div { max-width:none !important; }
    .tbl { font-size:9px; }
    .tbl thead th, .tbl tbody td { padding:6px 8px; }
    .print-break { break-before:page; }
    .report-panel { break-inside:avoid; }
    * { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
  }
`;

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════ */

const fmt = (n: number, dec = 0): string =>
  n?.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec }) ?? "0";

const fmtDate = (d: string): string =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const movementLabel = (type: string) => ({ IN:"Entrée de stock", OUT:"Sortie de stock", LOSS:"Perte", EXPIRED:"Produit périmé", ADJUSTMENT:"Ajustement de stock" }[type] ?? type);
const movementClass = (type: string) => type === "IN" ? "tag-green" : type === "OUT" ? "tag-blue" : type === "ADJUSTMENT" ? "tag-stone" : "tag-red";
const severityLabel = (severity: string) => ({ CRITICAL:"Critique", WARNING:"Avertissement", INFO:"Information" }[severity] ?? severity);
const alertTypeLabel = (type: string) => ({ LOW_STOCK:"Stock faible", EXPIRED:"Produit périmé", EXPIRING_SOON:"Péremption proche", RUPTURE:"Rupture de stock", EXCESS:"Stock excédentaire" }[type] ?? type);
const actionLabel = (action: string) => ({
  STOCK_ADJUSTMENT:"Ajustement du stock", STOCK_IN:"Entrée de stock", STOCK_OUT:"Sortie de stock",
  CREATE_STOCK_ENTRY:"Création d’une entrée de stock", UPDATE_STOCK_ENTRY:"Modification d’une entrée de stock", DELETE_STOCK_ENTRY:"Suppression d’une entrée de stock",
  CREATE_STOCK_EXIT:"Création d’une sortie de stock", UPDATE_STOCK_EXIT:"Modification d’une sortie de stock", DELETE_STOCK_EXIT:"Suppression d’une sortie de stock",
  CREATE_PRODUCT:"Création d’un produit", UPDATE_PRODUCT:"Modification d’un produit", DELETE_PRODUCT:"Suppression d’un produit",
  INVENTORY_COUNT:"Comptage d’inventaire", PROFILE_UPDATE:"Modification du profil", UPDATE_SETTING:"Modification des paramètres",
  LOGIN:"Connexion", LOGOUT:"Déconnexion",
}[action] ?? action.replaceAll("_", " ").toLowerCase());
const roleLabel = (role: string) => ({ ADMIN:"Administrateur", ADMINISTRATOR:"Administrateur", GERANT:"Gerant", MANAGER:"Responsable", STOCK_MANAGER:"Responsable stock", USER:"Utilisateur", UTILISATEUR:"Utilisateur", COOK:"Cuisinier", CASHIER:"Caissier" }[role.toUpperCase()] ?? role);

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
    <div className="section-label flex items-center gap-2.5 mb-5">
      <Icon size={11} style={{ color:"#0b0c0ec0", flexShrink:0 }}/>
      <span className="text-[12px] font-bold tracking-[0.22em] uppercase whitespace-nowrap" style={{ color:"#0b0c0ec0" }}>{text}</span>
      <div className="flex-1 h-px" style={{ background:"var(--border)" }}/>
    </div>
  );
}

function PanelHeading({ Icon, title, description }: { Icon: LucideIcon; title: string; description?: string }): JSX.Element {
  return (
    <div className="report-panel-heading">
      <div className="report-panel-icon"><Icon size={15}/></div>
      <div className="min-w-0">
        <h2 className="text-sm sm:text-[15px] font-semibold leading-tight" style={{ color:"var(--text)" }}>{title}</h2>
        {description && <p className="mt-1 text-[11px] sm:text-xs" style={{ color:"var(--text-3)" }}>{description}</p>}
      </div>
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
        style={{
  background: cfg.iconBg,
  borderColor: hov ? cfg.accent : "var(--border)"
}}
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
        {cfg.detail && <p className="mt-1 text-[11px] leading-relaxed" style={{ color:"var(--text-3)" }}>{cfg.detail}</p>}
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
  const [movementView, setMovementView] = useState<MovementView>("all");
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

  const movementEntries = reports?.movements.filter(m => m.type === "IN") ?? [];
  const movementExits = reports?.movements.filter(m => m.type === "OUT") ?? [];
  const movementValue = (rows: Movement[]) => rows.reduce((sum, movement) => sum + (movement.movement_value ?? 0), 0);
  const movementValueLabel = (rows: Movement[]) => !rows.length ? "Aucun mouvement sur la période" : rows.some(m => m.movement_value != null) ? `${fmt(movementValue(rows))} FCFA valorisés` : "Valeur indisponible";
  const movementQuantityLabel = (rows: Movement[]) => {
    if (!rows.length) return "Aucune quantité sur la période";
    const byUnit = new Map<string, number>();
    for (const movement of rows) {
      const unit = movement.unit || "unité";
      byUnit.set(unit, (byUnit.get(unit) ?? 0) + movement.quantity);
    }
    return `Quantités : ${[...byUnit.entries()].map(([unit, quantity]) => `${fmt(quantity, 2)} ${unit}`).join(" · ")}`;
  };
  const stockCategoryData = reports?.stock_by_category ?? [];
  const categoryColors = ["#059669", "#0F766E", "#D97706", "#EA580C", "#0284C7", "#7C3AED", "#DC2626", "#65A30D"];
  const categoryTrend = (() => {
    const rows = new Map<string, Record<string, string | number>>();
    for (const movement of reports?.movements ?? []) {
      if (!movement.movement_value || !["IN", "OUT", "LOSS", "EXPIRED"].includes(movement.type)) continue;
      const date = movement.created_at.slice(0, 10);
      const category = movement.category_name || "Sans catégorie";
      const row = rows.get(date) ?? { date };
      const sign = movement.type === "IN" ? 1 : -1;
      row[category] = Number(row[category] ?? 0) + sign * movement.movement_value;
      rows.set(date, row);
    }
    const daily = [...rows.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const categories = [...new Set(daily.flatMap(row => Object.keys(row).filter(key => key !== "date")))];
    const balances: Record<string, number> = {};
    return daily.map(row => {
      for (const category of categories) balances[category] = (balances[category] ?? 0) + Number(row[category] ?? 0);
      return { date: row.date, ...balances };
    });
  })();
  const trendCategories = [...new Set((reports?.movements ?? [])
    .filter(m => m.movement_value != null && ["IN", "OUT", "LOSS", "EXPIRED"].includes(m.type))
    .map(m => m.category_name || "Sans catégorie"))];
  const observationAlerts = [...(reports?.alerts ?? [])]
    .filter(alert => !alert.is_resolved)
    .sort((a, b) => ({ CRITICAL:0, WARNING:1, INFO:2 }[a.severity] ?? 3) - ({ CRITICAL:0, WARNING:1, INFO:2 }[b.severity] ?? 3)
      || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  /* per-tab XLSX */
  const exportTabXlsx = async () => {
    if (!reports) return; setTxl(true);
    try {
      const XLSX = await import("xlsx");
      const wb   = XLSX.utils.book_new();
      const now  = new Date().toLocaleDateString("fr-FR").replace(/\//g,"-");
      type SR = Record<string, string | number | boolean>;
      const add = (rows: SR[], name: string) => {
        if (!rows.length) rows = [{ "Information": "Aucune donnée disponible pour cette période." }];
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length+4, 16) }));
        XLSX.utils.book_append_sheet(wb, ws, name);
      };
      if (tab === "consumption") add((reports.consumption_details?.length ? reports.consumption_details.map(d => ({ "Date":fmtDate(d.date), "Produit":d.product_name ?? "", "Référence":d.sku ?? "—", "Quantité consommée":d.quantity, "Unité":d.unit ?? "—", "Coût d'achat unitaire (FCFA)":d.unit_cost == null ? "—" : d.unit_cost, "Coût d'achat consommé (FCFA)":d.value == null ? "—" : d.value })) : reports.daily_consumption.map(d => ({ "Date":fmtDate(d.date), "Consommation totale (quantité)":d.total_consumed }))), "Consommation");
      if (tab === "products")    add(reports.top_products.map((p, i) => ({ "Rang":i+1, "Produit":p.name || "", "Catégorie":p.category_name ?? "", "Quantité totale consommée":p.total_consumed, "Unité":p.unit ?? "", "Consommation moyenne par relevé":+p.avg_consumption.toFixed(2), "Unité moyenne":p.unit ?? "" })), "Top Produits");
      if (tab === "movements")   add(reports.movements.map(m => ({ "Produit":m.product_name || "", "Référence produit":m.sku ?? "—", "Quantité":m.quantity, "Unité":m.unit ?? "—", "Coût d'achat unitaire (FCFA)":m.unit_cost == null ? "—" : m.unit_cost, "Valeur au coût d'achat (FCFA)":m.movement_value == null ? "—" : m.movement_value, "Type de mouvement":m.destination === "CUISINE" ? "Sortie vers la cuisine" : movementLabel(m.type), "Référence mouvement":m.reference_number ?? "—", "Date":fmtDate(m.created_at), "Utilisateur":m.user_name || "", "Motif":m.reason || "Non renseigné" })), "Mouvements");
      if (tab === "alerts")      add(reports.alerts.map(a => ({ "Type d'alerte":alertTypeLabel(a.type), "Gravité":severityLabel(a.severity), "Description":a.message, "État":a.is_resolved?"Résolue":"Non résolue", "Date":fmtDate(a.created_at) })), "Alertes");
      if (tab === "losses")      add(reports.loss_movements?.length ? reports.loss_movements.map(l => ({ "Produit":l.product_name, "Quantité perdue":l.quantity, "Unité":l.unit ?? "", "Cause":l.cause ?? "", "Valeur (FCFA)":l.value ?? "", "Type":movementLabel(l.type), "Date":fmtDate(l.created_at) })) : [{ "Valeur totale des pertes (FCFA)":reports.losses.total_loss_value, "Nombre de mouvements de perte":reports.losses.total_losses ?? 0, "Nombre de mouvements de produits expirés":reports.losses.expired_count, "Pertes / valeur du stock (%)":reports.losses.loss_percentage }], "Pertes");
      if (tab === "users")       add(reports.users.map(u => ({ "Nom":u.name, "Email":u.email, "Rôle":roleLabel(u.role), "Depuis":fmtDate(u.created_at) })), "Utilisateurs");
      if (tab === "logs")        add(reports.activity_logs.map(l => ({ "Utilisateur":l.user_name || `Utilisateur #${l.user_id}`, "Action":actionLabel(l.action), "Élément":l.entity_type ? `${l.entity_type}${l.entity_id ? ` #${l.entity_id}` : ""}` : "", "Date":fmtDate(l.created_at) })), "Logs");
      add([{ "Date de début":fmtDate(dateRange.start), "Date de fin":fmtDate(dateRange.end) }], "Période");
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
        head = reports.consumption_details?.length ? [["Date","Produit","Référence","Quantité consommée","Unité","Coût d'achat unitaire (FCFA)","Coût d'achat consommé (FCFA)"]] : [["Date","Consommation totale (quantité)"]];
        body = reports.consumption_details?.length ? reports.consumption_details.map(d => [fmtDate(d.date), d.product_name ?? "—", d.sku || "—", fmt(d.quantity), d.unit || "—", d.unit_cost == null ? "—" : fmt(d.unit_cost, 2), d.value == null ? "—" : fmt(d.value, 2)]) : reports.daily_consumption.map(d => [fmtDate(d.date), fmt(d.total_consumed)]);
      } else if (tab === "products") {
        head = [["Rang","Produit","Catégorie","Quantité totale consommée","Moyenne par relevé"]];
        body = reports.top_products.map((p, i) => [i+1, p.name || "", p.category_name ?? "", `${fmt(p.total_consumed)}${p.unit ? ` ${p.unit}` : ""}`, `${p.avg_consumption.toFixed(2)}${p.unit ? ` ${p.unit}` : ""}`]);
      } else if (tab === "movements") {
        head = [["Produit","Référence produit","Quantité","Unité","Coût d'achat unitaire (FCFA)","Valeur au coût d'achat (FCFA)","Type / destination","Référence mouvement","Date","Utilisateur","Motif"]];
        body = reports.movements.map(m => [m.product_name || "", m.sku || "—", fmt(m.quantity, 2), m.unit || "—", m.unit_cost == null ? "—" : fmt(m.unit_cost, 2), m.movement_value == null ? "—" : fmt(m.movement_value, 2), m.destination === "CUISINE" ? "Sortie vers la cuisine" : movementLabel(m.type), m.reference_number || "—", fmtDate(m.created_at), m.user_name || "", m.reason || "Non renseigné"]);
      } else if (tab === "alerts") {
        head = [["Type d'alerte","Gravité","Description","État","Date"]];
        body = reports.alerts.map(a => [alertTypeLabel(a.type), severityLabel(a.severity), a.message, a.is_resolved?"Résolue":"Non résolue", fmtDate(a.created_at)]);
      } else if (tab === "losses") {
        head = reports.loss_movements?.length ? [["Produit","Quantité perdue","Unité","Cause","Valeur (FCFA)","Type","Date"]] : [["Valeur totale des pertes (FCFA)","Mouvements de perte","Quantité expirée","Pertes / valeur du stock (%)"]];
        body = reports.loss_movements?.length ? reports.loss_movements.map(l => [l.product_name, fmt(l.quantity), l.unit ?? "", l.cause ?? "", l.value === null ? "—" : fmt(l.value), movementLabel(l.type), fmtDate(l.created_at)]) : [[fmt(reports.losses.total_loss_value), reports.losses.total_losses ?? 0, reports.losses.expired_count, `${reports.losses.loss_percentage.toFixed(2)}%`]];
      } else if (tab === "users") {
        head = [["Nom","E-mail","Rôle","Création du compte"]];
        body = reports.users.map(u => [u.name, u.email, roleLabel(u.role), fmtDate(u.created_at)]);
      } else {
        head = [["Utilisateur (ID)","Action","Élément concerné","Date"]];
        body = reports.activity_logs.map(l => [l.user_name || `Utilisateur #${l.user_id}`, actionLabel(l.action), l.entity_type ? `${l.entity_type}${l.entity_id ? ` #${l.entity_id}` : ""}` : "", fmtDate(l.created_at)]);
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
    { title:"Total des entrées", value:movementEntries.length, suffix:" mvt",                    Icon:TrendingUp,    accent:"#059669", iconBg:"#DCFCE7", iconCol:"#059669", valCol:"#065F46", sub:movementQuantityLabel(movementEntries), detail:movementValueLabel(movementEntries) },
    { title:"Total des sorties", value:movementExits.length, suffix:" mvt",                     Icon:TrendingDown,  accent:"#DC2626", iconBg:"#FFE4E6", iconCol:"#DC2626", valCol:"#991B1B", sub:movementQuantityLabel(movementExits), detail:movementValueLabel(movementExits) },
    { title:"Valeur du stock",   value:reports.kpis.totalStockValue,                suffix:" FCFA",  Icon:Database,      accent:"#059669", iconBg:"#DBEAFE", iconCol:"#059669", valCol:"#065F46", sub:"stock actuel"  },
    { title:"Produits actifs",   value:reports.kpis.totalProducts,                                   Icon:Package,       accent:"#059669", iconBg:"#EDE9FE", iconCol:"#059669", valCol:"#065F46", sub:"références"     },
    { title:"Alertes critiques", value:reports.kpis.criticalAlerts,                                  Icon:AlertTriangle, accent:"#DC2626", iconBg:"#FFEDD5", iconCol:"#DC2626", valCol:"#7F1D1D", sub:"non résolues"   },
    { title:"Santé inventaire",  value:reports.inventory_health.accuracy_percentage, suffix:"%",     Icon:ShieldCheck,   accent:"#059669", iconBg:"#CCFBF1", iconCol:"#059669", valCol:"#065F46", sub:"précision"      },
    { title:"Pertes totales",    value:reports.losses.total_loss_value,               suffix:" FCFA", Icon:TrendingDown,  accent:"#D97706", iconBg:"#FEF3C7", iconCol:"#D97706", valCol:"#78350F", sub:"gaspillage"     },
    { title:"Mouvements",        value:reports.kpis.totalMovements,                                  Icon:Activity,      accent:"#0F766E", iconBg:"#E2E8F0", iconCol:"#0F766E", valCol:"#115E59", sub:"sur la période" },
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
    consumption: `${reports.daily_consumption.length} jours avec mouvement`,
    products:    `${reports.top_products.length} produits`,
    movements:   `${reports.movements.length} mouvements`,
    alerts:      `${reports.alerts.length} alertes`,
    losses:      "Pertes & gaspillage",
    users:       `${reports.users.length} utilisateurs`,
    logs:        `${reports.activity_logs.length} logs`,
  } : { consumption:"", products:"", movements:"", alerts:"", losses:"", users:"", logs:"" };
  const hasTabData = reports ? ({
    consumption: reports.consumption_details?.length || reports.daily_consumption.length,
    products: reports.top_products.length,
    movements: reports.movements.length,
    alerts: reports.alerts.length,
    losses: reports.loss_movements?.length || reports.losses.total_loss_value || reports.losses.expired_count,
    users: reports.users.length,
    logs: reports.activity_logs.length,
  }[tab] ?? 0) > 0 : false;
  const visibleMovements = movementView === "entries" ? movementEntries : movementView === "exits" ? movementExits : reports?.movements ?? [];
  const movementTotals = (rows: Movement[]) => rows.reduce((acc, m) => ({
    quantity: acc.quantity + m.quantity,
    value: acc.value + (m.movement_value ?? 0),
    valued: acc.valued + (m.movement_value == null ? 0 : 1),
  }), { quantity: 0, value: 0, valued: 0 });
  const entryTotals = movementTotals(movementEntries);
  const exitTotals = movementTotals(movementExits);

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
            className="mb-6"
          >
            <div className="report-hero">
              <div className="flex items-center gap-4 min-w-0">
                <div className="report-hero-mark"><BarChart2 size={23}/></div>
                <div className="min-w-0">
                  <p className="text-[10px] tracking-[.2em] uppercase font-bold mb-1" style={{ color:"var(--accent)" }}>Gestion de stock</p>
                  <h1 className="text-2xl sm:text-3xl font-semibold leading-tight tracking-tight" style={{ color:"var(--text)" }}>Rapports & Exports</h1>
                  <p className="mt-1 text-sm" style={{ color:"var(--text-2)" }}>Vue d’ensemble de vos mouvements et de votre stock</p>
                </div>
              </div>
              <div className="report-hero-actions">
              <button className="btn-xlsx" onClick={handleGlobalXlsx} disabled={!reports || xlLoad}>
                {xlLoad ? <span className="w-3 h-3 border-2 border-green-400/40 border-t-green-600 rounded-full spin"/> : <FileSpreadsheet size={13}/>}
                <span className="truncate">Export complet XLSX</span>
              </button>
              <button className="btn-pdf" onClick={handleGlobalPdf} disabled={!reports || pdfLoad}>
                {pdfLoad ? <span className="w-3 h-3 border-2 border-red-300/40 border-t-red-600 rounded-full spin"/> : <FileDown size={13}/>}
                <span className="truncate">Export complet PDF</span>
              </button>
              <button className="btn-ghost" onClick={fetchReports} disabled={loading}>
                <RefreshCw size={13} className={loading ? "spin" : ""}/>
                <span>Actualiser</span>
              </button>
            </div>
            </div>
          </motion.header>

          {/* ── DATE FILTER ─────────────────────────────────────── */}
          <SectionLabel icon={Calendar} text="Période"/>
          <motion.div
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:.04, duration:.34 }}
            
className="report-date-card mb-8 rounded-2xl p-4 sm:p-5"
style={{
  background: "#EAF2FF",
  border: "1.5px solid #BFDBFE"
}}

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
              <div className="mb-7 grid grid-cols-1 lg:grid-cols-5 gap-4">
                <motion.section initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} className="report-panel lg:col-span-3 rounded-2xl border p-4 sm:p-5" style={{ background:"var(--surface)", borderColor:"var(--border)" }}>
                  <PanelHeading Icon={BarChart2} title="1. Synthèse des mouvements" description="Entrées, sorties et valeur du stock"/>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {kpiCfgs.slice(0, 4).map((k, i) => <KpiCard key={k.title} cfg={k} idx={i}/>)}
                  </div>
                </motion.section>

                <motion.section initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.06 }} className="report-panel lg:col-span-2 rounded-2xl border p-4 sm:p-5" style={{ background:"var(--surface)", borderColor:"var(--border)" }}>
                  <PanelHeading Icon={Package} title="2. État du stock par catégorie" description="Part de chaque catégorie dans la valeur disponible"/>
                  {stockCategoryData.length ? <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2">
                    <div className="h-[220px] w-full" role="img" aria-label="Diagramme en anneau de la valeur du stock par catégorie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stockCategoryData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3} stroke="none">{stockCategoryData.map((row, index) => <Cell key={row.name} fill={categoryColors[index % categoryColors.length]}/>) }</Pie><text x="50%" y="47%" textAnchor="middle" fill="#5C5A52" fontSize="11">Valeur totale</text><text x="50%" y="57%" textAnchor="middle" fill="#0F1117" fontSize="13" fontWeight="700">{fmt(stockCategoryData.reduce((sum, item) => sum + item.value, 0))}</text><text x="50%" y="65%" textAnchor="middle" fill="#5C5A52" fontSize="10">FCFA</text><Tooltip formatter={value => `${fmt(Number(value), 2)} FCFA`} contentStyle={{ borderRadius:12, border:"1px solid #E5E2DB", boxShadow:"0 8px 24px rgba(15,17,23,.1)" }}/></PieChart></ResponsiveContainer></div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">{stockCategoryData.map((row, index) => { const total = stockCategoryData.reduce((sum, item) => sum + item.value, 0); const share = total ? row.value / total * 100 : 0; return <div key={row.name} className="flex items-center justify-between gap-2 text-xs sm:text-sm"><span className="flex items-center gap-2 min-w-0"><span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background:categoryColors[index % categoryColors.length] }}/><span className="truncate" style={{ color:"var(--text-2)" }}>{row.name}</span></span><strong className="shrink-0" style={{ color:"var(--text)" }}>{share.toFixed(1)}%</strong></div>; })}</div>
                  </div> : <div className="h-[220px] flex items-center justify-center text-center text-sm" style={{ color:"var(--text-3)" }}>Aucun lot avec du stock disponible.</div>}
                  <p className="text-[11px] mt-2" style={{ color:"var(--text-3)" }}>Valeur des lots disponibles, au prix d’achat enregistré.</p>
                </motion.section>
              </div>

              <div className="mb-8">
                <SectionLabel icon={Activity} text="Indicateurs complémentaires"/>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {kpiCfgs.slice(4).map((k, i) => <KpiCard key={k.title} cfg={k} idx={i + 4}/>)}
                </div>
              </div>
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

                  {!hasTabData && <p className="p-8 text-center text-sm" style={{color:"var(--text-2)"}}>Aucune donnée disponible pour cette période.</p>}

                  {/* CONSUMPTION */}
                  {tab === "consumption" && (
                    <>
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="tbl">
                          <thead><tr><th>Date</th><th>Produit</th><th>Référence</th><th style={{ textAlign:"right" }}>Quantité consommée</th><th>Unité</th><th style={{ textAlign:"right" }}>Coût d'achat unitaire (FCFA)</th><th style={{ textAlign:"right" }}>Coût d'achat consommé (FCFA)</th></tr></thead>
                          <tbody>
                            {(reports.consumption_details?.length ? reports.consumption_details : reports.daily_consumption).map((d, i) => (
                              <motion.tr key={d.date} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*.03 }}>
                                <td className="font-medium">{fmtDate(d.date)}</td>
                                <td>{"product_name" in d ? d.product_name || "—" : "Total journalier"}</td>
                                <td>{"sku" in d ? d.sku || "—" : "—"}</td>
                                <td style={{ textAlign:"right", fontWeight:600, color:"var(--accent)" }}>{"quantity" in d ? fmt(d.quantity) : fmt(d.total_consumed)}</td>
                                <td>{"unit" in d ? d.unit || "—" : "—"}</td>
                                <td style={{ textAlign:"right" }}>{"unit_cost" in d && d.unit_cost != null ? fmt(d.unit_cost, 2) : "—"}</td>
                                <td style={{ textAlign:"right", fontWeight:600 }}>{"value" in d && d.value != null ? fmt(d.value, 2) : "—"}</td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="sm:hidden p-3 space-y-2">
                        {(reports.consumption_details?.length ? reports.consumption_details : reports.daily_consumption).map((d, i) => (
                          <motion.div key={d.date} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.03 }}>
                            <MobileCard>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-sm truncate">{fmtDate(d.date)}</span>
                                <span className="tag tag-blue shrink-0">{"quantity" in d ? fmt(d.quantity) : fmt(d.total_consumed)}{"unit" in d && d.unit ? ` ${d.unit}` : ""}</span>
                              </div>
                                {"product_name" in d && <p className="mt-1 text-sm">{d.product_name || "—"}{d.sku ? ` · Réf. ${d.sku}` : ""}</p>}
                                {"value" in d && <p className="mt-1 text-[13px]" style={{ color:"var(--text-2)" }}>Coût d'achat : {d.value == null ? "—" : `${fmt(d.value, 2)} FCFA`}</p>}
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
                          <thead><tr><th>Rang</th><th>Produit</th><th>Catégorie</th><th style={{ textAlign:"right" }}>Quantité totale consommée</th><th style={{ textAlign:"right" }}>Moyenne par relevé</th></tr></thead>
                          <tbody>
                            {reports.top_products.map((p, i) => (
                              <motion.tr key={p.product_id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*.04 }}>
                                <td className="w-8 text-center">{i + 1}</td>
                                <td className="font-semibold">{p.name || "—"}</td>
                                <td>{p.category_name ? <span className="tag tag-stone">{p.category_name}</span> : "—"}</td>
                                <td style={{ textAlign:"right", fontWeight:600, color:"var(--accent)" }}>{fmt(p.total_consumed)} {p.unit || ""}</td>
                                <td style={{ textAlign:"right", color:"var(--text-2)" }}>{p.avg_consumption.toFixed(2)} {p.unit || ""}</td>
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
                                <div>Total : <strong>{fmt(p.total_consumed)} {p.unit || ""}</strong></div>
                                <div>Moyenne : <strong>{p.avg_consumption.toFixed(2)} {p.unit || ""}</strong></div>
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
                      <div className="p-4 sm:p-6 border-b" style={{ borderColor:"var(--border)" }}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                          {[
                            { label:"Entrées de stock", rows:movementEntries, totals:entryTotals, color:"#047857", bg:"#ECFDF5", border:"#A7F3D0" },
                            { label:"Sorties de stock", rows:movementExits, totals:exitTotals, color:"#1D4ED8", bg:"#EFF6FF", border:"#BFDBFE" },
                            { label:"Mouvements sur la période", rows:reports.movements, totals:movementTotals(reports.movements), color:"#4338CA", bg:"#EEF2FF", border:"#C7D2FE" },
                          ].map(card => <div key={card.label} className="rounded-xl p-4" style={{ background:card.bg, border:`1px solid ${card.border}` }}>
                            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color:card.color }}>{card.label}</p>
                            <div className="mt-2 flex items-baseline justify-between gap-2"><strong className="text-2xl" style={{ color:card.color }}>{card.rows.length}</strong><span className="text-xs" style={{ color:"var(--text-2)" }}>{fmt(card.totals.quantity, 2)} unités*</span></div>
                            <p className="mt-1 text-sm font-semibold" style={{ color:card.color }}>{card.totals.valued ? `${fmt(card.totals.value, 2)} FCFA valorisés` : "Valeur indisponible"}</p>
                          </div>)}
                        </div>
                        <p className="text-xs mb-4" style={{ color:"var(--text-3)" }}>* Quantités additionnées selon les unités propres à chaque produit. Valeurs calculées au prix d’achat du lot lorsqu’il est renseigné.</p>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les mouvements">
                            {([{ key:"all", label:`Tous (${reports.movements.length})` }, { key:"entries", label:`Entrées (${movementEntries.length})` }, { key:"exits", label:`Sorties (${movementExits.length})` }] as const).map(option => <button key={option.key} type="button" onClick={() => setMovementView(option.key)} className="btn-ghost" aria-pressed={movementView === option.key} style={movementView === option.key ? { background:"var(--accent-light)", borderColor:"#C7D2FE", color:"var(--accent-dark)" } : undefined}>{option.label}</button>)}
                          </div>
                          <button className="btn-ghost report-no-print" onClick={() => window.print()}><FileDown size={14}/> Imprimer / PDF</button>
                        </div>
                      </div>
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="tbl">
                          <thead><tr><th>Produit / référence</th><th style={{ textAlign:"right" }}>Quantité</th><th>Unité</th><th style={{ textAlign:"right" }}>Prix unitaire</th><th style={{ textAlign:"right" }}>Valeur totale</th><th style={{ textAlign:"center" }}>Type / destination</th><th>Date</th><th>Utilisateur</th><th>Motif / référence</th></tr></thead>
                          <tbody>
                            {visibleMovements.map((m) => (
                              <motion.tr key={m.id} initial={{ opacity:1 }} animate={{ opacity:1 }}>
                                <td className="font-medium">{m.product_name}{m.sku && <div className="text-xs" style={{ color:"var(--text-3)" }}>Réf. {m.sku}</div>}</td>
                                <td style={{ textAlign:"right", fontWeight:600 }}>{fmt(m.quantity, 2)}</td>
                                <td>{m.unit || "—"}</td>
                                <td style={{ textAlign:"right" }}>{m.unit_cost == null ? "—" : `${fmt(m.unit_cost, 2)} FCFA`}</td>
                                <td style={{ textAlign:"right", fontWeight:600 }}>{m.movement_value == null ? "—" : `${fmt(m.movement_value, 2)} FCFA`}</td>
                                <td style={{ textAlign:"center" }}>
                                  <span className={`tag ${movementClass(m.type)}`}>{m.destination === "CUISINE" ? "Sortie · Cuisine" : movementLabel(m.type)}</span>
                                </td>
                                <td style={{ color:"var(--text-2)" }}>{fmtDate(m.created_at)}</td>
                                <td style={{ color:"var(--text-2)" }}>{m.user_name}</td>
                                <td>{m.reason || "Non renseigné"}{m.reference_number && <div className="text-xs" style={{ color:"var(--text-3)" }}>Réf. {m.reference_number}</div>}</td>
                              </motion.tr>
                            ))}
                            {!visibleMovements.length && <tr><td colSpan={9} className="text-center py-8">Aucun mouvement pour ce filtre sur la période sélectionnée.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                      <div className="sm:hidden p-3 space-y-2">
                        {visibleMovements.map((m) => (
                          <motion.div key={m.id} initial={{ opacity:1, y:0 }} animate={{ opacity:1, y:0 }}>
                            <MobileCard bc={m.type === "IN" ? "#A7F3D0" : m.type === "OUT" ? "#BFDBFE" : m.type === "ADJUSTMENT" ? "#DDD6FE" : "#FCA5A5"}>
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <p className="font-semibold text-sm truncate">{m.product_name}</p>
                                <span className={`tag shrink-0 ${movementClass(m.type)}`}>{m.destination === "CUISINE" ? "Sortie · Cuisine" : movementLabel(m.type)}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm" style={{ color:"var(--text-2)" }}>
                                <span>Quantité : <strong>{fmt(m.quantity)}</strong></span>
                                <span>Unité : <strong>{m.unit || "—"}</strong></span>
                                <span>{fmtDate(m.created_at)}</span>
                                {m.user_name && <span>{m.user_name}</span>}
                                <span>Motif : {m.reason || "Non renseigné"}</span>
                                {m.sku && <span>Réf. produit : {m.sku}</span>}
                                <span>Prix unitaire : {m.unit_cost == null ? "—" : `${fmt(m.unit_cost, 2)} FCFA`}</span>
                                <span>Valeur : {m.movement_value == null ? "—" : `${fmt(m.movement_value, 2)} FCFA`}</span>
                                {m.reference_number && <span>Réf. mouvement : {m.reference_number}</span>}
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
                                <td><span className="tag tag-stone">{alertTypeLabel(a.type)}</span></td>
                                <td>
                                  <span className={`tag ${a.severity === "CRITICAL" ? "tag-red" : a.severity === "WARNING" ? "tag-amber" : "tag-blue"}`}>
                                    {severityLabel(a.severity)}
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
                                <span className="tag tag-stone">{alertTypeLabel(a.type)}</span>
                                <span className={`tag ${a.severity === "CRITICAL" ? "tag-red" : a.severity === "WARNING" ? "tag-amber" : "tag-blue"}`}>{severityLabel(a.severity)}</span>
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
                    <div className="p-4 sm:p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      {([
                        { label:"Valeur totale des pertes", value:`${fmt(reports.losses.total_loss_value)} FCFA`, color:"#DC2626", bg:"#FEF2F2", bc:"#FCA5A5" },
                        { label:"Mouvements de produits expirés", value:fmt(reports.losses.expired_count), color:"#D97706", bg:"#FFFBEB", bc:"#FDE68A" },
                        { label:"Pertes / valeur du stock", value:`${reports.losses.loss_percentage.toFixed(2)} %`,color:"#7C3AED", bg:"#F5F3FF", bc:"#DDD6FE" },
                      ] as const).map((row, i) => (
                        <motion.div key={row.label} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.08 }}
                          className="rounded-xl p-4 sm:p-5" style={{ background:row.bg, border:`1.5px solid ${row.bc}` }}>
                          <p className="text-sm font-semibold mb-3" style={{ color:"var(--text-2)" }}>{row.label}</p>
                          <p className="text-2xl sm:text-3xl font-light" style={{ color:row.color }}>{row.value}</p>
                        </motion.div>
                      ))}
                      </div>
                      {reports.loss_movements?.length ? <div className="mt-5 overflow-x-auto"><table className="tbl"><thead><tr><th>Produit</th><th>Quantité perdue</th><th>Cause</th><th>Valeur (FCFA)</th><th>Type</th><th>Date</th></tr></thead><tbody>{reports.loss_movements.map((loss, i) => <tr key={`${loss.created_at}-${i}`}><td>{loss.product_name}</td><td>{fmt(loss.quantity)}{loss.unit ? ` ${loss.unit}` : ""}</td><td>{loss.cause || "—"}</td><td>{loss.value === null ? "—" : fmt(loss.value)}</td><td><span className={`tag ${movementClass(loss.type)}`}>{movementLabel(loss.type)}</span></td><td>{fmtDate(loss.created_at)}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm" style={{color:"var(--text-2)"}}>Aucun mouvement de perte détaillé sur cette période.</p>}
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
                                <td><span className="tag tag-blue">{roleLabel(u.role)}</span></td>
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
                                <span className="tag tag-blue shrink-0">{roleLabel(u.role)}</span>
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
                          <thead><tr><th>Utilisateur</th><th>Action</th><th>Élément concerné</th><th>Date</th></tr></thead>
                          <tbody>
                            {reports.activity_logs.map((l, i) => (
                              <motion.tr key={l.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*.015 }}>
                                <td className="font-medium">{l.user_name || `Utilisateur #${l.user_id}`}</td>
                                <td className="font-medium">{actionLabel(l.action)}</td>
                                <td>{l.entity_type ? <span className="tag tag-stone">{l.entity_type}{l.entity_id ? ` #${l.entity_id}` : ""}</span> : "—"}</td>
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
                                <p className="font-semibold text-sm truncate">{actionLabel(l.action)}</p>
                                {l.entity_type && <span className="tag tag-stone shrink-0">{l.entity_type}{l.entity_id ? ` #${l.entity_id}` : ""}</span>}
                              </div>
                              <p className="text-[13px]" style={{ color:"#0b0c0ec0" }}>
                                {l.user_name || `Utilisateur #${l.user_id}`}  ·  {fmtDate(l.created_at)}
                              </p>
                            </MobileCard>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                </motion.div>
              </AnimatePresence>
              <SectionLabel icon={Activity} text="Analyses complémentaires"/>
              <div className="mb-8 grid grid-cols-1 xl:grid-cols-4 gap-4">
                <motion.section initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} className="xl:col-span-2 report-panel rounded-2xl border p-4 sm:p-5 min-w-0" style={{ background:"var(--surface)", borderColor:"var(--border)" }}>
                  <PanelHeading Icon={TrendingUp} title="4. Évolution du stock par catégorie" description="Variation cumulée valorisée depuis le début de la période · FCFA"/>
                  {categoryTrend.length && trendCategories.length ? <div className="h-[260px] w-full" role="img" aria-label="Évolution nette valorisée du stock par catégorie">
                    <ResponsiveContainer width="100%" height="100%"><LineChart data={categoryTrend} margin={{ top:8, right:12, left:0, bottom:0 }}>
                      <XAxis dataKey="date" tickFormatter={value => new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", { day:"2-digit", month:"short" })} tick={{ fill:"#78766F", fontSize:10 }} axisLine={false} tickLine={false}/>
                      <YAxis tickFormatter={value => `${fmt(Number(value) / 1000)}k`} tick={{ fill:"#78766F", fontSize:10 }} axisLine={false} tickLine={false} width={43}/>
                      <Tooltip labelFormatter={value => fmtDate(String(value))} formatter={(value, name) => [`${fmt(Number(value), 2)} FCFA`, String(name)]} contentStyle={{ borderRadius:12, border:"1px solid #E5E2DB", boxShadow:"0 8px 24px rgba(15,17,23,.1)"}}/>
                      {trendCategories.map((category, index) => <Line key={category} type="monotone" dataKey={category} name={category} stroke={categoryColors[index % categoryColors.length]} strokeWidth={2.5} dot={false} activeDot={{ r:4, strokeWidth:0 }}/>) }
                    </LineChart></ResponsiveContainer>
                  </div> : <div className="h-[260px] flex items-center justify-center rounded-xl text-sm" style={{ background:"var(--bg)", color:"var(--text-3)" }}>Aucun mouvement valorisé sur cette période.</div>}
                </motion.section>

                <motion.section initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.05 }} className="report-panel rounded-2xl border p-4 sm:p-5 min-w-0" style={{ background:"var(--surface)", borderColor:"var(--border)" }}>
                  <PanelHeading Icon={AlertTriangle} title="5. Écarts d’inventaire" description="Derniers comptages de la période sélectionnée"/>
                  {reports.inventory_variances?.length ? <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">{reports.inventory_variances.map((variance, index) => <div key={`${variance.product_name}-${variance.counted_at}-${index}`} className="rounded-xl p-3" style={{ background:"var(--bg)", border:"1px solid var(--border)" }}>
                    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-sm font-semibold truncate" style={{ color:"var(--text)" }}>{variance.product_name}</p><p className="text-[11px] truncate" style={{ color:"var(--text-3)" }}>{variance.category_name || "Sans catégorie"} · {fmtDate(variance.counted_at)}</p></div><span className={`tag shrink-0 ${variance.difference < 0 ? "tag-red" : "tag-amber"}`}>{variance.difference > 0 ? "+" : ""}{fmt(variance.difference, 2)}{variance.unit ? ` ${variance.unit}` : ""}</span></div>
                    <p className="mt-2 text-[11px]" style={{ color:"var(--text-2)" }}>Théorique <strong>{fmt(variance.theoretical_quantity, 2)}{variance.unit ? ` ${variance.unit}` : ""}</strong><span className="mx-2" style={{ color:"var(--text-3)" }}>·</span>Compté <strong>{fmt(variance.real_quantity, 2)}{variance.unit ? ` ${variance.unit}` : ""}</strong></p>
                  </div>)}</div> : <div className="min-h-[220px] flex flex-col items-center justify-center text-center rounded-xl px-4 py-6" style={{ background:reports.inventory_counted_products ? "#ECFDF5" : "#FFFBEB", border:`1px solid ${reports.inventory_counted_products ? "#A7F3D0" : "#FDE68A"}` }}>{reports.inventory_counted_products ? <><CheckCircle2 size={25} style={{ color:"#059669" }}/><p className="mt-2 text-sm font-semibold" style={{ color:"var(--text-2)" }}>Aucun écart sur les comptages</p><p className="mt-1 text-xs" style={{ color:"var(--text-3)" }}>{reports.inventory_counted_products} produit(s) vérifié(s) sur la période</p></> : <><CalendarClock size={25} style={{ color:"#B45309" }}/><p className="mt-2 text-sm font-semibold" style={{ color:"var(--text-2)" }}>Pas de comptage physique saisi</p><p className="mt-1 max-w-xs text-xs leading-relaxed" style={{ color:"var(--text-3)" }}>Le stock est bien enregistré. Aucun relevé physique n’a été saisi sur cette période pour calculer les écarts.</p></>}</div>}
                </motion.section>

                <motion.section initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.1 }} className="report-panel rounded-2xl border p-4 sm:p-5 min-w-0" style={{ background:"var(--surface)", borderColor:"var(--border)" }}>
                  <PanelHeading Icon={AlertCircle} title="6. Observations" description="Alertes actives enregistrées"/>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">{(["CRITICAL", "WARNING", "INFO"] as const).map(severity => { const count = reports.alerts.filter(alert => alert.severity === severity).length; const color = severity === "CRITICAL" ? "#DC2626" : severity === "WARNING" ? "#D97706" : "#4F46E5"; const label = severity === "CRITICAL" ? "Critiques" : severity === "WARNING" ? "À suivre" : "Info"; return <div key={severity} className="rounded-lg px-2 py-1.5 text-center" style={{ background:"var(--bg)" }}><p className="text-sm font-bold" style={{ color }}>{count}</p><p className="text-[10px] truncate" style={{ color:"var(--text-3)" }}>{label}</p></div>; })}</div>
                  {observationAlerts.length ? <div className="space-y-2">{observationAlerts.map(alert => <div key={alert.id} className="rounded-xl p-3" style={{ background:alert.severity === "CRITICAL" ? "#FEF2F2" : alert.severity === "WARNING" ? "#FFFBEB" : "#EEF2FF", border:`1px solid ${alert.severity === "CRITICAL" ? "#FECACA" : alert.severity === "WARNING" ? "#FDE68A" : "#C7D2FE"}` }}>
                    <div className="flex items-center justify-between gap-2 mb-1"><span className={`tag ${alert.severity === "CRITICAL" ? "tag-red" : alert.severity === "WARNING" ? "tag-amber" : "tag-blue"}`}>{severityLabel(alert.severity)}</span><span className="text-[10px] shrink-0" style={{ color:"var(--text-3)" }}>{fmtDate(alert.created_at)}</span></div>
                    <p className="text-xs leading-relaxed" style={{ color:"var(--text-2)" }}>{alert.message}</p>
                  </div>)}</div> : <div className="min-h-[220px] flex flex-col items-center justify-center text-center rounded-xl px-3" style={{ background:"var(--bg)" }}><CheckCircle2 size={24} style={{ color:"#059669" }}/><p className="mt-2 text-sm font-medium" style={{ color:"var(--text-2)" }}>Aucune alerte active</p><p className="mt-1 text-xs" style={{ color:"var(--text-3)" }}>Rien à signaler actuellement</p></div>}
                </motion.section>
              </div>
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
