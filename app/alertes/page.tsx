"use client";

import React, { useEffect, useState, useRef } from "react";
import SidebarLayout from "@/src/navbar/SidebarLayout";
import { useAuth } from "@/lib/hooks/useAuth";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Bell, Search, RefreshCw, ChevronDown,
  CheckCircle2, XCircle, AlertCircle, AlertTriangle,
  Info, Check, X, Calendar, BarChart2,
  ChevronLeft, ChevronRight, FileSpreadsheet, FileDown,
  ShieldCheck, Zap, LucideIcon,
} from "lucide-react";
import type { JSX } from "react"
/* ─────────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────────── */

type Severity       = "INFO" | "WARNING" | "CRITICAL";
type AlertType      = "LOW_STOCK" | "EXPIRING_SOON" | "EXPIRED" | "RUPTURE" | string;
type FilterSeverity = "all" | "info" | "warning" | "critical" | "resolved";
type NotifType      = "success" | "error" | "warning";

interface Alert {
  id:           number;
  product_id:   number;
  product_name: string;
  type:         AlertType;
  severity:     Severity;
  message:      string;
  created_at:   string;
  is_resolved:  boolean;
}

interface Metrics {
  total:    number;
  critical: number;
  warning:  number;
  info:     number;
  resolved: number;
}

interface Notif {
  type:    NotifType;
  message: string;
}

interface ExportState {
  xlsx: boolean;
  pdf:  boolean;
}

interface KpiCfg {
  title:     string;
  value:     number;
  Icon:      LucideIcon;
  accent:    string;
  borderHov: string;
  iconBg:    string;
  iconCol:   string;
  valCol:    string;
  subtitle?: string;
}

interface FilterPill {
  key:   FilterSeverity;
  label: string;
  count: number;
}

type RGB = [number, number, number];

