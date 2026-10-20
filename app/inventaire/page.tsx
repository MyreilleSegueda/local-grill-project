"use client";

/**
 * app/inventaire/page.tsx — COMPLET
 *
 * RBAC :
 *   INVENTORY_VIEW    → accès page + lecture tableau + export
 *   INVENTORY_CREATE  → bouton comptage visible + actif
 *   INVENTORY_EDIT    → idem INVENTORY_CREATE (les deux autorisent le comptage)
 *
 * Synchronisation stock :
 *   Le modal appelle POST /api/inventory/count → recordInventoryCount()
 *   qui crée atomiquement le mouvement ADJUSTMENT + met à jour inventory_snapshots.
 *   La page affiche un aperçu du type d'ajustement AVANT validation.
 *
 * Export design :
 *   PDF  → Header premium avec logo Local Grill Restaurant + bannière violette + KPIs colorés
 *   XLSX → Feuille stylisée avec en-tête branded, couleurs par statut, colonnes auto-width
 */

import { useEffect, useState, useRef } from "react";
import SidebarLayout          from "@/src/navbar/SidebarLayout";
import { useAuth }            from "@/lib/hooks/useAuth";
import { usePagePermissions } from "@/lib/hooks/usePagePermissions";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  ClipboardList, Search, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, AlertCircle, Check, X,
  Calendar, FileText, Layers,
  PenLine, FileSpreadsheet, FileDown, BarChart2, Package, Grid3x3, Info,
  Lock, TrendingUp, TrendingDown, ChefHat, ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */

interface InventoryItem {
  product_id:           number;
  product_name:         string;
  category_name:        string;
  physical_quantity:    number;
  theoretical_quantity: number;
  unit_abbreviation?:   string | null;
  unit_name?:           string | null;
  minimum_stock?:       number | null;
  variance?:            number;
  variance_percentage?: number;
  last_count_date?:     string | null;
  total_value?:         number;
}

interface KitchenInventoryRow {
  product_id: number;
  product_name: string;
  unit_abbreviation: string | null;
  sent: number;
  consumed: number;
  returned: number;
  remaining: number;
}

type NotifType = "success" | "error" | "warning";
interface Notif { type: NotifType; message: string }

interface CountForm  { physical_quantity: string; notes: string }
type     CountErrors = Partial<Record<keyof CountForm, string>>;

interface ExportState { xlsx: boolean; pdf: boolean }

interface KpiCfg {
  title:     string;
  rawValue:  number;
  decimals?: number;
  suffix?:   string;
  Icon:      LucideIcon;
  accent:    string;
  borderHov: string;
  iconBg:    string;
  iconCol:   string;
  valCol:    string;
  subtitle?: string;
}

interface TableColDef { label: string; col: string | null; c: boolean }

/* ─────────────────────────────────────────────────────────────────────────────
   BRAND CONSTANTS
───────────────────────────────────────────────────────────────────────────── */

const BRAND = {
  name:      "Local Grill Restaurant",
  tagline:   "Système de gestion de stock",
  logoPath:  "/medias/images/logo_navbar.png",
  primary:   [124, 58, 237] as [number, number, number],
  dark:      [26,  23,  20] as [number, number, number],
  light:     [250, 248, 245] as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
  green:     [6,   95,  70]  as [number, number, number],
  greenBg:   [236, 253, 245] as [number, number, number],
  amber:     [146, 64,  14]  as [number, number, number],
  amberBg:   [255, 251, 235] as [number, number, number],
  red:       [153, 27,  27]  as [number, number, number],
  redBg:     [254, 242, 242] as [number, number, number],
  violet:    [76,  29, 149]  as [number, number, number],
  violetBg:  [245, 243, 255] as [number, number, number],
  border:    [232, 228, 221] as [number, number, number],
  text2:     [107, 101, 96]  as [number, number, number],
  text3:     [155, 149, 145] as [number, number, number],
};

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────────────────────── */

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap');
`;

const CSS = `
  :root {
    --bg:#F8FAFC; --surface:#FFFFFF; --surface-2:#F5F2EE;
    --border:#E8E4DD; --border-strong:#D0C9BE;
    --text:#1A1714; --text-2:#6B6560; --text-3:#9B9591;
    --accent:#7C3AED; --accent-light:#F5F3FF; --accent-mid:#DDD6FE; --accent-dark:#4C1D95;
  }
  *, *::before, *::after { font-family: 'Geist', sans-serif; box-sizing: border-box; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 99px; }
  .serif { font-family: 'Instrument Serif', Georgia, serif; }
  .fi {
    width:100%; background:var(--surface); border:1.5px solid var(--border);
    border-radius:12px; padding:11px 14px; font-size:14px; color:var(--text);
    transition:border-color .2s,box-shadow .2s; outline:none; -webkit-appearance:none;
  }
  .fi::placeholder { color:var(--text-3); }
  .fi:hover:not(:disabled) { border-color:var(--border-strong); }
  .fi:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(124,58,237,.1); }
  .fi:disabled,.fi[readonly] { background:var(--surface-2); color:var(--text-3); cursor:not-allowed; }
  select.fi {
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239B9591' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 12px center; padding-right:36px; cursor:pointer;
  }
  textarea.fi { resize:none; line-height:1.6; }
  .tr-hover { transition:background .15s; }
  .tr-hover:hover { background:#F7F5F1; }
  .stat-pill { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:99px; font-size:11px; font-weight:600; letter-spacing:.04em; }
  .tag-green  { background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0; }
  .tag-red    { background:#FEF2F2; color:#991B1B; border:1px solid #FCA5A5; }
  .tag-amber  { background:#FFFBEB; color:#92400E; border:1px solid #FDE68A; }
  .tag-violet { background:#F5F3FF; color:#5B21B6; border:1px solid #DDD6FE; }
  .tag-stone  { background:var(--surface-2); color:var(--text-2); border:1px solid var(--border); }
  .btn-primary {
    display:inline-flex; align-items:center; gap:7px; padding:10px 20px; border-radius:12px;
    background:var(--accent); color:#fff; font-size:14px; font-weight:600;
    border:none; cursor:pointer; transition:background .18s,box-shadow .18s,transform .12s;
    box-shadow:0 2px 8px rgba(124,58,237,.24);
  }
  .btn-primary:hover { background:#6D28D9; box-shadow:0 6px 20px rgba(124,58,237,.32); transform:translateY(-1px); }
  .btn-primary:active { transform:translateY(0); }
  .btn-primary:disabled { opacity:.45; cursor:not-allowed; transform:none; }
  .btn-ghost {
    display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:11px;
    background:transparent; color:var(--text-2); font-size:13px; font-weight:500;
    border:1.5px solid var(--border); cursor:pointer; transition:all .18s;
  }
  .btn-ghost:hover { border-color:var(--border-strong); color:var(--text); background:var(--surface-2); }
  .btn-ghost:disabled { opacity:.4; cursor:not-allowed; }
  .btn-locked {
    display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:11px;
    background:var(--surface-2); color:var(--text-3); font-size:13px; font-weight:500;
    border:1.5px solid var(--border); cursor:not-allowed; opacity:.55;
  }
  .btn-xlsx {
    display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:11px;
    background:#F0FDF4; color:#166534; font-size:13px; font-weight:600;
    border:1.5px solid #BBF7D0; cursor:pointer; transition:all .18s;
  }
  .btn-xlsx:hover { background:#DCFCE7; border-color:#86EFAC; transform:translateY(-1px); }
  .btn-xlsx:disabled { opacity:.4; cursor:not-allowed; transform:none; }
  .btn-pdf {
    display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:11px;
    background:#FFF1F2; color:#9F1239; font-size:13px; font-weight:600;
    border:1.5px solid #FECDD3; cursor:pointer; transition:all .18s;
  }
  .btn-pdf:hover { background:#FFE4E6; border-color:#FCA5A5; transform:translateY(-1px); }
  .btn-pdf:disabled { opacity:.4; cursor:not-allowed; transform:none; }
  .modal-overlay {
    position:fixed; inset:0; z-index:60;
    background:rgba(26,23,20,.45);
    backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
  }
  .kpi-stripe { position:absolute; top:0; left:0; right:0; height:2px; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .spin { animation:spin .7s linear infinite; }
  @keyframes sk { 0%,100%{opacity:1}50%{opacity:.4} }
  .sk { background:var(--border); border-radius:8px; animation:sk 1.6s ease infinite; }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   UTILS
───────────────────────────────────────────────────────────────────────────── */

const fmt = (d?: string | null): string =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

const fmtNum = (n: number) => n.toLocaleString("fr-FR");

function stockStatus(item: InventoryItem) {
  if ((item.physical_quantity ?? 0) <= 0)
    return { label: "Épuisé",     color: "red",   tag: "tag-red"   };
  if (item.minimum_stock != null && item.physical_quantity <= item.minimum_stock)
    return { label: "Stock bas",  color: "amber", tag: "tag-amber" };
  return   { label: "Disponible", color: "green", tag: "tag-green" };
}

function varianceColor(v: number): string {
  if (v > 0) return "#059669";
  if (v < 0) return "#DC2626";
  return "#0b0c0ec0";
}

function useNotify() {
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
  return { notif, show, notify };
}

/* ─────────────────────────────────────────────────────────────────────────────
   MICRO-COMPOSANTS
───────────────────────────────────────────────────────────────────────────── */

function Fonts(): null {
  useEffect(() => {
    if (document.getElementById("inv-fonts")) return;
    const s = document.createElement("style");
    s.id = "inv-fonts"; s.textContent = FONTS;
    document.head.appendChild(s);
  }, []);
  return null;
}

function Toast({ show, notif }: { show: boolean; notif: Notif | null }) {
  const icons: Record<NotifType, React.ReactNode> = { success: <CheckCircle2 size={15}/>, error: <XCircle size={15}/>, warning: <AlertCircle size={15}/> };
  const cls: Record<NotifType, string> = { success: "border-emerald-200 bg-emerald-50 text-emerald-800", error: "border-red-200 bg-red-50 text-red-800", warning: "border-amber-200 bg-amber-50 text-amber-800" };
  return (
    <AnimatePresence>
      {show && notif && (
        <motion.div initial={{ opacity:0,y:-24,scale:.94 }} animate={{ opacity:1,y:0,scale:1 }} exit={{ opacity:0,y:-20,scale:.94 }} transition={{ type:"spring",stiffness:420,damping:28 }} className={`fixed top-4 right-4 z-[80] flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl max-w-sm ${cls[notif.type]}`}>
          {icons[notif.type]}<span className="leading-snug">{notif.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Tag({ label, color = "stone" }: { label: string; color?: string }) {
  return <span className={`stat-pill tag-${color}`}>{label}</span>;
}

function SectionLabel({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <Icon size={11} style={{ color:"#0b0c0ec0" }}/>
      <span className="text-[12px] font-semibold tracking-[0.24em] uppercase" style={{ color:"#0b0c0ec0" }}>{text}</span>
      <div className="flex-1 h-px" style={{ background:"var(--border)" }}/>
    </div>
  );
}

function AnimRow({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref    = useRef<HTMLTableRowElement>(null);
  const inView = useInView(ref, { once:true, margin:"0px 0px -20px 0px" });
  return (
    <motion.tr ref={ref} initial={{ opacity:0,y:8 }} animate={inView ? { opacity:1,y:0 } : {}} transition={{ delay, duration:.32, ease:[.25,.46,.45,.94] }} className="border-b tr-hover" style={{ borderColor:"var(--border)" }}>
      {children}
    </motion.tr>
  );
}

function FieldLabel({ label, icon: Icon, required, error, hint, children }: { label: string; icon?: LucideIcon; required?: boolean; error?: string; hint?: string; children: React.ReactNode; }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon size={12} style={{ color:"#0b0c0ec0" }}/>}
        <span className="text-[13px] font-semibold tracking-[.06em] uppercase" style={{ color:"#0b0c0ec0" }}>
          {label}{required && <span style={{ color:"var(--accent)" }}> *</span>}
        </span>
      </div>
      {children}
      {hint && !error && <p className="mt-1 text-[13px]" style={{ color:"#0b0c0ec0" }}>{hint}</p>}
      {error && <motion.p initial={{ opacity:0,y:-4 }} animate={{ opacity:1,y:0 }} className="mt-1.5 text-sm font-medium flex items-center gap-1" style={{ color:"#DC2626" }}><AlertCircle size={11}/>{error}</motion.p>}
    </div>
  );
}

function AccessDenied({ permission }: { permission: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background:"#FEF2F2" }}>
        <Lock size={28} style={{ color:"#F87171" }}/>
      </div>
      <div>
        <p className="text-lg font-bold" style={{ color:"var(--text)" }}>Accès refusé</p>
        <p className="text-sm mt-1" style={{ color:"#0b0c0ec0" }}>
          Permission requise : <code className="text-sm font-mono rounded px-1.5 py-0.5" style={{ background:"var(--surface-2)", color:"var(--text-2)" }}>{permission}</code>
        </p>
      </div>
    </div>
  );
}

function CountUp({ end, decimals = 0, suffix = "" }: { end: number; decimals?: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref    = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once:true });
  useEffect(() => {
    if (!inView || !end) { setVal(end || 0); return; }
    let s = 0;
    const step = end / (1200 / 16);
    const t = setInterval(() => {
      s += step;
      if (s >= end) { setVal(end); clearInterval(t); } else setVal(s);
    }, 16);
    return () => clearInterval(t);
  }, [inView, end]);
  return <span ref={ref}>{decimals > 0 ? val.toFixed(decimals) : Math.floor(val).toLocaleString("fr-FR")}{suffix}</span>;
}

function KpiCard({ cfg, idx }: { cfg: KpiCfg; idx: number }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div initial={{ opacity:0,y:28 }} animate={{ opacity:1,y:0 }} transition={{ delay:idx*.08, type:"spring", stiffness:100, damping:18 }}>
      <motion.div animate={{ y:hov?-3:0, boxShadow:hov?"0 16px 48px -8px rgba(26,23,20,.13)":"0 1px 4px rgba(26,23,20,.06)" }} transition={{ duration:.22 }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} className="relative overflow-hidden rounded-2xl border bg-white p-5" style={{ borderColor:hov?cfg.borderHov:"var(--border)" }}>
        <div className="kpi-stripe" style={{ background:cfg.accent }}/>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl mb-5" style={{ background:cfg.iconBg }}>
          <cfg.Icon size={16} style={{ color:cfg.iconCol }}/>
        </div>
        <p className="text-[12px] font-semibold tracking-[.14em] uppercase mb-1.5" style={{ color:"#0b0c0ec0" }}>{cfg.title}</p>
        <p className="text-3xl font-light leading-none serif" style={{ color:cfg.valCol }}>
          <CountUp end={cfg.rawValue} decimals={cfg.decimals??0} suffix={cfg.suffix??""}/>
        </p>
        {cfg.subtitle && <p className="mt-2 text-[13px]" style={{ color:"#0b0c0ec0" }}>{cfg.subtitle}</p>}
        <motion.div animate={{ opacity:hov?.06:0 }} transition={{ duration:.22 }} className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background:cfg.accent }}/>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MODAL DE COMPTAGE
───────────────────────────────────────────────────────────────────────────── */

function CountModal({ show, onClose, item, token, onSuccess, notify, canCount }: { show:boolean; onClose:()=>void; item:InventoryItem|null; token:string|null; onSuccess:()=>void; notify:(t:NotifType,m:string)=>void; canCount:boolean; }) {
  const [fd,   setFd]   = useState<CountForm>({ physical_quantity:"", notes:"" });
  const [errs, setErrs] = useState<CountErrors>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof CountForm, v: string) => { setFd(p => ({ ...p, [k]: v })); setErrs(p => ({ ...p, [k]: "" })); };

  useEffect(() => {
    if (!show) { setTimeout(() => { setFd({ physical_quantity:"", notes:"" }); setErrs({}); }, 320); return; }
    if (item) { setFd({ physical_quantity: String(item.physical_quantity ?? item.theoretical_quantity ?? ""), notes: "" }); }
  }, [show, item]);

  const handleSubmit = async () => {
    if (!canCount) { notify("error", "Permission INVENTORY_CREATE requise"); return; }
    const qty = parseFloat(fd.physical_quantity);
    const e: CountErrors = {};
    if (fd.physical_quantity === "" || isNaN(qty) || qty < 0) e.physical_quantity = "Quantité invalide (≥ 0)";
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/inventory/count", {
        method: "POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ product_id: item?.product_id, physical_quantity: qty, notes: fd.notes || undefined }),
      });
      if (res.ok) { notify("success", "Comptage enregistré — stock synchronisé !"); onClose(); onSuccess(); }
      else { const d = await res.json() as { error?: string }; notify("error", d.error || "Erreur lors de l'enregistrement"); }
    } catch { notify("error", "Erreur réseau"); }
    finally { setBusy(false); }
  };

  const theoric  = item?.theoretical_quantity ?? 0;
  const physical = parseFloat(fd.physical_quantity || "0");
  const hasValue = fd.physical_quantity !== "" && !isNaN(physical);
  const delta    = physical - theoric;
  const deltaPct = theoric !== 0 ? ((delta / theoric) * 100).toFixed(2) : "0.00";
  const vc       = delta === 0 ? "#0b0c0ec0" : delta > 0 ? "#059669" : "#DC2626";
  const adjType  = Math.abs(delta) > 0.0001 ? (delta > 0 ? "entrée" : "sortie") : null;

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div className="modal-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:.22 }} onClick={onClose}/>
          <motion.div initial={{ opacity:0,y:32,scale:.97 }} animate={{ opacity:1,y:0,scale:1 }} exit={{ opacity:0,y:24,scale:.97 }} transition={{ type:"spring", stiffness:340, damping:28 }} className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-[61] p-0 sm:p-4">
            <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col" style={{ background:"var(--surface)", border:"1.5px solid var(--border)", boxShadow:"0 32px 80px -8px rgba(26,23,20,.22)", maxHeight:"95dvh" }}>
              <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom:"1.5px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background:canCount?"var(--accent-light)":"#F1F5F9" }}>
                    {canCount ? <PenLine size={16} style={{ color:"var(--accent)" }}/> : <Lock size={16} style={{ color:"#94A3B8"}}/>}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold tracking-[.18em] uppercase" style={{ color:"#0b0c0ec0" }}>Inventaire</p>
                    <h2 className="text-xl font-normal serif" style={{ color:"var(--text)" }}>Comptage physique</h2>
                  </div>
                </div>
                <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background:"var(--surface-2)" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--border)")} onMouseLeave={e => (e.currentTarget.style.background = "var(--surface-2)")}>
                  <X size={15} style={{ color:"var(--text-2)"}}/>
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-6 space-y-5">
                {!canCount && (
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold" style={{ background:"#FFFBEB", border:"1px solid #FDE68A", color:"#92400E" }}>
                    <Lock size={13}/>Mode lecture — permission INVENTORY_CREATE requise
                  </div>
                )}
                {item && (
                  <motion.div initial={{ opacity:0,y:-6 }} animate={{ opacity:1,y:0 }} className="rounded-2xl border p-4" style={{ background:"var(--accent-light)", borderColor:"var(--accent-mid)" }}>
                    <p className="font-semibold text-sm" style={{ color:"var(--accent-dark)" }}>{item.product_name}</p>
                    <p className="text-sm mt-0.5" style={{ color:"var(--accent)" }}>{item.category_name}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p style={{ color:"#0b0c0ec0" }}>Qté théorique (système)</p>
                        <p className="serif text-xl font-light mt-0.5" style={{ color:"var(--text)" }}>
                          {item.theoretical_quantity ?? "—"}
                          <span className="text-sm ml-1 serif" style={{ color:"#0b0c0ec0" }}>{item.unit_abbreviation || ""}</span>
                        </p>
                      </div>
                      <div>
                        <p style={{ color:"#0b0c0ec0" }}>Dernier comptage physique</p>
                        <p className="font-medium mt-0.5" style={{ color:"var(--text-2)" }}>{item.physical_quantity ?? "—"} {item.unit_abbreviation || ""}</p>
                        <p className="text-[12px] mt-0.5" style={{ color:"#0b0c0ec0" }}>{fmt(item.last_count_date)}</p>
                      </div>
                      {item.minimum_stock != null && (
                        <div>
                          <p style={{ color:"#0b0c0ec0" }}>Stock minimum</p>
                          <p className="font-medium mt-0.5" style={{ color:"var(--text-2)" }}>{item.minimum_stock} {item.unit_abbreviation || ""}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
                <FieldLabel label="Quantité physique comptée" icon={Layers} required={canCount} error={errs.physical_quantity} hint={`Quantité théorique système : ${theoric} ${item?.unit_abbreviation || ""}`}>
                  <div className="relative">
                    <input type="number" step="0.01" min="0" className="fi" style={{ paddingRight:"50px" }} placeholder="0" value={fd.physical_quantity} disabled={!canCount} onChange={e => set("physical_quantity", e.target.value)}/>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold" style={{ color:"#0b0c0ec0" }}>{item?.unit_abbreviation || item?.unit_name || "u"}</span>
                  </div>
                </FieldLabel>
                {hasValue && canCount && (
                  <motion.div initial={{ opacity:0,scale:.96 }} animate={{ opacity:1,scale:1 }} className="rounded-2xl overflow-hidden" style={{ border:"1.5px solid var(--border)" }}>
                    <div className="px-5 py-4 space-y-2.5" style={{ background:"var(--bg)" }}>
                      <p className="text-[12px] font-semibold tracking-[.16em] uppercase" style={{ color:"#0b0c0ec0" }}>Prévisualisation de l'écart</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color:"var(--text-2)" }}>Variance</span>
                        <span className="serif text-xl font-light" style={{ color:vc }}>{delta > 0 ? "+" : ""}{delta.toFixed(2)} {item?.unit_abbreviation || ""}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color:"var(--text-2)" }}>Variance %</span>
                        <span className="text-sm font-semibold" style={{ color:vc }}>{delta > 0 ? "+" : ""}{deltaPct}%</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full" style={{ background:"var(--border)" }}>
                        <motion.div className="h-1 rounded-full" initial={{ width:0 }} animate={{ width:`${Math.min(Math.abs(parseFloat(deltaPct)), 100)}%` }} transition={{ duration:.9, ease:[.16,1,.3,1] }} style={{ background:vc }}/>
                      </div>
                    </div>
                    {adjType === "entrée" && (
                      <div className="px-5 py-3.5 border-t" style={{ borderColor:"#BBF7D0", background:"#F0FDF4" }}>
                        <div className="flex items-start gap-2.5">
                          <TrendingUp size={15} style={{ color:"#166534", marginTop:1 }}/>
                          <div>
                            <p className="text-sm font-bold" style={{ color:"#166534" }}>Ajustement automatique — Entrée de stock créée</p>
                            <p className="text-[13px] mt-0.5" style={{ color:"#15803D" }}>Un lot ADJ de +{Math.abs(delta).toFixed(2)} {item?.unit_abbreviation || "u"} sera créé (surplus physique constaté)</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {adjType === "sortie" && (
                      <div className="px-5 py-3.5 border-t" style={{ borderColor:"#FCA5A5", background:"#FFF5F5" }}>
                        <div className="flex items-start gap-2.5">
                          <TrendingDown size={15} style={{ color:"#991B1B", marginTop:1 }}/>
                          <div>
                            <p className="text-sm font-bold" style={{ color:"#991B1B" }}>Ajustement automatique — Sortie de stock FIFO créée</p>
                            <p className="text-[13px] mt-0.5" style={{ color:"#DC2626" }}>{Math.abs(delta).toFixed(2)} {item?.unit_abbreviation || "u"} débités des lots les plus anciens (manque constaté)</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {!adjType && (
                      <div className="px-5 py-3.5 border-t" style={{ borderColor:"#A7F3D0", background:"#ECFDF5" }}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} style={{ color:"#059669"}}/>
                          <p className="text-sm font-semibold" style={{ color:"#065F46" }}>Aucun ajustement — quantité identique à la théorique</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
                <FieldLabel label="Notes" icon={FileText}>
                  <textarea className="fi" rows={3} disabled={!canCount} placeholder="Observations, conditions de comptage, anomalies…" value={fd.notes} onChange={e => set("notes", e.target.value)}/>
                </FieldLabel>
              </div>
              <div className="flex items-center justify-between px-6 py-4 gap-3" style={{ borderTop:"1.5px solid var(--border)", background:"var(--bg)" }}>
                <button className="btn-ghost" onClick={onClose}>Annuler</button>
                {canCount ? (
                  <button className="btn-primary" onClick={handleSubmit} disabled={busy}>
                    {busy ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full spin"/> Enregistrement…</> : <><Check size={14}/> Valider le comptage</>}
                  </button>
                ) : <button className="btn-locked" disabled><Lock size={13}/> Non autorisé</button>}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE PRINCIPALE
───────────────────────────────────────────────────────────────────────────── */

const TABLE_COLS: TableColDef[] = [
  { label:"Produit",       col:"product_name",         c:false },
  { label:"Catégorie",     col:"category_name",        c:false },
  { label:"Qté physique",  col:"physical_quantity",    c:true  },
  //{ label:"Qté théorique", col:"theoretical_quantity", c:true  },
  { label:"Unité",         col:null,                   c:true  },
  { label:"Min.",          col:"minimum_stock",        c:true  },
  { label:"Statut",        col:null,                   c:true  },
  { label:"Variance",      col:"variance",             c:true  },
  { label:"%",             col:"variance_percentage",  c:true  },
  { label:"Dernier compte",col:"last_count_date",      c:true  },
  { label:"Action",        col:null,                   c:true  },
];

export default function InventairePage() {
  const { token }                       = useAuth();
  const { notif, show, notify }         = useNotify();
  const { can, isLoading: permLoading } = usePagePermissions();

  const canView  = can("INVENTORY_VIEW");
  const canCount = can("INVENTORY_CREATE") || can("INVENTORY_EDIT");

  const [items,     setItems]     = useState<InventoryItem[]>([]);
  const [kitchenItems, setKitchenItems] = useState<KitchenInventoryRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [exporting, setExporting] = useState<ExportState>({ xlsx:false, pdf:false });

  const [search,      setSearch]      = useState("");
  const [catF,        setCatF]        = useState("");
  const [prodF,       setProdF]       = useState("");
  const [statusF,     setStatusF]     = useState("");
  const [dateStart,   setDateStart]   = useState("");
  const [dateEnd,     setDateEnd]     = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sort,        setSort]        = useState("product_name");
  const [order,       setOrder]       = useState<"asc" | "desc">("asc");
  const [page,        setPage]        = useState(1);
  const pageSize = 10;

  const [showModal,    setShowModal]    = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const categories = [...new Map(items.map(x => [x.category_name, { id:x.category_name, name:x.category_name }])).values()].filter(c => c.id);
  const products = [...new Map(items.map(x => [x.product_id, { id:x.product_id, name:x.product_name }])).values()];

  useEffect(() => { if (token && canView) fetchInventory(); }, [token, canView]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory", { headers:{ Authorization:`Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json() as { data?: { items?: InventoryItem[]; kitchen?: KitchenInventoryRow[] } };
        setItems(d.data?.items ?? []);
        setKitchenItems(d.data?.kitchen ?? []);
      } else { notify("error", "Erreur lors du chargement de l'inventaire"); }
    } catch { notify("error", "Erreur réseau"); }
    finally { setLoading(false); }
  };

  const allFilteredItems = items
    .filter(item => {
      const s = search.toLowerCase();
      if (s && !item.product_name?.toLowerCase().includes(s) && !item.category_name?.toLowerCase().includes(s)) return false;
      if (catF  && item.category_name      !== catF)   return false;
      if (prodF && String(item.product_id) !== prodF)  return false;
      if (statusF) { const st = stockStatus(item).label; if (st !== statusF) return false; }
      if (dateStart && item.last_count_date && item.last_count_date < dateStart) return false;
      if (dateEnd   && item.last_count_date && item.last_count_date > dateEnd)   return false;
      return true;
    })
    .sort((a, b) => {
      const va = a[sort as keyof InventoryItem] ?? "";
      const vb = b[sort as keyof InventoryItem] ?? "";
      const sa = typeof va === "string" ? va.toLowerCase() : va;
      const sb = typeof vb === "string" ? vb.toLowerCase() : vb;
      if (sa < sb) return order === "asc" ? -1 : 1;
      if (sa > sb) return order === "asc" ?  1 : -1;
      return 0;
    });

  const filteredItems = allFilteredItems.slice((page - 1) * pageSize, page * pageSize);
  const totalFiltered = allFilteredItems.length;

  const toggleSort = (col: string) => {
    if (sort === col) setOrder(o => o === "asc" ? "desc" : "asc");
    else { setSort(col); setOrder("asc"); }
  };

  const reset = () => { setSearch(""); setCatF(""); setProdF(""); setStatusF(""); setDateStart(""); setDateEnd(""); setPage(1); };
  const activeF = [search, catF, prodF, statusF, dateStart, dateEnd].filter(Boolean).length;
  const filtersDesc = [
    search    && `Recherche: "${search}"`,
    catF      && `Catégorie: ${catF}`,
    prodF     && `Produit: ${products.find(p => String(p.id) === prodF)?.name ?? prodF}`,
    statusF   && `Statut: ${statusF}`,
    dateStart && `Depuis: ${fmt(dateStart)}`,
    dateEnd   && `Jusqu'à: ${fmt(dateEnd)}`,
  ].filter(Boolean).join(" | ");

  const validItems   = items.filter(x => !isNaN(x.variance_percentage ?? NaN));
  const avgVariance  = validItems.length ? validItems.reduce((s, x) => s + Math.abs(x.variance_percentage ?? 0), 0) / validItems.length : 0;
  const nbCategories = new Set(items.map(x => x.category_name)).size;

  const kpis: KpiCfg[] = [
    { title:"Total produits", rawValue:items.length, Icon:Package, accent:"#059669", borderHov:"#A7F3D0", iconBg:"#ECFDF5", iconCol:"#059669", valCol:"#065F46", subtitle:`${totalFiltered} dans la vue` },
    { title:"Variance moyenne", rawValue:avgVariance, decimals:2, suffix:"%", Icon:BarChart2, accent:"#D97706", borderHov:"#FDE68A", iconBg:"#FFFBEB", iconCol:"#B45309", valCol:"#78350F", subtitle:"écart absolu moyen" },
    { title:"Catégories", rawValue:nbCategories, Icon:Grid3x3, accent:"#7C3AED", borderHov:"#DDD6FE", iconBg:"#F5F3FF", iconCol:"#7C3AED", valCol:"#4C1D95", subtitle:"analysées" },
  ];

  const handleExportXLSX = async () => {
    setExporting(e => ({ ...e, xlsx:true }));
    try {
      const r = await fetch("/api/exports/inventory?format=xlsx", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        notify("error", err.error || "Erreur lors de l'export Excel");
        return;
      }
      
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LocalGrill_Inventaire_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      notify("success", "Export Excel réussi !");
    } catch {
      notify("error", "Erreur réseau lors de l'export Excel");
    } finally {
      setExporting(e => ({ ...e, xlsx:false }));
    }
  };
  
  const handleExportPDF = async () => {
    setExporting(e => ({ ...e, pdf:true }));
    try {
      const r = await fetch("/api/exports/inventory?format=pdf", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        notify("error", err.error || "Erreur lors de l'export PDF");
        return;
      }
      
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LocalGrill_Inventaire_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      notify("success", "Export PDF réussi !");
    } catch {
      notify("error", "Erreur réseau lors de l'export PDF");
    } finally {
      setExporting(e => ({ ...e, pdf:false }));
    }
  };

  if (!permLoading && !canView) {
    return (
      <SidebarLayout>
        <Fonts/><style>{CSS}</style>
        <div className="min-h-screen flex items-center justify-center" style={{ background:"var(--bg)" }}>
          <AccessDenied permission="INVENTORY_VIEW"/>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <Fonts/><style>{CSS}</style>
      <Toast show={show} notif={notif}/>
      <main className="min-h-screen pb-28 p-4 sm:p-6 lg:p-8" style={{ background:"var(--bg)", color:"var(--text)" }}>
        <div className="max-w-7xl mx-auto">
          {/* ── En-tête ── */}
          <motion.header initial={{ opacity:0,y:-14 }} animate={{ opacity:1,y:0 }} transition={{ duration:.38, ease:[.25,.46,.45,.94] }} className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[12px] tracking-[.28em] uppercase font-medium mb-2" style={{ color:"#0b0c0ec0" }}>Gestion de stock</p>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">Inventaire</h1>
              <p className="mt-1.5 text-sm flex flex-wrap items-center gap-2" style={{ color:"#0b0c0ec0" }}>
                <span>Comptage physique · Écarts · Traçabilité</span>
                {items.length > 0 && <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-sm" style={{ background:"var(--accent)", color:"#fff" }}>{items.length} produits</span>}
                {canCount && <span className="stat-pill tag-violet">✎ Comptage autorisé</span>}
              </p>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <button className="btn-xlsx" onClick={handleExportXLSX} disabled={exporting.xlsx || filteredItems.length === 0}>
                {exporting.xlsx ? <><span className="inline-block w-3 h-3 border-2 border-green-400/40 border-t-green-600 rounded-full spin"/> Export…</> : <><FileSpreadsheet size={14}/> XLSX</>}
              </button>
              <button className="btn-pdf" onClick={handleExportPDF} disabled={exporting.pdf || filteredItems.length === 0}>
                {exporting.pdf ? <><span className="inline-block w-3 h-3 border-2 border-red-300/40 border-t-red-600 rounded-full spin"/> Export…</> : <><FileDown size={14}/> PDF</>}
              </button>
              <button className="btn-ghost" onClick={fetchInventory} disabled={loading}>
                <RefreshCw size={13} className={loading ? "spin" : ""}/>
                <span className="hidden sm:inline">Actualiser</span>
              </button>
            </div>
          </motion.header>

          {/* ── KPIs ── */}
          <SectionLabel icon={BarChart2} text="Indicateurs"/>
          <div className="mb-10 grid grid-cols-1 sm:grid-cols-3 gap-3 xl:gap-4">
            {kpis.map((k, i) => <KpiCard key={i} cfg={k} idx={i}/>)}
          </div>

          {/* ── Suivi Cuisine ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <SectionLabel icon={ChefHat} text="Stock en Cuisine"/>
            <a href="/cuisine" className="btn-ghost" style={{ color:"var(--accent-dark)", borderColor:"var(--accent-mid)" }}>
              Suivi détaillé <ArrowUpRight size={14}/>
            </a>
          </div>
          <motion.section initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:.06 }} className="mb-10 overflow-hidden rounded-2xl" style={{ border:"1.5px solid var(--accent-mid)", background:"linear-gradient(135deg, #fff 0%, #faf8ff 100%)", boxShadow:"0 8px 24px rgba(76,29,149,.06)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5" style={{ borderBottom:"1px solid var(--accent-mid)" }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background:"var(--accent-light)", color:"var(--accent)" }}><ChefHat size={19}/></div>
                <div>
                  <h2 className="font-semibold" style={{ color:"var(--text)" }}>Mouvements des produits en cuisine</h2>
                  <p className="text-xs mt-0.5" style={{ color:"var(--text-2)" }}>Quantités envoyées, consommées, retournées et encore à traiter</p>
                </div>
              </div>
              <span className="stat-pill tag-violet">{kitchenItems.length} produit{kitchenItems.length > 1 ? "s" : ""} suivi{kitchenItems.length > 1 ? "s" : ""}</span>
            </div>
            {loading ? (
              <div className="p-5"><div className="sk h-10 rounded-xl"/></div>
            ) : kitchenItems.length === 0 ? (
              <div className="px-5 py-9 text-center">
                <p className="font-medium" style={{ color:"var(--text-2)" }}>Aucun mouvement Cuisine enregistré</p>
                <p className="mt-1 text-sm" style={{ color:"var(--text-3)" }}>Les produits envoyés apparaîtront ici avec leur consommation et leurs retours.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr style={{ background:"rgba(245,243,255,.7)", color:"var(--text-2)" }}>
                    {["Produit", "Envoyé", "Consommation", "Retourné au stock", "Restant à traiter"].map(label => <th key={label} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider sm:px-5">{label}</th>)}
                  </tr></thead>
                  <tbody>
                    {kitchenItems.map(row => <tr key={row.product_id} className="tr-hover" style={{ borderTop:"1px solid var(--border)" }}>
                      <td className="px-4 py-3.5 font-semibold sm:px-5" style={{ color:"var(--text)" }}>{row.product_name}</td>
                      {[row.sent, row.consumed, row.returned, row.remaining].map((value, index) => <td key={index} className="px-4 py-3.5 whitespace-nowrap sm:px-5">
                        <span className={`font-semibold ${index === 3 && value > 0 ? "text-amber-700" : ""}`} style={index === 3 && value > 0 ? undefined : { color:index === 0 ? "var(--accent-dark)" : "var(--text-2)" }}>{value} <span className="text-xs font-normal">{row.unit_abbreviation ?? ""}</span></span>
                      </td>)}
                    </tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </motion.section>

          {/* ── Filtres ── */}
          <SectionLabel icon={Search} text="Filtres & recherche"/>
          <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:.05 }} className="mb-8 rounded-2xl overflow-hidden" style={{ border:"1.5px solid var(--border)", background:"var(--surface)" }}>
            <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
              <div className="relative flex-1 min-w-[160px]">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:"#0b0c0ec0" }}/>
                <input className="fi" style={{ paddingLeft:"38px" }} placeholder="Produit, catégorie…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/>
              </div>
              <button className="btn-ghost flex-shrink-0" onClick={() => setShowFilters(v => !v)}>
                <Search size={13}/><span className="hidden sm:inline">Filtres avancés</span>
                {activeF > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-bold" style={{ background:"var(--accent)", color:"#fff" }}>{activeF}</span>}
                <ChevronDown size={13} style={{ transform:showFilters?"rotate(180deg)":"", transition:"transform .2s" }}/>
              </button>
            </div>
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height:0,opacity:0 }} animate={{ height:"auto",opacity:1 }} exit={{ height:0,opacity:0 }} transition={{ duration:.3, ease:[.4,0,.2,1] }} className="overflow-hidden">
                  <div className="px-4 sm:px-5 pb-5 pt-1" style={{ borderTop:"1px solid var(--border)" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                      <div>
                        <p className="text-[12px] font-semibold tracking-[.1em] uppercase mb-1.5" style={{ color:"#0b0c0ec0" }}>Catégorie</p>
                        <select className="fi" value={catF} onChange={e => { setCatF(e.target.value); setPage(1); }}>
                          <option value="">Toutes catégories</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold tracking-[.1em] uppercase mb-1.5" style={{ color:"#0b0c0ec0" }}>Produit</p>
                        <select className="fi" value={prodF} onChange={e => { setProdF(e.target.value); setPage(1); }}>
                          <option value="">Tous produits</option>
                          {products.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold tracking-[.1em] uppercase mb-1.5" style={{ color:"#0b0c0ec0" }}>Statut</p>
                        <select className="fi" value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}>
                          <option value="">Tous statuts</option>
                          <option value="Disponible">Disponible</option>
                          <option value="Stock bas">Stock bas</option>
                          <option value="Épuisé">Épuisé</option>
                        </select>
                      </div>
                      <div className="lg:col-span-2">
                        <p className="text-[12px] font-semibold tracking-[.1em] uppercase mb-1.5" style={{ color:"#0b0c0ec0" }}>Période (dernier compte)</p>
                        <div className="flex items-center gap-1.5">
                          <input type="date" className="fi flex-1 min-w-0" value={dateStart} onChange={e => { setDateStart(e.target.value); setPage(1); }}/>
                          <span className="text-sm shrink-0" style={{ color:"#0b0c0ec0" }}>—</span>
                          <input type="date" className="fi flex-1 min-w-0" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setPage(1); }}/>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop:"1px solid var(--border)" }}>
                      <span className="text-sm" style={{ color:"#0b0c0ec0" }}>{totalFiltered} produit{totalFiltered > 1 ? "s" : ""} affiché{totalFiltered > 1 ? "s" : ""}</span>
                      <button className="btn-ghost" onClick={reset}><X size={12}/> Réinitialiser</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Tableau ── */}
          <SectionLabel icon={ClipboardList} text="État de l'inventaire"/>
          <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:.1 }} className="rounded-2xl overflow-hidden" style={{ border:"1.5px solid var(--border)", background:"var(--surface)" }}>
            {loading && (
              <div className="h-0.5 w-full overflow-hidden" style={{ background:"var(--border)" }}>
                <motion.div className="h-full" style={{ background:"var(--accent)" }} initial={{ x:"-100%" }} animate={{ x:"100%" }} transition={{ repeat:Infinity, duration:1.2, ease:"linear" }}/>
              </div>
            )}
            {/* Version desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr style={{ borderBottom:"1.5px solid var(--border)", background:"var(--bg)" }}>
                    {TABLE_COLS.map((h, i) => (
                      <th key={i} onClick={h.col ? () => toggleSort(h.col as string) : undefined} className={`px-4 py-3.5 text-[12px] font-semibold tracking-[.14em] uppercase ${h.c?"text-center":"text-left"} ${h.col?"cursor-pointer select-none":""}`} style={{ color:"#0b0c0ec0" }}>
                        <span className="inline-flex items-center gap-1">
                          {h.label}
                          {h.col && sort === h.col && (order === "asc" ? <ChevronUp size={10} style={{ color:"var(--accent)"}}/> : <ChevronDown size={10} style={{ color:"var(--accent)"}}/>)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && allFilteredItems.length === 0 && [...Array(6)].map((_, i) => (
                    <tr key={i} style={{ borderBottom:"1px solid var(--border)" }}>
                      {[...Array(11)].map((_, j) => <td key={j} className="px-4 py-4"><div className="sk h-4 rounded" style={{ width:`${50 + ((i * 11 + j) * 7) % 40}%` }}/></td>)}
                    </tr>
                  ))}
                  {!loading && filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-5 py-16 text-center">
                        <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} className="space-y-3">
                          <div className="flex justify-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background:"var(--surface-2)" }}><ClipboardList size={22} style={{ color:"#0b0c0ec0"}}/></div></div>
                          <p className="serif text-lg" style={{ color:"var(--text-2)" }}>Aucun produit trouvé</p>
                          <p className="text-sm" style={{ color:"#0b0c0ec0" }}>Modifiez les filtres ou actualisez</p>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                  {filteredItems.map((item, idx) => {
                    const st = stockStatus(item);
                    const vc = varianceColor(item.variance ?? 0);
                    const hv = Math.abs(item.variance_percentage ?? 0) > 5;
                    return (
                      <AnimRow key={item.product_id} delay={idx * .022}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {hv && <AlertCircle size={13} style={{ color:"#D97706", flexShrink:0}}/>}
                            <span className="font-medium max-w-[140px] block truncate" style={{ color:"var(--text)" }}>{item.product_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4"><span className="rounded-lg px-2.5 py-1 text-sm" style={{ background:"var(--bg)", color:"var(--text-2)", border:"1px solid var(--border)" }}>{item.category_name || "—"}</span></td>
                        <td className="px-4 py-4 text-center"><span className="font-medium" style={{ color:"var(--text)" }}>{item.physical_quantity ?? 0}</span></td>
                        <td className="px-4 py-4 text-center"><span className="text-sm" style={{ color:"#0b0c0ec0" }}>{item.unit_abbreviation || item.unit_name || "—"}</span></td>
                        <td className="px-4 py-4 text-center"><span className="text-sm" style={{ color:"#0b0c0ec0" }}>{item.minimum_stock ?? "—"}</span></td>
                        <td className="px-4 py-4 text-center"><Tag label={st.label} color={st.color}/></td>
                        <td className="px-4 py-4 text-center"><span className="font-semibold serif text-base" style={{ color:vc }}>{(item.variance ?? 0) > 0 ? "+" : ""}{item.variance ?? 0}</span></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background:"var(--border)" }}>
                              <motion.div className="h-1 rounded-full" initial={{ width:0 }} animate={{ width:`${Math.min(Math.abs(item.variance_percentage ?? 0), 100)}%` }} transition={{ duration:.9, ease:[.16,1,.3,1], delay:.2 }} style={{ background:vc }}/>
                            </div>
                            <span className="text-[13px] font-semibold w-12 text-right" style={{ color:vc }}>{(item.variance_percentage ?? 0) > 0 ? "+" : ""}{(item.variance_percentage ?? 0).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Calendar size={11} style={{ color:"#0b0c0ec0"}}/>
                            <span className="text-sm" style={{ color:"var(--text-2)" }}>{fmt(item.last_count_date)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {canCount ? (
                            <motion.button whileHover={{ scale:1.06 }} whileTap={{ scale:.95 }} onClick={() => { setSelectedItem(item); setShowModal(true); }} className="flex h-8 w-8 items-center justify-center rounded-xl mx-auto" style={{ background:"var(--accent-light)", border:"1.5px solid var(--accent-mid)" }} title="Comptage physique"><PenLine size={13} style={{ color:"var(--accent)"}}/></motion.button>
                          ) : (
                            <button disabled title="Permission INVENTORY_CREATE requise" className="flex h-8 w-8 items-center justify-center rounded-xl mx-auto" style={{ background:"var(--surface-2)", border:"1.5px solid var(--border)", cursor:"not-allowed", opacity:.35 }}><Lock size={12} style={{ color:"#0b0c0ec0"}}/></button>
                          )}
                        </td>
                      </AnimRow>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Version mobile */}
            <div className="md:hidden">
              {loading && allFilteredItems.length === 0 ? (
                <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="sk h-28 rounded-2xl"/>)}</div>
              ) : filteredItems.length === 0 ? (
                <div className="p-10 text-center space-y-3"><ClipboardList size={24} style={{ color:"#0b0c0ec0", margin:"0 auto" }}/><p className="serif" style={{ color:"var(--text-2)" }}>Aucun produit</p></div>
              ) : (
                <div className="divide-y" style={{ borderColor:"var(--border)" }}>
                  {filteredItems.map((item, idx) => {
                    const st = stockStatus(item);
                    const vc = varianceColor(item.variance ?? 0);
                    const hv = Math.abs(item.variance_percentage ?? 0) > 5;
                    return (
                      <motion.div key={item.product_id} initial={{ opacity:0,x:-10 }} animate={{ opacity:1,x:0 }} transition={{ delay:idx*.04, duration:.3 }} className="p-4 sm:p-5 space-y-3" style={{ background:hv?"#FFFBEB":"var(--surface)" }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">{hv && <AlertCircle size={12} style={{ color:"#D97706"}}/>}<p className="font-medium" style={{ color:"var(--text)" }}>{item.product_name || "—"}</p></div>
                            <p className="text-sm mt-0.5" style={{ color:"#0b0c0ec0" }}>{item.category_name || "—"}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Tag label={st.label} color={st.color}/>
                            {canCount ? <motion.button whileHover={{ scale:1.06 }} whileTap={{ scale:.95 }} onClick={() => { setSelectedItem(item); setShowModal(true); }} className="flex h-7 w-7 items-center justify-center rounded-xl" style={{ background:"var(--accent-light)", border:"1.5px solid var(--accent-mid)" }}><PenLine size={12} style={{ color:"var(--accent)"}}/></motion.button> : <div className="flex h-7 w-7 items-center justify-center rounded-xl" style={{ background:"var(--surface-2)", border:"1.5px solid var(--border)", opacity:.35 }}><Lock size={11} style={{ color:"#0b0c0ec0"}}/></div>}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div><p className="mb-0.5" style={{ color:"#0b0c0ec0" }}>Physique</p><p className="serif text-lg font-light" style={{ color:"var(--text)" }}>{item.physical_quantity ?? 0}<span className="text-[12px] ml-1" style={{ color:"#0b0c0ec0" }}>{item.unit_abbreviation || ""}</span></p></div>
                          <div><p className="mb-0.5" style={{ color:"#0b0c0ec0" }}>Théorique</p><p className="font-medium" style={{ color:"var(--text-2)" }}>{item.theoretical_quantity ?? 0}</p></div>
                          <div><p className="mb-0.5" style={{ color:"#0b0c0ec0" }}>Écart %</p><p className="font-semibold" style={{ color:vc }}>{(item.variance_percentage ?? 0) > 0 ? "+" : ""}{(item.variance_percentage ?? 0).toFixed(1)}%</p></div>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full" style={{ background:"var(--border)" }}>
                          <motion.div className="h-1 rounded-full" initial={{ width:0 }} animate={{ width:`${Math.min(Math.abs(item.variance_percentage ?? 0), 100)}%` }} transition={{ duration:.9, ease:[.16,1,.3,1], delay:idx*.04 }} style={{ background:vc }}/>
                        </div>
                        <div className="flex items-center gap-1.5"><Calendar size={11} style={{ color:"#0b0c0ec0"}}/><span className="text-[13px]" style={{ color:"#0b0c0ec0" }}>Dernier compte : {fmt(item.last_count_date)}</span></div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Footer tableau */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{ borderTop:"1.5px solid var(--border)", background:"var(--bg)" }}>
              <p className="text-sm" style={{ color:"#0b0c0ec0" }}>Page {page} / {Math.max(1, Math.ceil(totalFiltered / pageSize))} · {totalFiltered} produits</p>
              <div className="flex items-center gap-2">
                <button className="btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Précédent</button>
                <span className="text-sm px-2" style={{ color:"var(--text-2)" }}>{page} / {Math.max(1, Math.ceil(totalFiltered / pageSize))}</span>
                <button className="btn-ghost" onClick={() => setPage(p => Math.min(Math.ceil(totalFiltered / pageSize), p + 1))} disabled={page >= Math.ceil(totalFiltered / pageSize)}>Suivant →</button>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-xlsx" style={{ padding:"7px 12px", fontSize:12 }} onClick={handleExportXLSX} disabled={exporting.xlsx || filteredItems.length === 0}><FileSpreadsheet size={13}/><span className="hidden sm:inline">XLSX</span></button>
                <button className="btn-pdf" style={{ padding:"7px 12px", fontSize:12 }} onClick={handleExportPDF} disabled={exporting.pdf || filteredItems.length === 0}><FileDown size={13}/><span className="hidden sm:inline">PDF</span></button>
              </div>
            </div>
          </motion.div>

          {/* ── Bandeau info ── */}
          <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:.22 }} className="mt-8 rounded-2xl p-5 sm:p-6" style={{ background:"#FFFBEB", border:"1.5px solid #FDE68A" }}>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background:"#FEF3C7" }}><Info size={17} style={{ color:"#B45309"}}/></div>
              <div>
                <p className="font-semibold mb-1" style={{ color:"#78350F" }}>Comptage physique et synchronisation automatique du stock</p>
                <p className="text-sm leading-relaxed" style={{ color:"#92400E" }}>
                  Lors d'un comptage physique, tout écart entre la quantité saisie et la quantité théorique calculée par le système génère automatiquement un <strong>mouvement d'ajustement</strong> : une entrée (lot ADJ) si surplus constaté, ou une sortie FIFO si manque constaté. L'opération est atomique — les tables restent toujours cohérentes.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <CountModal show={showModal} onClose={() => setShowModal(false)} item={selectedItem} token={token} onSuccess={fetchInventory} notify={notify} canCount={canCount}/>
    </SidebarLayout>
  );
}