/* ─────────────────────────────────────────────────────────────────────────────
   Design System
───────────────────────────────────────────────────────────────────────────── */

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap');
`;

const CSS = `
  :root {
    --bg:            #F8FAFC;
    --surface:       #FFFFFF;
    --surface-2:     #F5F2EE;
    --border:        #E8E4DD;
    --border-strong: #D0C9BE;
    --text:          #1A1714;
    --text-2:        #6B6560;
    --text-3:        #9B9591;
    --accent:        #EA580C;
    --accent-light:  #FFF7ED;
    --accent-mid:    #FDBA74;
    --accent-dark:   #9A3412;
  }

  * { font-family: 'Geist', sans-serif; box-sizing: border-box; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-3); }

  .serif { font-family: 'Instrument Serif', Georgia, serif; }

  .fi {
    width: 100%; background: var(--surface);
    border: 1.5px solid var(--border); border-radius: 12px;
    padding: 11px 14px; font-size: 14px; color: var(--text);
    transition: border-color .2s, box-shadow .2s; outline: none;
    -webkit-appearance: none;
  }
  .fi::placeholder { color: var(--text-3); }
  .fi:hover { border-color: var(--border-strong); }
  .fi:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(234,88,12,.1); }
  .fi:disabled { background: var(--surface-2); color: var(--text-3); cursor: not-allowed; }
  select.fi {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239B9591' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center;
    padding-right: 36px; cursor: pointer;
  }

  .tr-hover { transition: background .15s; }
  .tr-hover:hover { background: #F7F5F1; }

  .stat-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 99px;
    font-size: 11px; font-weight: 600; letter-spacing: .04em;
  }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 20px; border-radius: 12px;
    background: var(--accent); color: #fff;
    font-size: 14px; font-weight: 600; border: none; cursor: pointer;
    transition: background .18s, box-shadow .18s, transform .12s;
    box-shadow: 0 2px 8px rgba(234,88,12,.22);
  }
  .btn-primary:hover { background: #C2410C; box-shadow: 0 6px 20px rgba(234,88,12,.30); transform: translateY(-1px); }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: .45; cursor: not-allowed; transform: none; }

  .btn-ghost {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px; border-radius: 11px;
    background: transparent; color: var(--text-2);
    font-size: 13px; font-weight: 500;
    border: 1.5px solid var(--border); cursor: pointer;
    transition: all .18s;
  }
  .btn-ghost:hover { border-color: var(--border-strong); color: var(--text); background: var(--surface-2); }
  .btn-ghost:disabled { opacity: .4; cursor: not-allowed; }

  .btn-resolve {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 14px; border-radius: 10px;
    background: #F0FDF4; color: #166534;
    font-size: 12px; font-weight: 600;
    border: 1.5px solid #BBF7D0; cursor: pointer;
    transition: all .18s; white-space: nowrap;
  }
  .btn-resolve:hover { background: #DCFCE7; border-color: #86EFAC; transform: translateY(-1px); }
  .btn-resolve:disabled { opacity: .4; cursor: not-allowed; transform: none; }

  .btn-export-xlsx {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px; border-radius: 11px;
    background: #F0FDF4; color: #166534;
    font-size: 13px; font-weight: 600;
    border: 1.5px solid #BBF7D0; cursor: pointer; transition: all .18s;
  }
  .btn-export-xlsx:hover { background: #DCFCE7; border-color: #86EFAC; transform: translateY(-1px); }
  .btn-export-xlsx:disabled { opacity: .4; cursor: not-allowed; transform: none; }

  .btn-export-pdf {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px; border-radius: 11px;
    background: #FFF1F2; color: #9F1239;
    font-size: 13px; font-weight: 600;
    border: 1.5px solid #FECDD3; cursor: pointer; transition: all .18s;
  }
  .btn-export-pdf:hover { background: #FFE4E6; border-color: #FCA5A5; transform: translateY(-1px); }
  .btn-export-pdf:disabled { opacity: .4; cursor: not-allowed; transform: none; }

  .alert-card-critical { border-left: 3px solid #DC2626; background: linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 100%); }
  .alert-card-warning  { border-left: 3px solid #D97706; background: linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%); }
  .alert-card-info     { border-left: 3px solid #2563EB; background: linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%); }
  .alert-card-resolved { border-left: 3px solid #D0C9BE; background: var(--surface-2); opacity: .7; }

  .tag-green  { background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0; }
  .tag-red    { background:#FEF2F2; color:#991B1B; border:1px solid #FCA5A5; }
  .tag-amber  { background:#FFFBEB; color:#92400E; border:1px solid #FDE68A; }
  .tag-orange { background:#FFF7ED; color:#9A3412; border:1px solid #FDBA74; }
  .tag-blue   { background:#EFF6FF; color:#1E40AF; border:1px solid #BFDBFE; }
  .tag-stone  { background:var(--surface-2); color:var(--text-2); border:1px solid var(--border); }

  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin .7s linear infinite; }

  @keyframes sk { 0%,100%{opacity:1}50%{opacity:.4} }
  .sk { background: var(--border); border-radius: 8px; animation: sk 1.6s ease infinite; }

  .filter-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 7px 14px; border-radius: 99px;
    font-size: 12px; font-weight: 600; cursor: pointer;
    border: 1.5px solid var(--border);
    background: var(--surface); color: var(--text-2);
    transition: all .18s;
  }
  .filter-pill:hover { border-color: var(--border-strong); color: var(--text); }
  .filter-pill.active-all      { background:#1A1714; color:#fff; border-color:#1A1714; }
  .filter-pill.active-critical { background:#FEF2F2; color:#991B1B; border-color:#FCA5A5; }
  .filter-pill.active-warning  { background:#FFFBEB; color:#92400E; border-color:#FDE68A; }
  .filter-pill.active-info     { background:#EFF6FF; color:#1E40AF; border-color:#BFDBFE; }
  .filter-pill.active-resolved { background:#ECFDF5; color:#065F46; border-color:#A7F3D0; }

  .kpi-stripe { position:absolute; top:0; left:0; right:0; height:2px; }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

const fmtDate = (d: string): string =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }) : "—";

const fmtDateTime = (d: string): string =>
  d ? new Date(d).toLocaleString("fr-FR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";

const sevLabel = (s: Severity): string =>
  s === "CRITICAL" ? "Critique" : s === "WARNING" ? "Avertissement" : "Info";

const typeLabel = (t: AlertType): string => {
  const m: Record<string, string> = {
    LOW_STOCK: "Stock bas", EXPIRING_SOON: "Expiration proche",
    EXPIRED: "Périmé", RUPTURE: "Rupture",
  };
  return m[t] ?? t;
};

const sevTagColor = (s: Severity): string =>
  s === "CRITICAL" ? "red" : s === "WARNING" ? "amber" : "blue";

const sevCardClass = (a: Alert): string => {
  if (a.is_resolved) return "alert-card-resolved";
  return a.severity === "CRITICAL" ? "alert-card-critical"
       : a.severity === "WARNING"  ? "alert-card-warning"
       : "alert-card-info";
};

/* ─────────────────────────────────────────────────────────────────────────────
   Export via API
───────────────────────────────────────────────────────────────────────────── */

const doExportXLSX = async (alerts: Alert[], token: string) => {
  const res = await fetch('/api/exports/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ format: 'xlsx', items: alerts }),
  });
  if (!res.ok) throw new Error();
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `alertes-${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const doExportPDF = async (alerts: Alert[], token: string) => {
  const res = await fetch('/api/exports/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ format: 'pdf', items: alerts }),
  });
  if (!res.ok) throw new Error();
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `alertes-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

/* ─────────────────────────────────────────────────────────────────────────────
   Micro-components
───────────────────────────────────────────────────────────────────────────── */

function Fonts(): null {
  useEffect(() => {
    if (document.getElementById("al-fonts")) return;
    const s = document.createElement("style");
    s.id = "al-fonts";
    s.textContent = FONTS;
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
  const styles: Record<NotifType, string> = {
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
          className={`fixed top-4 right-4 z-[70] flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl max-w-sm ${styles[notif.type]}`}
        >
          {icons[notif.type]}
          <span className="leading-snug">{notif.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Label({ icon: Icon, text }: { icon: LucideIcon; text: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <Icon size={11} style={{ color:"#0b0c0ec0" }}/>
      <span className="text-[12px] font-semibold tracking-[0.24em] uppercase" style={{ color:"#0b0c0ec0" }}>{text}</span>
      <div className="flex-1 h-px" style={{ background:"var(--border)" }}/>
    </div>
  );
}

function Tag({ label, color = "stone" }: { label: string; color?: string }): JSX.Element {
  return <span className={`stat-pill tag-${color}`}>{label}</span>;
}

function CountUp({ end, suffix = "" }: { end: number; suffix?: string }): JSX.Element {
  const [val, setVal] = useState(0);
  const ref    = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || !end) { setVal(end || 0); return; }
    let s = 0;
    const step = end / (900 / 16);
    const t = setInterval(() => {
      s += step;
      if (s >= end) { setVal(end); clearInterval(t); }
      else setVal(Math.floor(s));
    }, 16);
    return () => clearInterval(t);
  }, [inView, end]);
  return <span ref={ref}>{val.toLocaleString("fr-FR")}{suffix}</span>;
}

function AnimRow({ children, delay = 0 }: { children: React.ReactNode; delay?: number }): JSX.Element {
  const ref    = useRef<HTMLTableRowElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20px 0px" });
  return (
    <motion.tr ref={ref}
      initial={{ opacity:0, y:8 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ delay, duration:.32, ease:[.25,.46,.45,.94] }}
      className="border-b tr-hover"
      style={{ borderColor:"var(--border)" }}>
      {children}
    </motion.tr>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   KPI Card
───────────────────────────────────────────────────────────────────────────── */

function KpiCard({ cfg, idx }: { cfg: KpiCfg; idx: number }): JSX.Element {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }}
      transition={{ delay: idx * .08, type:"spring", stiffness:100, damping:18 }}
    >
      <motion.div
        animate={{
          y: hov ? -3 : 0,
          boxShadow: hov
            ? "0 16px 48px -8px rgba(26,23,20,.13)"
            : "0 1px 4px rgba(26,23,20,.06)",
        }}
        transition={{ duration:.22 }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className="relative overflow-hidden rounded-2xl border bg-white p-5"
        style={{ borderColor: hov ? cfg.borderHov : "var(--border)" }}
      >
        <div className="kpi-stripe" style={{ background: cfg.accent }}/>
        <div className="flex items-start justify-between mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: cfg.iconBg }}>
            <cfg.Icon size={16} style={{ color: cfg.iconCol }}/>
          </div>
          {cfg.title === "Critiques" && cfg.value > 0 && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"/>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"/>
            </span>
          )}
        </div>
        <p className="text-[12px] font-semibold tracking-[.14em] uppercase mb-1.5" style={{ color:"#0b0c0ec0" }}>
          {cfg.title}
        </p>
        <p className="text-3xl font-light leading-none serif" style={{ color: cfg.valCol }}>
          <CountUp end={cfg.value}/>
        </p>
        {cfg.subtitle && (
          <p className="mt-2 text-[13px]" style={{ color:"#0b0c0ec0" }}>{cfg.subtitle}</p>
        )}
        <motion.div
          animate={{ opacity: hov ? .05 : 0 }}
          transition={{ duration:.22 }}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: cfg.accent }}
        />
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Alert Card
───────────────────────────────────────────────────────────────────────────── */

interface AlertCardProps {
  alert:     Alert;
  onResolve: (id: number) => Promise<void>;
  delay?:    number;
}

function AlertCard({ alert, onResolve, delay = 0 }: AlertCardProps): JSX.Element {
  const [resolving, setResolving] = useState(false);
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20px 0px" });

  const handleResolve = async () => {
    setResolving(true);
    await onResolve(alert.id);
    setResolving(false);
  };

  const SevIcon =
    alert.severity === "CRITICAL" ? AlertTriangle :
    alert.severity === "WARNING"  ? AlertCircle   :
    Info;

  const sevIconColor =
    alert.severity === "CRITICAL" ? "#DC2626" :
    alert.severity === "WARNING"  ? "#D97706" :
    "#2563EB";

  const iconBg =
    alert.is_resolved          ? "var(--surface-2)" :
    alert.severity === "CRITICAL" ? "#FEF2F2"        :
    alert.severity === "WARNING"  ? "#FFFBEB"        :
    "#EFF6FF";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity:0, y:12 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      exit={{ opacity:0, y:-8, scale:.98 }}
      transition={{ delay, duration:.32, ease:[.25,.46,.45,.94] }}
    >
      <div
        className={`rounded-2xl overflow-hidden ${sevCardClass(alert)}`}
        style={{ border:"1.5px solid var(--border)" }}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-4">
            <div
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: iconBg }}
            >
              <SevIcon
                size={16}
                style={{ color: alert.is_resolved ? "#0b0c0ec0" : sevIconColor }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <p className="font-semibold text-sm" style={{ color:"var(--text)" }}>
                  {alert.product_name}
                </p>
                <Tag label={typeLabel(alert.type)} color={alert.is_resolved ? "stone" : sevTagColor(alert.severity)}/>
                <Tag label={sevLabel(alert.severity)} color={alert.is_resolved ? "stone" : sevTagColor(alert.severity)}/>
                {alert.is_resolved && (
                  <span className="stat-pill tag-green flex items-center gap-1">
                    <Check size={10}/> Résolue
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed" style={{ color:"var(--text-2)" }}>{alert.message}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <Calendar size={11} style={{ color:"#0b0c0ec0" }}/>
                <span className="" style={{ color:"#0b0c0ec0" }}>
                  {fmtDateTime(alert.created_at)}
                </span>
              </div>
            </div>

            {/*{!alert.is_resolved && (
              <button className="btn-resolve shrink-0" onClick={handleResolve} disabled={resolving}>
                {resolving
                  ? <><span className="inline-block w-3 h-3 border-2 border-green-400/40 border-t-green-600 rounded-full spin"/>Résolution…</>
                  : <><Check size={12}/> Résoudre</>
                }
              </button>
            )}*/}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   AnimatedBar
───────────────────────────────────────────────────────────────────────────── */

function AnimBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }): JSX.Element {
  return (
    <div className="flex-1 h-1.5 overflow-hidden rounded-full" style={{ background:"var(--border)" }}>
      <motion.div
        className="h-1.5 rounded-full"
        initial={{ width:0 }}
        animate={{ width:`${Math.min(pct, 100)}%` }}
        transition={{ duration:1, ease:[.16,1,.3,1], delay }}
        style={{ background: color }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page principale
───────────────────────────────────────────────────────────────────────────── */

export default function AlertesPage(): JSX.Element {
  const { token } = useAuth();

  const [notif, setNotif] = useState<Notif | null>(null);
  const [show,  setShow]  = useState(false);

  const notify = (type: NotifType, message: string) => setNotif({ type, message });

  useEffect(() => {
    if (!notif) return;
    setShow(true);
    const t = setTimeout(() => {
      setShow(false);
      setTimeout(() => setNotif(null), 300);
    }, 3800);
    return () => clearTimeout(t);
  }, [notif]);

  const [alerts,    setAlerts]    = useState<Alert[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [exporting, setExporting] = useState<ExportState>({ xlsx: false, pdf: false });

  const [search,      setSearch]      = useState("");
  const [filterSev,   setFilterSev]   = useState<FilterSeverity>("all");
  const [filterType,  setFilterType]  = useState("");
  const [dateStart,   setDateStart]   = useState("");
  const [dateEnd,     setDateEnd]     = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page,        setPage]        = useState(1);
  const pageSize = 5;

  useEffect(() => { if (token) fetchAlerts(); }, [token]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d: { data?: { alerts?: Alert[] } } = await res.json();
        setAlerts(d.data?.alerts ?? []);
      } else {
        notify("error", "Erreur lors du chargement");
      }
    } catch {
      notify("error", "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId: number): Promise<void> => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        notify("success", "Alerte marquée comme résolue");
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_resolved: true } : a));
      } else {
        const d: { error?: string } = await res.json();
        notify("error", d.error ?? "Erreur");
      }
    } catch {
      notify("error", "Erreur réseau");
    }
  };

  const metrics: Metrics = {
    total:    alerts.length,
    critical: alerts.filter(a => a.severity === "CRITICAL" && !a.is_resolved).length,
    warning:  alerts.filter(a => a.severity === "WARNING"  && !a.is_resolved).length,
    info:     alerts.filter(a => a.severity === "INFO"     && !a.is_resolved).length,
    resolved: alerts.filter(a => a.is_resolved).length,
  };

  const filtered = alerts.filter(a => {
    if (filterSev === "critical" && (a.severity !== "CRITICAL" || a.is_resolved)) return false;
    if (filterSev === "warning"  && (a.severity !== "WARNING"  || a.is_resolved)) return false;
    if (filterSev === "info"     && (a.severity !== "INFO"     || a.is_resolved)) return false;
    if (filterSev === "resolved" && !a.is_resolved) return false;
    if (filterType && a.type !== filterType) return false;
    if (dateStart && a.created_at < dateStart) return false;
    if (dateEnd   && a.created_at.slice(0, 10) > dateEnd) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!a.product_name.toLowerCase().includes(s) && !a.message.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const alertTypes = [...new Set(alerts.map(a => a.type))];
  const activeFilters =
    [search, filterType, dateStart, dateEnd].filter(Boolean).length +
    (filterSev !== "all" ? 1 : 0);

  const filtersDesc = [
    filterSev !== "all" && `Sévérité: ${filterSev}`,
    filterType          && `Type: ${typeLabel(filterType)}`,
    search              && `Recherche: "${search}"`,
    dateStart           && `Depuis: ${fmtDate(dateStart)}`,
    dateEnd             && `Jusqu'à: ${fmtDate(dateEnd)}`,
  ].filter(Boolean).join(" | ");

  const handleExportXLSX = async () => {
    if (filtered.length === 0) {
      notify('error', 'Aucune alerte a exporter');
      return;
    }
    if (!token) {
      notify('error', 'Session invalide');
      return;
    }
    setExporting(e => ({ ...e, xlsx: true }));
    try   { await doExportXLSX(filtered, token); notify("success", "Export Excel réussi !"); }
    catch { notify("error", "Erreur export Excel"); }
    finally { setExporting(e => ({ ...e, xlsx: false })); }
  };

  const handleExportPDF = async () => {
    if (filtered.length === 0) {
      notify('error', 'Aucune alerte a exporter');
      return;
    }
    if (!token) {
      notify('error', 'Session invalide');
      return;
    }
    setExporting(e => ({ ...e, pdf: true }));
    try   { await doExportPDF(filtered, token); notify("success", "Export PDF réussi !"); }
    catch { notify("error", "Erreur export PDF"); }
    finally { setExporting(e => ({ ...e, pdf: false })); }
  };

  const kpis: KpiCfg[] = [
    { title:"Total",          value:metrics.total,    Icon:Bell,          accent:"#EA580C", borderHov:"#FDBA74", iconBg:"#FFF7ED", iconCol:"#EA580C", valCol:"#9A3412", subtitle:"alertes enregistrées" },
    { title:"Critiques",      value:metrics.critical, Icon:AlertTriangle, accent:"#DC2626", borderHov:"#FCA5A5", iconBg:"#FEF2F2", iconCol:"#DC2626", valCol:"#7F1D1D", subtitle:"non résolues"         },
    { title:"Avertissements", value:metrics.warning,  Icon:AlertCircle,   accent:"#D97706", borderHov:"#FDE68A", iconBg:"#FFFBEB", iconCol:"#D97706", valCol:"#78350F", subtitle:"non résolues"         },
    { title:"Info",           value:metrics.info,     Icon:Info,          accent:"#2563EB", borderHov:"#BFDBFE", iconBg:"#EFF6FF", iconCol:"#2563EB", valCol:"#1E3A8A", subtitle:"non résolues"         },
    { title:"Résolues",       value:metrics.resolved, Icon:ShieldCheck,   accent:"#059669", borderHov:"#A7F3D0", iconBg:"#ECFDF5", iconCol:"#059669", valCol:"#065F46", subtitle:"traitées"             },
  ];

  const FILTERS: FilterPill[] = [
    { key:"all",      label:"Toutes",         count: metrics.total    },
    { key:"critical", label:"Critiques",      count: metrics.critical },
    { key:"warning",  label:"Avertissements", count: metrics.warning  },
    { key:"info",     label:"Info",           count: metrics.info     },
    { key:"resolved", label:"Résolues",       count: metrics.resolved },
  ];

  const TYPE_MAP: Record<string, string> = {
    LOW_STOCK: "Stock bas", EXPIRING_SOON: "Expiration proche",
    EXPIRED: "Périmé", RUPTURE: "Rupture",
  };
  const KNOWN_TYPES = ["LOW_STOCK", "EXPIRING_SOON", "EXPIRED", "RUPTURE"];
  const TYPE_COLORS = ["#EA580C", "#D97706", "#DC2626", "#2563EB"];

  return (
    <SidebarLayout>
      <Fonts/>
      <style>{CSS}</style>
      <Toast show={show} notif={notif}/>

      <main className="min-h-screen pb-28 p-4 sm:p-6 lg:p-8" style={{ background:"var(--bg)", color:"var(--text)" }}>
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <motion.header
            initial={{ opacity:0, y:-14 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:.38, ease:[.25,.46,.45,.94] }}
            className="mb-10 flex flex-wrap items-end justify-between gap-4"
          >
            <div>
              <p className="text-[12px] tracking-[.28em] uppercase font-medium mb-2" style={{ color:"#0b0c0ec0" }}>
                Gestion de stock
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight" style={{ color:"var(--text)" }}>
                Alertes
              </h1>
              <p className="mt-1.5 text-sm flex flex-wrap items-center gap-2" style={{ color:"#0b0c0ec0" }}>
                <span>Surveillance temps réel · Criticité · Résolution</span>
                {metrics.critical > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-semibold bg-red-50 text-red-700 border border-red-200">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"/>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"/>
                    </span>
                    {metrics.critical} critique{metrics.critical > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
                onClick={handleExportXLSX} disabled={exporting.xlsx || filtered.length === 0}
                className="btn-export-xlsx">
                {exporting.xlsx
                  ? <><span className="inline-block w-3 h-3 border-2 border-green-400/40 border-t-green-600 rounded-full spin"/>Export…</>
                  : <><FileSpreadsheet size={14}/> Exporter XLSX</>}
              </motion.button>
              <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
                onClick={handleExportPDF} disabled={exporting.pdf || filtered.length === 0}
                className="btn-export-pdf">
                {exporting.pdf
                  ? <><span className="inline-block w-3 h-3 border-2 border-red-300/40 border-t-red-600 rounded-full spin"/>Export…</>
                  : <><FileDown size={14}/> Exporter PDF</>}
              </motion.button>
              <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
                onClick={fetchAlerts} disabled={loading} className="btn-ghost">
                <RefreshCw size={13} className={loading ? "spin" : ""}/>
                <span className="hidden sm:inline">Actualiser</span>
              </motion.button>
            </div>
          </motion.header>

          {/* KPIs */}
          <Label icon={BarChart2} text="Tableau de bord"/>
          <div className="mb-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 xl:gap-4">
            {kpis.map((k, i) => <KpiCard key={i} cfg={k} idx={i}/>)}
          </div>

          {/* Filter bar */}
          <Label icon={Search} text="Filtres"/>
          <motion.div
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:.05, duration:.36 }}
            className="mb-8 rounded-2xl overflow-hidden"
            style={{ border:"1.5px solid var(--border)", background:"var(--surface)" }}
          >
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map(f => (
                  <button key={f.key}
                    onClick={() => { setFilterSev(f.key); setPage(1); }}
                    className={`filter-pill ${filterSev === f.key ? `active-${f.key}` : ""}`}>
                    {f.label}
                    {f.count > 0 && (
                      <span className="text-[12px] font-bold opacity-70">({f.count})</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:"#0b0c0ec0" }}/>
                  <input className="fi" style={{ paddingLeft:"38px" }}
                    placeholder="Produit, message…" value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}/>
                </div>
                <button className="btn-ghost flex-shrink-0" onClick={() => setShowFilters(v => !v)}>
                  <Search size={13}/>
                  <span className="hidden sm:inline">Avancés</span>
                  {activeFilters > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-bold"
                      style={{ background:"var(--accent)", color:"#fff" }}>{activeFilters}</span>
                  )}
                  <ChevronDown size={13} style={{ transform: showFilters ? "rotate(180deg)" : "", transition:"transform .2s" }}/>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
                  exit={{ height:0, opacity:0 }} transition={{ duration:.3, ease:[.4,0,.2,1] }}
                  className="overflow-hidden">
                  <div className="px-4 sm:px-5 pb-5 pt-1" style={{ borderTop:"1px solid var(--border)" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                      <div>
                        <p className="text-[12px] font-semibold tracking-[.1em] uppercase mb-1.5" style={{ color:"#0b0c0ec0" }}>Type d'alerte</p>
                        <select className="fi" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
                          <option value="">Tous les types</option>
                          {alertTypes.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold tracking-[.1em] uppercase mb-1.5" style={{ color:"#0b0c0ec0" }}>Période</p>
                        <div className="flex items-center gap-1.5">
                          <input type="date" className="fi flex-1 min-w-0" value={dateStart} onChange={e => { setDateStart(e.target.value); setPage(1); }}/>
                          <span style={{ color:"#0b0c0ec0" }} className="text-sm shrink-0">—</span>
                          <input type="date" className="fi flex-1 min-w-0" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setPage(1); }}/>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <button className="btn-ghost w-full justify-center"
                          onClick={() => { setSearch(""); setFilterType(""); setDateStart(""); setDateEnd(""); setPage(1); }}>
                          <X size={12}/> Réinitialiser
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop:"1px solid var(--border)" }}>
                      <span className="text-sm" style={{ color:"#0b0c0ec0" }}>
                        {filtered.length} alerte{filtered.length > 1 ? "s" : ""} correspondante{filtered.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Alert list */}
          <Label icon={Bell} text="Liste des alertes"/>
          <div className="space-y-3 mb-6">
            {loading ? (
              [...Array(4)].map((_, i) => <div key={i} className="sk h-20 rounded-2xl"/>)
            ) : paginated.length === 0 ? (
              <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                className="flex flex-col items-center justify-center py-16 rounded-2xl"
                style={{ border:"1.5px solid var(--border)", background:"var(--surface)" }}>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4" style={{ background:"var(--surface-2)" }}>
                  <Bell size={22} style={{ color:"#0b0c0ec0" }}/>
                </div>
                <p className="text-lg mb-1" style={{ color:"var(--text-2)" }}>Aucune alerte</p>
                <p className="text-sm" style={{ color:"#0b0c0ec0" }}>
                  {alerts.length === 0 ? "Le système n'a détecté aucune alerte" : "Aucune alerte correspondant aux filtres"}
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {paginated.map((alert, idx) => (
                  <AlertCard key={alert.id} alert={alert} onResolve={handleResolve} delay={idx * 0.03}/>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Pagination */}
          {filtered.length > pageSize && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 mb-10">
              <p className="text-sm" style={{ color:"#0b0c0ec0" }}>
                {filtered.length} alerte{filtered.length > 1 ? "s" : ""} · Page {page}/{totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button className="btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding:"7px 12px" }}>
                  <ChevronLeft size={14}/><span className="hidden sm:inline text-sm">Préc.</span>
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    const pg = i + 1;
                    return (
                      <button key={pg} onClick={() => setPage(pg)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-medium transition"
                        style={{
                          background: page === pg ? "var(--accent)" : "transparent",
                          color:      page === pg ? "#fff"          : "var(--text-2)",
                          border:     page === pg ? "none"          : "1.5px solid var(--border)",
                        }}>
                        {pg}
                      </button>
                    );
                  })}
                  {totalPages > 5 && <span style={{ color:"#0b0c0ec0" }} className="text-sm">…</span>}
                </div>
                <button className="btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding:"7px 12px" }}>
                  <span className="hidden sm:inline text-sm">Suiv.</span><ChevronRight size={14}/>
                </button>
              </div>
            </div>
          )}

          {/* Statistics panel */}
          {alerts.length > 0 && (
            <div>
              <Label icon={BarChart2} text="Statistiques"/>
              <motion.div
                initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                transition={{ delay:.15, duration:.38 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-4"
              >
                {/* Distribution par type */}
                <div className="rounded-2xl border bg-white p-5 sm:p-6" style={{ borderColor:"var(--border)" }}>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background:"var(--accent-light)" }}>
                      <Zap size={13} style={{ color:"var(--accent)" }}/>
                    </div>
                    <p className="font-semibold text-sm" style={{ color:"var(--text)" }}>Distribution par type</p>
                  </div>
                  <div className="space-y-3.5">
                    {KNOWN_TYPES.map((type, i) => {
                      const count = alerts.filter(a => a.type === type).length;
                      if (!count) return null;
                      const pct = (count / alerts.length) * 100;
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-sm w-28 shrink-0" style={{ color:"var(--text-2)" }}>
                            {TYPE_MAP[type] ?? type}
                          </span>
                          <AnimBar pct={pct} color={TYPE_COLORS[i % TYPE_COLORS.length]} delay={i * 0.1}/>
                          <div className="flex items-center gap-1.5 shrink-0 w-14 justify-end">
                            <span className="text-sm font-light" style={{ color:"var(--text)" }}>{count}</span>
                            <span className="text-[12px]" style={{ color:"#0b0c0ec0" }}>{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Statut résolution */}
                <div className="rounded-2xl border bg-white p-5 sm:p-6" style={{ borderColor:"var(--border)" }}>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background:"#ECFDF5" }}>
                      <ShieldCheck size={13} style={{ color:"#059669" }}/>
                    </div>
                    <p className="font-semibold text-sm" style={{ color:"var(--text)" }}>Statut de résolution</p>
                  </div>

                  <div className="flex items-center justify-between mb-6">
                    <div className="relative w-24 h-24">
                      <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" strokeWidth="3"/>
                        <motion.circle
                          cx="18" cy="18" r="14" fill="none"
                          stroke="#059669" strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 14}
                          initial={{ strokeDashoffset: 2 * Math.PI * 14 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 14 * (1 - (metrics.resolved / (metrics.total || 1))) }}
                          transition={{ duration:1.2, ease:[.16,1,.3,1], delay:.3 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-light" style={{ color:"var(--text)" }}>
                          {metrics.total > 0 ? Math.round((metrics.resolved / metrics.total) * 100) : 0}%
                        </span>
                        <span className="text-[12px]" style={{ color:"#0b0c0ec0" }}>résolu</span>
                      </div>
                    </div>

                    <div className="flex-1 ml-6 space-y-4">
                      {(
                        [
                          { label:"En attente", count: metrics.total - metrics.resolved, color:"#EA580C" },
                          { label:"Résolues",   count: metrics.resolved,                 color:"#059669" },
                        ] as const
                      ).map((row, i) => (
                        <div key={row.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: row.color }}/>
                              <span className="text-sm" style={{ color:"var(--text-2)" }}>{row.label}</span>
                            </div>
                            <span className="text-base font-light" style={{ color:"var(--text)" }}>{row.count}</span>
                          </div>
                          <AnimBar
                            pct={metrics.total > 0 ? (row.count / metrics.total) * 100 : 0}
                            color={row.color}
                            delay={.4 + i * .1}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4" style={{ borderTop:"1px solid var(--border)" }}>
                    <p className="text-[12px] font-semibold tracking-[.12em] uppercase mb-3" style={{ color:"#0b0c0ec0" }}>Par sévérité</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { label:"Critiques", count: metrics.critical, color:"#DC2626", bg:"#FEF2F2" },
                          { label:"Warnings",  count: metrics.warning,  color:"#D97706", bg:"#FFFBEB" },
                          { label:"Info",      count: metrics.info,     color:"#2563EB", bg:"#EFF6FF" },
                        ] as const
                      ).map(s => (
                        <div key={s.label} className="rounded-xl p-3 text-center"
                          style={{ background: s.bg, border:`1px solid ${s.color}22` }}>
                          <p className="text-2xl font-light" style={{ color: s.color }}>{s.count}</p>
                          <p className="text-[12px] mt-0.5" style={{ color: s.color }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

        </div>
      </main>
    </SidebarLayout>
  );
}