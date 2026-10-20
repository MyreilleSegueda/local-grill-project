"use client";

/**
 * app/entrees/page.tsx — COMPLET
 *
 * Actions sur chaque lot :
 *   👁  Voir détail     → STOCK_VIEW    (toujours visible en lecture)
 *   ✎  Modifier         → STOCK_EDIT   (price, expiry, notes, qty si vierge)
 *   🗑  Supprimer        → STOCK_DELETE (seulement si aucun mouvement)
 *   ➕  Nouvelle entrée  → STOCK_CREATE
 *
 * Contraintes Prisma respectées :
 *   • quantity_initial modifiable seulement si qty_remaining === qty_initial
 *   • expiration_date ≥ entry_date
 *   • purchase_price ≥ 0
 *   • DELETE bloqué si stock_movements existent ou qt_rem ≠ qt_init
 */

import { useEffect, useState, useRef, useCallback, JSX } from "react";
import SidebarLayout          from "@/src/navbar/SidebarLayout";
import { useAuth }            from "@/lib/hooks/useAuth";
import { usePagePermissions } from "@/lib/hooks/usePagePermissions";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  PackagePlus, Search, RefreshCw, ChevronUp, ChevronDown,
  CheckCircle2, XCircle, AlertCircle, Info, Check, X,
  Hash, Calendar, DollarSign, FileText, ScanLine,
  User, Layers, ChevronLeft, ChevronRight, Sparkles,
  Lock, Eye, Pencil, Trash2, Package, AlertTriangle,
  TrendingDown, BarChart3, Clock,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
type NotifType = "success" | "error" | "warning";
interface Notif { type: NotifType; message: string }
interface Unit     { id: number; name: string; abbreviation?: string }
interface Category { id: number; name: string }
interface Product  {
  id: number; name: string; unit_id?: number; unit?: Unit;
  category?: Category; is_perishable?: boolean; minimum_stock?: number;
}
interface AppUser  { id: number; fullName: string; email?: string }
interface StockMovement {
  id: number; type: string; quantity: number;
  reason?: string; reference_number?: string;
  user_id: number; created_at: string;
}
interface BatchDetail {
  id: number; product_id: number; user_id: number;
  batch_number: string; quantity_initial: number;
  quantity_remaining: number; purchase_price: number;
  entry_date: string; expiration_date?: string | null;
  notes?: string | null; created_at: string; updated_at: string;
  product?: { name?: string; unit?: Unit; category?: Category; supplier?: { name: string } | null };
  user?: { id: number; fullName: string; email: string };
  stock_movements?: StockMovement[];
}
interface BatchMeta {
  canDelete: boolean; canEdit: boolean;
  hasMovements: boolean; totalOut: number; consumptionPct: number;
}
interface StockEntry {
  id: number; product_id?: number;
  user_id?: number; userId?: number;
  user?: { id: number; fullName?: string };
  product?: { name?: string; unit?: Unit; category?: Category };
  quantity_initial: number; quantity_remaining: number;
  purchase_price?: number; entry_date: string;
  expiration_date?: string | null; batch_number?: string;
}
interface KitchenReturn {
  id: number; quantity: number; reason?: string | null; reference_number?: string | null;
  created_at: string; user?: { id: number; fullName: string } | null;
  product?: { name?: string; unit?: Unit };
}
interface EditForm {
  purchase_price: string; expiration_date: string;
  notes: string; quantity_initial: string;
}
interface CreateForm {
  product_id: string; batch_number: string; entry_date: string;
  expiration_date: string; quantity: string; purchase_price: string; notes: string;
}
type CreateErrors = Partial<Record<keyof CreateForm, string>>;
type EditErrors   = Partial<Record<keyof EditForm, string>>;
type SortOrder    = "asc" | "desc";
type TagColor     = "green" | "red" | "amber" | "orange" | "stone" | "blue";

/* ─────────────────────────────────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────────────────────────────────── */
const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap');
`;
const CSS = `
  :root {
    --bg:#F8FAFC;--surface:#FFFFFF;--surface-2:#F5F2EE;
    --border:#E8E4DD;--border-strong:#D0C9BE;
    --text:#1A1714;--text-2:#6B6560;--text-3:#9B9591;
    --accent:#059669;--accent-light:#ECFDF5;--accent-mid:#A7F3D0;--accent-dark:#065F46;
  }
  *,*::before,*::after{font-family:'Geist',sans-serif;box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:99px}
  .serif{font-family:'Instrument Serif',Georgia,serif}
  .fi{width:100%;background:var(--surface);border:1.5px solid var(--border);border-radius:12px;
    padding:11px 14px;font-size:14px;color:var(--text);transition:border-color .2s,box-shadow .2s;
    outline:none;-webkit-appearance:none}
  .fi::placeholder{color:var(--text-3)}
  .fi:hover:not(:disabled){border-color:var(--border-strong)}
  .fi:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(5,150,105,.12)}
  .fi:disabled,.fi[readonly]{background:var(--surface-2);color:var(--text-3);cursor:not-allowed}
  select.fi{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239B9591' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 12px center;padding-right:36px;cursor:pointer}
  textarea.fi{resize:none;line-height:1.6}
  .tr-hover{transition:background .15s;cursor:pointer}
  .tr-hover:hover{background:#F7F5F1}
  .stat-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:600;letter-spacing:.04em}
  .btn-primary{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;border-radius:12px;
    background:var(--accent);color:#fff;font-size:14px;font-weight:600;border:none;cursor:pointer;
    transition:background .18s,box-shadow .18s,transform .12s;box-shadow:0 2px 8px rgba(5,150,105,.25)}
  .btn-primary:hover{background:#047857;box-shadow:0 6px 20px rgba(5,150,105,.32);transform:translateY(-1px)}
  .btn-primary:active{transform:translateY(0)}
  .btn-primary:disabled{opacity:.45;cursor:not-allowed;transform:none}
  .btn-danger{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;border-radius:12px;
    background:#DC2626;color:#fff;font-size:14px;font-weight:600;border:none;cursor:pointer;
    transition:all .18s;box-shadow:0 2px 8px rgba(220,38,38,.2)}
  .btn-danger:hover{background:#B91C1C;transform:translateY(-1px)}
  .btn-danger:disabled{opacity:.4;cursor:not-allowed;transform:none}
  .btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:11px;
    background:transparent;color:var(--text-2);font-size:13px;font-weight:500;
    border:1.5px solid var(--border);cursor:pointer;transition:all .18s}
  .btn-ghost:hover{border-color:var(--border-strong);color:var(--text);background:var(--surface-2)}
  .btn-ghost:disabled{opacity:.4;cursor:not-allowed}
  .btn-locked{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:11px;
    background:var(--surface-2);color:var(--text-3);font-size:13px;font-weight:500;
    border:1.5px solid var(--border);cursor:not-allowed;opacity:.55}
  .btn-icon{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;
    border-radius:10px;border:1.5px solid var(--border);background:var(--surface);cursor:pointer;
    transition:all .15s;color:var(--text-2)}
  .btn-icon:hover{border-color:var(--border-strong);background:var(--surface-2);color:var(--text)}
  .btn-icon.edit:hover{border-color:#BAE6FD;background:#EFF6FF;color:#0369A1}
  .btn-icon.del:hover{border-color:#FCA5A5;background:#FEF2F2;color:#DC2626}
  .btn-icon:disabled{opacity:.3;cursor:not-allowed}
  .step-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;font-size:12px;font-weight:700;transition:all .3s;flex-shrink:0}
  .step-dot.done{background:var(--accent);color:#fff}
  .step-dot.active{background:var(--text);color:#fff}
  .step-dot.idle{background:var(--border);color:var(--text-3)}
  .modal-overlay{position:fixed;inset:0;z-index:60;background:rgba(26,23,20,.45);backdrop-filter:blur(6px)}
  .tab-btn{padding:8px 14px;border-radius:10px;font-size:12px;font-weight:600;
    border:none;cursor:pointer;transition:all .18s;color:var(--text-3);background:transparent}
  .tab-btn.active{background:var(--surface);color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .tag-green{background:#ECFDF5;color:#065F46;border:1px solid #A7F3D0}
  .tag-red{background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5}
  .tag-amber{background:#FFFBEB;color:#92400E;border:1px solid #FDE68A}
  .tag-orange{background:#FFF7ED;color:#9A3412;border:1px solid #FDBA74}
  .tag-stone{background:var(--surface-2);color:var(--text-2);border:1px solid var(--border)}
  .tag-blue{background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE}
  @keyframes spin{to{transform:rotate(360deg)}}
  .spin{animation:spin .7s linear infinite}
  @keyframes sk{0%,100%{opacity:1}50%{opacity:.4}}
  .sk{background:var(--border);border-radius:8px;animation:sk 1.6s ease infinite}
  .progress-bar{height:6px;border-radius:99px;overflow:hidden;background:var(--border)}
  .progress-fill{height:100%;border-radius:99px}
`;

/* ─────────────────────────────────────────────────────────────────────────────
   UTILS
───────────────────────────────────────────────────────────────────────────── */
const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";
const fmtDT = (d?: string | null) => d ? new Date(d).toLocaleString("fr-FR") : "—";
const fmtP = (v?: number | string) =>
  v !== undefined && v !== "" && !isNaN(Number(v)) ? Number(v).toLocaleString("fr-FR") : "—";

const MVT_TYPE: Record<string, { label: string; color: string }> = {
  IN:         { label: "Entrée",     color: "#059669" },
  OUT:        { label: "Sortie",     color: "#2563EB" },
  LOSS:       { label: "Perte",      color: "#DC2626" },
  EXPIRED:    { label: "Péremption", color: "#D97706" },
  ADJUSTMENT: { label: "Ajustement", color: "#7C3AED" },
};

function useNotify() {
  const [notif, setNotif] = useState<Notif | null>(null);
  const [show, setShow]   = useState(false);
  const notify = (type: NotifType, message: string) => setNotif({ type, message });
  useEffect(() => {
    if (!notif) return;
    setShow(true);
    const t = setTimeout(() => { setShow(false); setTimeout(() => setNotif(null), 300); }, 3800);
    return () => clearTimeout(t);
  }, [notif]);
  return { notif, show, notify };
}

/* ─────────────────────────────────────────────────────────────────────────────
   MICRO-COMPONENTS
───────────────────────────────────────────────────────────────────────────── */
function Fonts(): null {
  useEffect(() => {
    if (document.getElementById("ef-en")) return;
    const s = document.createElement("style"); s.id = "ef-en"; s.textContent = FONTS;
    document.head.appendChild(s);
  }, []);
  return null;
}

function Toast({ show, notif }: { show: boolean; notif: Notif | null }): JSX.Element {
  const I = { success: <CheckCircle2 size={15} />, error: <XCircle size={15} />, warning: <AlertCircle size={15} /> };
  const C = { success: "border-emerald-200 bg-emerald-50 text-emerald-800", error: "border-red-200 bg-red-50 text-red-800", warning: "border-amber-200 bg-amber-50 text-amber-800" };
  return (
    <AnimatePresence>
      {show && notif && (
        <motion.div initial={{ opacity: 0, y: -24, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: .94 }} transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className={`fixed top-4 right-4 z-[80] flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl max-w-sm ${C[notif.type]}`}>
          {I[notif.type]}<span className="leading-snug">{notif.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Tag({ label, color = "stone" }: { label: string | number; color?: TagColor }): JSX.Element {
  return <span className={`stat-pill tag-${color}`}>{label}</span>;
}

function FieldLabel({ label, icon: Icon, required, error, hint, children }: {
  label: string; icon?: React.ElementType; required?: boolean;
  error?: string; hint?: string; children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon size={12} style={{ color: "#0b0c0ec0" }} />}
        <span className="text-[13px] font-semibold tracking-[.06em] uppercase" style={{ color: "#0b0c0ec0" }}>
          {label}{required && <span style={{ color: "var(--accent)" }}> *</span>}
        </span>
      </div>
      {children}
      {hint && !error && <p className="mt-1 text-[13px]" style={{ color: "#0b0c0ec0" }}>{hint}</p>}
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 text-sm font-medium flex items-center gap-1" style={{ color: "#dc2626" }}>
          <AlertCircle size={11} />{error}
        </motion.p>
      )}
    </div>
  );
}

function SectionLabel({ icon: Icon, text }: { icon: React.ElementType; text: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <Icon size={11} style={{ color: "#0b0c0ec0" }} />
      <span className="text-[12px] font-semibold tracking-[0.24em] uppercase" style={{ color: "#0b0c0ec0" }}>{text}</span>
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}

function AnimRow({ children, delay = 0, onClick }: { children: React.ReactNode; delay?: number; onClick?: () => void }): JSX.Element {
  const ref    = useRef<HTMLTableRowElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20px 0px" });
  return (
    <motion.tr ref={ref} initial={{ opacity: 0, y: 8 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: .32, ease: [.25, .46, .45, .94] }}
      className="border-b tr-hover" style={{ borderColor: "var(--border)" }} onClick={onClick}>
      {children}
    </motion.tr>
  );
}

function AccessDenied({ permission }: { permission: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "#FEF2F2" }}>
        <Lock size={28} style={{ color: "#F87171" }} />
      </div>
      <div>
        <p className="text-lg font-bold" style={{ color: "var(--text)" }}>Accès refusé</p>
        <p className="text-sm mt-1" style={{ color: "#0b0c0ec0" }}>
          Il vous faut la permission{" "}
          <code className="text-sm font-mono rounded px-1.5 py-0.5"
            style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>{permission}</code>
        </p>
      </div>
    </div>
  );
}

/* Modal wrapper générique */
function Modal({ open, onClose, width = "max-w-2xl", children }: {
  open: boolean; onClose: () => void; width?: string; children: React.ReactNode;
}): JSX.Element {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center sm:px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className={`pointer-events-auto relative w-full ${width} flex flex-col`}
              style={{
                background: "var(--surface)", border: "1.5px solid var(--border)",
                borderRadius: "24px 24px 0 0", maxHeight: "92dvh",
                boxShadow: "0 -24px 80px -8px rgba(26,23,20,.22)",
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="sm:hidden flex justify-center pt-3 pb-0.5 flex-shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
              </div>
              <div className="overflow-y-auto flex-1 flex flex-col" style={{ borderRadius: "0 0 24px 24px" }}>
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STEP BAR
───────────────────────────────────────────────────────────────────────────── */
function StepBar({ step }: { step: number }): JSX.Element {
  const steps = [{ n: 1, label: "Produit & Lot" }, { n: 2, label: "Quantité & Prix" }];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const state = step > s.n ? "done" : step === s.n ? "active" : "idle";
        return (
          <div key={s.n} className="flex items-center gap-0">
            <div className="flex items-center gap-2">
              <motion.div className={`step-dot ${state}`} animate={{ scale: state === "active" ? 1.08 : 1 }} transition={{ duration: .2 }}>
                {state === "done" ? <Check size={13} /> : s.n}
              </motion.div>
              <span className={`text-sm font-medium hidden sm:block ${state === "active" ? "" : "opacity-50"}`} style={{ color: "var(--text)" }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-3 h-px w-8 sm:w-14" style={{ background: step > s.n ? "var(--accent)" : "var(--border)", transition: "background .3s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRODUCT INFO CARD (create modal)
───────────────────────────────────────────────────────────────────────────── */
function ProductInfoCard({ product, qty }: { product: Product; qty: number }): JSX.Element {
  const pct = (product.minimum_stock ?? 0) > 0 ? Math.min((qty / (product.minimum_stock as number)) * 100, 200) : 100;
  const c   = qty === 0 ? "#dc2626" : qty < (product.minimum_stock ?? 0) ? "#d97706" : "#059669";
  const r   = 18; const circ = 2 * Math.PI * r; const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }} transition={{ duration: .3 }} className="overflow-hidden mb-4">
      <div className="rounded-2xl border p-4" style={{ background: "var(--accent-light)", borderColor: "var(--accent-mid)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "var(--accent-dark)" }}>{product.name}</p>
            <p className="text-sm mt-0.5" style={{ color: "var(--accent)" }}>
              {product.unit?.abbreviation || product.unit?.name || "u"} — {product.category?.name || ""}
            </p>
            {product.is_perishable && (
              <span className="inline-flex items-center gap-1 mt-1.5 text-[13px] font-semibold" style={{ color: "#b45309" }}>
                <AlertCircle size={10} />Produit périssable
              </span>
            )}
          </div>
          <div className="flex flex-col items-center shrink-0">
            <svg width={40} height={40} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={20} cy={20} r={r} fill="none" stroke="var(--border)" strokeWidth={3} />
              <motion.circle cx={20} cy={20} r={r} fill="none" stroke={c} strokeWidth={3} strokeLinecap="round"
                strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: circ - dash }} transition={{ duration: 1, ease: [.16, 1, .3, 1], delay: .2 }} />
            </svg>
            <span className="text-sm font-bold serif" style={{ color: c }}>{qty}</span>
            <span className="text-[12px]" style={{ color: "#0b0c0ec0" }}>en stock</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CREATE MODAL
───────────────────────────────────────────────────────────────────────────── */
const EMPTY_CF: CreateForm = {
  product_id: "", batch_number: "",
  entry_date: new Date().toISOString().split("T")[0],
  expiration_date: "", quantity: "", purchase_price: "", notes: "",
};

function CreateModal({ show, onClose, products, units, token, onSuccess, notify, canCreate }: {
  show: boolean; onClose: () => void; products: Product[]; units: Unit[];
  token: string | null; onSuccess: () => void;
  notify: (t: NotifType, m: string) => void; canCreate: boolean;
}): JSX.Element {
  const [step, setStep]          = useState(1);
  const [selProd, setSelProd]    = useState<Product | null>(null);
  const [availQty, setAvailQty]  = useState(0);
  const [busy, setBusy]          = useState(false);
  const [errs, setErrs]          = useState<CreateErrors>({});
  const [fd, setFd]              = useState<CreateForm>(EMPTY_CF);
  const set = (k: keyof CreateForm, v: string) => { setFd(p => ({ ...p, [k]: v })); setErrs(p => ({ ...p, [k]: "" })); };

  useEffect(() => {
    if (!show) setTimeout(() => { setStep(1); setSelProd(null); setAvailQty(0); setErrs({}); setFd({ ...EMPTY_CF, entry_date: new Date().toISOString().split("T")[0] }); }, 350);
  }, [show]);

  useEffect(() => {
    if (!fd.product_id) { setSelProd(null); setAvailQty(0); return; }
    const p = products.find(x => String(x.id) === String(fd.product_id));
    setSelProd(p ?? null);
    fetch(`/api/stock/quantity?product_id=${fd.product_id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then((d: any) => setAvailQty(d?.data?.quantity ?? 0)).catch(() => {});
    if (fd.entry_date && p) genBatch(fd.product_id, fd.entry_date, p);
  }, [fd.product_id]); // eslint-disable-line

  useEffect(() => {
    if (fd.product_id && fd.entry_date && selProd) genBatch(fd.product_id, fd.entry_date, selProd);
  }, [fd.entry_date]); // eslint-disable-line

  const genBatch = async (pid: string, date: string, prod: Product) => {
    const prefix = prod.name.replace(/[^A-Z0-9]/gi, "-").toUpperCase();
    const dp     = date.replace(/-/g, "");
    try {
      const r   = await fetch(`/api/stock/batch-seq?product_id=${pid}&date=${date}`, { headers: { Authorization: `Bearer ${token}` } });
      const seq: number = r.ok ? ((await r.json() as any)?.lastSeq ?? 0) + 1 : 1;
      setFd(p => ({ ...p, batch_number: `${prefix}-${dp}-${String(seq).padStart(3, "0")}` }));
    } catch { setFd(p => ({ ...p, batch_number: `${prefix}-${dp}-001` })); }
  };

  const val1 = () => {
    const e: CreateErrors = {};
    if (!fd.product_id)   e.product_id   = "Sélectionnez un produit";
    if (!fd.entry_date)   e.entry_date   = "Date requise";
    if (!fd.batch_number) e.batch_number = "Lot requis";
    if (selProd?.is_perishable && !fd.expiration_date) e.expiration_date = "Obligatoire pour produit périssable";
    setErrs(e); return Object.keys(e).length === 0;
  };
  const val2 = () => {
    const e: CreateErrors = {};
    if (!fd.quantity || parseFloat(fd.quantity) <= 0) e.quantity = "Quantité invalide (> 0)";
    if (fd.purchase_price === "" || parseFloat(fd.purchase_price) < 0) e.purchase_price = "Prix invalide";
    setErrs(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!canCreate) { notify("error", "Permission STOCK_CREATE requise"); return; }
    if (!val2()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/stock/add", { method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          product_id: parseInt(fd.product_id, 10), batch_number: fd.batch_number,
          quantity_initial: parseFloat(fd.quantity), purchase_price: parseFloat(fd.purchase_price),
          entry_date: new Date(fd.entry_date),
          expiration_date: fd.expiration_date ? new Date(fd.expiration_date) : null,
          notes: fd.notes,
        }),
      });
      if (res.ok) { notify("success", "Entrée enregistrée !"); onClose(); onSuccess(); }
      else { const d = await res.json() as any; notify("error", d.error ?? "Erreur lors de l'enregistrement"); }
    } catch { notify("error", "Erreur réseau"); } finally { setBusy(false); }
  };

  const total = fd.quantity && fd.purchase_price ? parseFloat(fd.quantity || "0") * parseFloat(fd.purchase_price || "0") : 0;
  const ro    = !canCreate;

  return (
    <Modal open={show} onClose={onClose} width="max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: "1.5px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: canCreate ? "var(--accent-light)" : "#F1F5F9" }}>
            {canCreate ? <PackagePlus size={16} style={{ color: "var(--accent)" }} /> : <Lock size={16} style={{ color: "#94A3B8" }} />}
          </div>
          <div>
            <p className="text-[12px] font-semibold tracking-[.18em] uppercase" style={{ color: "#0b0c0ec0" }}>Stock</p>
            <h2 className="text-xl font-normal" style={{ color: "var(--text)" }}>Nouvelle entrée</h2>
          </div>
        </div>
        <button onClick={onClose} className="btn-icon"><X size={14} /></button>
      </div>
      {/* Step bar */}
      <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: "1.5px solid var(--border)", background: "var(--bg)" }}>
        <StepBar step={step} />
      </div>
      {/* Body */}
      <div className="overflow-y-auto flex-1 px-6 py-6">
        {ro && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-semibold"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}>
            <Lock size={13} />Mode lecture seule — permission STOCK_CREATE requise
          </div>
        )}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: .25 }} className="space-y-5">
              <FieldLabel label="Produit" icon={Layers} required={!ro} error={errs.product_id}>
                <select className="fi" value={fd.product_id} disabled={ro} onChange={e => set("product_id", e.target.value)}>
                  <option value="">Choisir un produit…</option>
                  {products.map(p => { const u = p.unit || units.find(x => x.id === p.unit_id); return <option key={p.id} value={p.id}>{p.name} ({u?.abbreviation || u?.name || "u"})</option>; })}
                </select>
              </FieldLabel>
              <AnimatePresence>{selProd && <ProductInfoCard product={selProd} qty={availQty} />}</AnimatePresence>
              <div className="grid grid-cols-2 gap-3">
                <FieldLabel label="Date d'entrée" icon={Calendar} required={!ro} error={errs.entry_date}>
                  <input type="date" className="fi" value={fd.entry_date} disabled={ro} onChange={e => set("entry_date", e.target.value)} />
                </FieldLabel>
                <FieldLabel label="Péremption" icon={Calendar} required={!ro && !!selProd?.is_perishable} error={errs.expiration_date}>
                  <input type="date" className="fi" value={fd.expiration_date} disabled={ro} min={fd.entry_date || undefined} onChange={e => set("expiration_date", e.target.value)} />
                </FieldLabel>
              </div>
              <FieldLabel label="Numéro de lot" icon={ScanLine} required={!ro} error={errs.batch_number}>
                <div className="relative">
                  <input className="fi" style={{ paddingRight: fd.product_id ? "108px" : "14px" }} value={fd.batch_number} readOnly placeholder="Ex: POULET-20260301-001" />
                  {fd.product_id && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold flex items-center gap-1" style={{ color: "var(--accent)" }}><Sparkles size={10} />Auto-généré</span>}
                </div>
              </FieldLabel>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: .25 }} className="space-y-5">
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "var(--accent-light)", border: "1px solid var(--accent-mid)" }}>
                <PackagePlus size={15} style={{ color: "var(--accent)" }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--accent-dark)" }}>{selProd?.name}</p>
                  <p className="text-[13px]" style={{ color: "var(--accent)" }}>Lot : {fd.batch_number}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldLabel label="Quantité" icon={Layers} required={!ro} error={errs.quantity}>
                  <div className="relative">
                    <input type="number" step="0.01" min="0.01" className="fi" style={{ paddingRight: selProd ? "52px" : "14px" }} placeholder="0" value={fd.quantity} disabled={ro} onChange={e => set("quantity", e.target.value)} />
                    {selProd && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold" style={{ color: "#0b0c0ec0" }}>{selProd.unit?.abbreviation || "u"}</span>}
                  </div>
                </FieldLabel>
                <FieldLabel label="Prix unitaire" icon={DollarSign} required={!ro} error={errs.purchase_price}>
                  <div className="relative">
                    <input type="number" step="0.01" min="0" className="fi" style={{ paddingRight: "50px" }} placeholder="0" value={fd.purchase_price} disabled={ro} onChange={e => set("purchase_price", e.target.value)} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold" style={{ color: "#0b0c0ec0" }}>FCFA</span>
                  </div>
                </FieldLabel>
              </div>
              {!ro && fd.quantity && fd.purchase_price && total > 0 && (
                <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-between rounded-2xl px-5 py-4" style={{ background: "var(--bg)", border: "1.5px solid var(--border)" }}>
                  <span className="text-sm" style={{ color: "var(--text-2)" }}>Valeur totale du lot</span>
                  <span className="text-xl font-medium" style={{ color: "var(--text)" }}>{total.toLocaleString("fr-FR")} FCFA</span>
                </motion.div>
              )}
              <FieldLabel label="Notes" icon={FileText}>
                <textarea className="fi" rows={3} placeholder="Fournisseur, observations…" value={fd.notes} disabled={ro} onChange={e => set("notes", e.target.value)} />
              </FieldLabel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 gap-3 flex-shrink-0" style={{ borderTop: "1.5px solid var(--border)", background: "var(--bg)" }}>
        {step === 1 ? <button className="btn-ghost" onClick={onClose}>Annuler</button> : <button className="btn-ghost" onClick={() => setStep(1)}><ChevronLeft size={14} />Retour</button>}
        {step === 1 && <button className="btn-primary" onClick={() => { if (val1()) setStep(2); }}>Suivant<ChevronRight size={14} /></button>}
        {step === 2 && canCreate && <button className="btn-primary" onClick={handleSubmit} disabled={busy}>{busy ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full spin" />Enregistrement…</> : <><Check size={14} />Confirmer l'entrée</>}</button>}
        {step === 2 && !canCreate && <button className="btn-locked" disabled><Lock size={13} />Non autorisé</button>}
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DETAIL MODAL — 4 onglets : Infos | Modifier | Mouvements | Supprimer
───────────────────────────────────────────────────────────────────────────── */
function DetailModal({ batchId, token, canEdit, canDelete, onClose, onRefresh, notify }: {
  batchId: number | null; token: string | null; canEdit: boolean; canDelete: boolean;
  onClose: () => void; onRefresh: () => void; notify: (t: NotifType, m: string) => void;
}): JSX.Element {
  type TabId = "info" | "edit" | "mvt" | "delete";
  const [tab,        setTab]     = useState<TabId>("info");
  const [detail,     setDetail]  = useState<{ batch: BatchDetail; meta: BatchMeta } | null>(null);
  const [loadingD,   setLoadD]   = useState(false);
  const [editBusy,   setEditB]   = useState(false);
  const [delBusy,    setDelB]    = useState(false);
  const [confirm,    setConfirm] = useState("");
  const [ef,         setEf]      = useState<EditForm>({ purchase_price: "", expiration_date: "", notes: "", quantity_initial: "" });
  const [errs,       setErrs]    = useState<EditErrors>({});

  const setE = (k: keyof EditForm, v: string) => { setEf(p => ({ ...p, [k]: v })); setErrs(p => ({ ...p, [k]: "" })); };

  /* Fetch détail quand le batchId change */
  useEffect(() => {
    if (!batchId) { setDetail(null); setTab("info"); setConfirm(""); return; }
    setLoadD(true);
    fetch(`/api/stock/entries/${batchId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: any) => {
        if (d?.data) {
          setDetail(d.data);
          const b = d.data.batch as BatchDetail;
          setEf({
            purchase_price:  String(b.purchase_price),
            expiration_date: b.expiration_date ? b.expiration_date.split("T")[0] : "",
            notes:           b.notes ?? "",
            quantity_initial:String(b.quantity_initial),
          });
        }
      })
      .catch(() => notify("error", "Impossible de charger le détail"))
      .finally(() => setLoadD(false));
  }, [batchId]); // eslint-disable-line

  const validate = (): boolean => {
    if (!detail) return false;
    const b = detail.batch;
    const e: EditErrors = {};
    const price = parseFloat(ef.purchase_price);
    if (isNaN(price) || price < 0) e.purchase_price = "Prix ≥ 0 requis";
    if (ef.expiration_date) {
      const exp = new Date(ef.expiration_date);
      if (isNaN(exp.getTime())) e.expiration_date = "Date invalide";
      else if (exp < new Date(b.entry_date)) e.expiration_date = "Doit être ≥ à la date d'entrée";
    }
    if (ef.quantity_initial !== String(b.quantity_initial)) {
      const qi = parseFloat(ef.quantity_initial);
      if (isNaN(qi) || qi <= 0) e.quantity_initial = "Quantité > 0";
      else if (detail.meta.hasMovements) e.quantity_initial = "Des mouvements existent — non modifiable";
      else if (qi < Number(b.quantity_remaining)) e.quantity_initial = "Ne peut pas être < quantité restante";
    }
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const handleEdit = async () => {
    if (!detail || !validate()) return;
    setEditB(true);
    try {
      const b    = detail.batch;
      const body: Record<string, unknown> = {
        purchase_price:  parseFloat(ef.purchase_price),
        expiration_date: ef.expiration_date || null,
        notes:           ef.notes,
      };
      if (ef.quantity_initial !== String(b.quantity_initial) && !detail.meta.hasMovements)
        body.quantity_initial = parseFloat(ef.quantity_initial);

      const res = await fetch(`/api/stock/entries/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });
      if (res.ok) {
        notify("success", "Lot mis à jour !");
        onRefresh();
        /* Re-fetch le détail */
        const fresh = await fetch(`/api/stock/entries/${b.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const fd    = await fresh.json() as any;
        if (fd?.data) setDetail(fd.data);
        setTab("info");
      } else {
        const d = await res.json() as any;
        if (d.fields) setErrs(d.fields);
        else notify("error", d.error ?? "Erreur lors de la modification");
      }
    } catch { notify("error", "Erreur réseau"); } finally { setEditB(false); }
  };

  const handleDelete = async () => {
    if (!detail) return;
    if (confirm !== detail.batch.batch_number) { notify("warning", "Saisissez le numéro de lot exact"); return; }
    setDelB(true);
    try {
      const res = await fetch(`/api/stock/entries/${detail.batch.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { notify("success", "Lot supprimé"); onRefresh(); onClose(); }
      else { const d = await res.json() as any; notify("error", d.reason ?? d.error ?? "Suppression impossible"); }
    } catch { notify("error", "Erreur réseau"); } finally { setDelB(false); }
  };

  const b    = detail?.batch;
  const meta = detail?.meta;
  const pct  = b ? Math.round((Number(b.quantity_remaining) / Number(b.quantity_initial)) * 100) : 0;
  const pc   = pct < 20 ? "#dc2626" : pct < 50 ? "#d97706" : "#059669";

  /* Onglets affichés selon RBAC */
  const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode; show: boolean }> = [
    { id: "info",   label: "Infos",      icon: <Eye       size={13} />, show: true },
    { id: "edit",   label: "Modifier",   icon: <Pencil    size={13} />, show: canEdit },
    { id: "mvt",    label: "Mouvements", icon: <BarChart3 size={13} />, show: true },
    { id: "delete", label: "Supprimer",  icon: <Trash2    size={13} />, show: canDelete },
  ];

  return (
    <Modal open={batchId !== null} onClose={onClose} width="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: "1.5px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-light)" }}>
            <Package size={16} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <p className="text-[12px] font-semibold tracking-[.18em] uppercase" style={{ color: "#0b0c0ec0" }}>Lot de stock</p>
            <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
              {loadingD ? "Chargement…" : (b?.batch_number ?? "—")}
            </h2>
          </div>
        </div>
        <button onClick={onClose} className="btn-icon"><X size={14} /></button>
      </div>

      {/* Tab bar */}
      <div className="px-4 py-2.5 flex items-center gap-1 flex-shrink-0" style={{ borderBottom: "1.5px solid var(--border)", background: "var(--bg)" }}>
        {TABS.filter(t => t.show).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab-btn flex items-center gap-1.5 ${tab === t.id ? "active" : ""}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 px-6 py-6">
        {loadingD ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="sk h-12 rounded-xl" />)}</div>
        ) : (
          <AnimatePresence mode="wait">

            {/* ── ONGLET INFO ── */}
            {tab === "info" && b && (
              <motion.div key="info" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-5">
                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Qté initiale",  value: Number(b.quantity_initial),                   color: "var(--text)"    },
                    { label: "Qté restante",  value: Number(b.quantity_remaining),                  color: pc              },
                    { label: "Consommé",      value: `${meta?.totalOut ?? 0} (${meta?.consumptionPct ?? 0}%)`, color: "var(--text-2)" },
                    { label: "Prix/unité",    value: `${fmtP(b.purchase_price)} F`,               color: "var(--accent)"  },
                  ].map((k, i) => (
                    <div key={i} className="rounded-2xl p-3.5" style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}>
                      <p className="text-[12px] uppercase font-semibold tracking-wider mb-1" style={{ color: "#0b0c0ec0" }}>{k.label}</p>
                      <p className="text-lg font-bold serif" style={{ color: k.color }}>{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* Barre consommation */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold" style={{ color: "#0b0c0ec0" }}>Consommation du lot</span>
                    <span className="text-sm font-bold" style={{ color: pc }}>{100 - (meta?.consumptionPct ?? 0)}% restant</span>
                  </div>
                  <div className="progress-bar">
                    <motion.div className="progress-fill" style={{ background: pc }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: .9, ease: [.16, 1, .3, 1], delay: .1 }} />
                  </div>
                </div>

                {/* Infos produit */}
                <div className="rounded-2xl p-4" style={{ background: "var(--accent-light)", border: "1px solid var(--accent-mid)" }}>
                  <p className="text-[12px] uppercase font-semibold tracking-wider mb-2" style={{ color: "var(--accent)" }}>Produit</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {[
                      { label: "Nom",          value: b.product?.name ?? "—" },
                      { label: "Catégorie",    value: b.product?.category?.name ?? "—" },
                      { label: "Unité",        value: b.product?.unit?.name ?? "—" },
                      { label: "Fournisseur",  value: b.product?.supplier?.name ?? "—" },
                    ].map((row, i) => (
                      <div key={i}>
                        <span className="text-sm" style={{ color: "#0b0c0ec0" }}>{row.label}</span>
                        <p className="font-semibold" style={{ color: "var(--accent-dark)" }}>{row.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grille détails */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "N° de lot",          value: b.batch_number,                                             icon: <Hash       size={13} /> },
                    { label: "Date d'entrée",       value: fmt(b.entry_date),                                         icon: <Calendar   size={13} /> },
                    { label: "Date de péremption",  value: b.expiration_date ? fmt(b.expiration_date) : "Non applicable", icon: <Clock size={13} /> },
                    { label: "Valeur totale lot",   value: `${fmtP(Number(b.purchase_price) * Number(b.quantity_initial))} FCFA`, icon: <DollarSign size={13} /> },
                    { label: "Créé par",            value: b.user?.fullName ?? "—",                                   icon: <User       size={13} /> },
                    { label: "Dernière modif.",     value: fmtDT(b.updated_at),                                       icon: <Clock      size={13} /> },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                      <span style={{ color: "#0b0c0ec0", marginTop: 2 }}>{item.icon}</span>
                      <div>
                        <p className="text-[12px] uppercase font-semibold tracking-wider" style={{ color: "#0b0c0ec0" }}>{item.label}</p>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text)" }}>{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {b.notes && (
                  <div className="rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <p className="text-[12px] uppercase font-semibold tracking-wider mb-1.5" style={{ color: "#0b0c0ec0" }}>Notes</p>
                    <p className="text-sm" style={{ color: "var(--text-2)" }}>{b.notes}</p>
                  </div>
                )}

                {/* Actions rapides */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {canEdit && (
                    <button className="btn-ghost" onClick={() => setTab("edit")}><Pencil size={13} />Modifier ce lot</button>
                  )}
                  {canDelete && meta?.canDelete && (
                    <button className="btn-ghost" style={{ color: "#DC2626", borderColor: "#FCA5A5" }} onClick={() => setTab("delete")}>
                      <Trash2 size={13} />Supprimer
                    </button>
                  )}
                  {canDelete && !meta?.canDelete && (
                    <div className="text-sm flex items-center gap-1.5 px-3 py-2 rounded-xl"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "#0b0c0ec0" }}>
                      <AlertTriangle size={12} />Suppression impossible — mouvements enregistrés
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── ONGLET MODIFIER ── */}
            {tab === "edit" && b && (
              <motion.div key="edit" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#EFF6FF" }}>
                    <Pencil size={15} style={{ color: "#0369A1" }} />
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: "var(--text)" }}>Modifier le lot</h3>
                    <p className="text-sm" style={{ color: "#0b0c0ec0" }}>Lot : {b.batch_number}</p>
                  </div>
                </div>

                {/* Avertissement si mouvements */}
                {meta?.hasMovements && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm"
                    style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}>
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Lot partiellement consommé</p>
                      <p className="text-sm mt-0.5">La quantité initiale ne peut plus être modifiée car des mouvements ont déjà été enregistrés. Seuls le prix, la date de péremption et les notes sont éditables.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Prix */}
                  <FieldLabel label="Prix d'achat unitaire" icon={DollarSign} required error={errs.purchase_price}>
                    <div className="relative">
                      <input type="number" step="0.01" min="0" className="fi" style={{ paddingRight: "50px" }}
                        value={ef.purchase_price} onChange={e => setE("purchase_price", e.target.value)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold" style={{ color: "#0b0c0ec0" }}>FCFA</span>
                    </div>
                  </FieldLabel>

                  {/* Quantité initiale — disabled si mouvements */}
                  <FieldLabel label="Quantité initiale" icon={Layers} error={errs.quantity_initial}
                    hint={meta?.hasMovements ? "Non modifiable — mouvements enregistrés" : undefined}>
                    <div className="relative">
                      <input type="number" step="0.01" min="0.01" className="fi" style={{ paddingRight: "52px" }}
                        value={ef.quantity_initial} disabled={!!meta?.hasMovements}
                        onChange={e => setE("quantity_initial", e.target.value)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold" style={{ color: "#0b0c0ec0" }}>
                        {b.product?.unit?.abbreviation || "u"}
                      </span>
                    </div>
                  </FieldLabel>
                </div>

                {/* Date péremption */}
                <FieldLabel label="Date de péremption" icon={Calendar} error={errs.expiration_date}>
                  <input type="date" className="fi" value={ef.expiration_date}
                    min={b.entry_date.split("T")[0]} onChange={e => setE("expiration_date", e.target.value)} />
                </FieldLabel>

                {/* Notes */}
                <FieldLabel label="Notes" icon={FileText}>
                  <textarea className="fi" rows={3} placeholder="Fournisseur, observations…"
                    value={ef.notes} onChange={e => setE("notes", e.target.value)} />
                </FieldLabel>

                {/* Résumé changements */}
                {(ef.purchase_price !== String(b.purchase_price) ||
                  ef.expiration_date !== (b.expiration_date?.split("T")[0] ?? "") ||
                  ef.notes !== (b.notes ?? "") ||
                  (!meta?.hasMovements && ef.quantity_initial !== String(b.quantity_initial))) && (
                  <div className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: "var(--accent-light)", border: "1px solid var(--accent-mid)", color: "var(--accent-dark)" }}>
                    <p className="font-semibold mb-1">Modifications en attente :</p>
                    {ef.purchase_price !== String(b.purchase_price) && <p>· Prix : {fmtP(b.purchase_price)} → {fmtP(ef.purchase_price)} FCFA</p>}
                    {ef.expiration_date !== (b.expiration_date?.split("T")[0] ?? "") && <p>· Péremption : {fmt(b.expiration_date)} → {fmt(ef.expiration_date)}</p>}
                    {ef.notes !== (b.notes ?? "") && <p>· Notes modifiées</p>}
                    {!meta?.hasMovements && ef.quantity_initial !== String(b.quantity_initial) && <p>· Quantité : {Number(b.quantity_initial)} → {ef.quantity_initial}</p>}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button className="btn-ghost flex-1" onClick={() => setTab("info")}>Annuler</button>
                  <button className="btn-primary flex-1" onClick={handleEdit} disabled={editBusy}>
                    {editBusy ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full spin" />Enregistrement…</> : <><Check size={14} />Enregistrer</>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── ONGLET MOUVEMENTS ── */}
            {tab === "mvt" && b && (
              <motion.div key="mvt" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#F5F3FF" }}>
                    <BarChart3 size={15} style={{ color: "#7C3AED" }} />
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: "var(--text)" }}>Mouvements du lot</h3>
                    <p className="text-sm" style={{ color: "#0b0c0ec0" }}>
                      {b.stock_movements?.length ?? 0} mouvement{(b.stock_movements?.length ?? 0) > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                {(!b.stock_movements || b.stock_movements.length === 0) ? (
                  <div className="text-center py-12" style={{ color: "#0b0c0ec0" }}>
                    <TrendingDown size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucun mouvement enregistré pour ce lot</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {b.stock_movements.map((m, i) => {
                      const mt = MVT_TYPE[m.type] ?? { label: m.type, color: "#6B7280" };
                      return (
                        <motion.div key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                          className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                          <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: mt.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ background: mt.color + "18", color: mt.color }}>{mt.label}</span>
                              <span className="text-sm font-bold serif" style={{ color: "var(--text)" }}>
                                {m.type === "IN" ? "+" : "−"}{Number(m.quantity).toLocaleString("fr-FR")}
                              </span>
                            </div>
                            {m.reason && <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>{m.reason}</p>}
                            {m.reference_number && <p className="text-[13px] mt-0.5 font-mono" style={{ color: "#0b0c0ec0" }}>Réf: {m.reference_number}</p>}
                            <p className="text-[13px] mt-1" style={{ color: "#0b0c0ec0" }}>{fmtDT(m.created_at)}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── ONGLET SUPPRIMER ── */}
            {tab === "delete" && b && (
              <motion.div key="delete" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#FEF2F2" }}>
                    <Trash2 size={15} style={{ color: "#DC2626" }} />
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: "#DC2626" }}>Supprimer le lot</h3>
                </div>

                {/* Bloqué si mouvements */}
                {meta?.hasMovements ? (
                  <div className="rounded-2xl p-5" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={18} style={{ color: "#DC2626", marginTop: 2 }} />
                      <div>
                        <p className="font-bold" style={{ color: "#991B1B" }}>Suppression impossible</p>
                        <p className="text-sm mt-1.5" style={{ color: "#DC2626" }}>
                          Ce lot a <strong>{b.stock_movements?.length}</strong> mouvement{(b.stock_movements?.length ?? 0) > 1 ? "s" : ""} enregistré{(b.stock_movements?.length ?? 0) > 1 ? "s" : ""}. Il ne peut pas être supprimé.
                        </p>
                        <p className="text-sm mt-2" style={{ color: "#DC2626", opacity: .8 }}>
                          Pour archiver ce lot, créez un ajustement ramenant la quantité restante à zéro.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl p-4" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
                      <p className="text-sm font-semibold mb-2" style={{ color: "#991B1B" }}>⚠ Cette action est irréversible</p>
                      <ul className="text-sm space-y-1" style={{ color: "#DC2626" }}>
                        <li>· Lot <strong>{b.batch_number}</strong> sera définitivement supprimé</li>
                        <li>· Quantité : {Number(b.quantity_initial)} {b.product?.unit?.abbreviation || "u"}</li>
                        <li>· Valeur : {fmtP(Number(b.purchase_price) * Number(b.quantity_initial))} FCFA</li>
                      </ul>
                    </div>
                    <FieldLabel label="Tapez le numéro de lot pour confirmer" icon={ScanLine} required>
                      <input className="fi" placeholder={b.batch_number} value={confirm} onChange={e => setConfirm(e.target.value)} />
                      {confirm && confirm !== b.batch_number && (
                        <p className="mt-1.5 text-sm" style={{ color: "#dc2626" }}>Le numéro ne correspond pas</p>
                      )}
                    </FieldLabel>
                    <div className="flex gap-3">
                      <button className="btn-ghost flex-1" onClick={() => { setTab("info"); setConfirm(""); }}>Annuler</button>
                      <button className="btn-danger flex-1" disabled={confirm !== b.batch_number || delBusy} onClick={handleDelete}>
                        {delBusy
                          ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full spin" />Suppression…</>
                          : <><Trash2 size={14} />Supprimer définitivement</>}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE PRINCIPALE
───────────────────────────────────────────────────────────────────────────── */
export default function EntreesPage(): JSX.Element {
  const { token }                       = useAuth();
  const { notif, show, notify }         = useNotify();
  const { can, isLoading: permLoading } = usePagePermissions();

  const canView   = can("STOCK_VIEW");
  const canCreate = can("STOCK_CREATE");
  const canEdit   = can("STOCK_EDIT");
  const canDelete = can("STOCK_DELETE");

  const [products,   setProducts]   = useState<Product[]>([]);
  const [units,      setUnits]      = useState<Unit[]>([]);
  const [users,      setUsers]      = useState<AppUser[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries,    setEntries]    = useState<StockEntry[]>([]);
  const [kitchenReturns, setKitchenReturns] = useState<KitchenReturn[]>([]);
  const [returnsTotal, setReturnsTotal] = useState(0);
  const [returnsPage, setReturnsPage] = useState(1);
  const [returnsError, setReturnsError] = useState("");
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [listError,  setListError]  = useState("");

  const [search,      setSearch]      = useState("");
  const [catF,        setCatF]        = useState("");
  const [prodF,       setProdF]       = useState("");
  const [userF,       setUserF]       = useState("");
  const [dateStart,   setDateStart]   = useState("");
  const [dateEnd,     setDateEnd]     = useState("");
  const [sort,        setSort]        = useState("entry_date");
  const [order,       setOrder]       = useState<SortOrder>("desc");
  const [page,        setPage]        = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 10;
  const returnsPageSize = 10;

  const [showCreate,    setShowCreate]    = useState(false);
  const [detailBatchId, setDetailBatchId] = useState<number | null>(null);

  /* Init */
  useEffect(() => {
    if (!token || !canView) return;
    fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => { if (d?.data) { setProducts(d.data.products ?? []); setUnits(d.data.units ?? []); setCategories(d.data.categories ?? []); } })
      .catch(() => {});
    fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => { if (d) setUsers(d.data?.users ?? d.users ?? []); })
      .catch(() => {});
  }, [token, canView]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setListError("");
    setReturnsError("");
    try {
      const p = new URLSearchParams();
      if (search)    p.append("search",      search);
      if (prodF)     p.append("product_id",  prodF);
      if (catF)      p.append("category_id", catF);
      if (userF)     p.append("user_id",     userF);
      if (dateStart) p.append("startDate",   dateStart);
      if (dateEnd)   p.append("endDate",     dateEnd);
      p.append("sort", sort); p.append("order", order);
      p.append("limit", String(pageSize)); p.append("offset", String((page - 1) * pageSize));
      const res = await fetch(`/api/stock/entries?${p}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error ?? "Impossible de charger les entrées."); }
      const d = await res.json() as any; setEntries(d.data?.entries ?? []); setTotal(d.data?.total ?? 0);
      try {
        const returnParams = new URLSearchParams({ type: "IN", search: "Retour Cuisine", sort: "created_at", order: "desc", limit: String(returnsPageSize), offset: String((returnsPage - 1) * returnsPageSize) });
        const returnRes = await fetch(`/api/stock/movements?${returnParams}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!returnRes.ok) { const errorData = await returnRes.json().catch(() => null); throw new Error(errorData?.error ?? "Impossible de charger les retours Cuisine."); }
        const returnData = await returnRes.json() as any;
        setKitchenReturns(returnData.data?.movements ?? []);
        setReturnsTotal(returnData.data?.total ?? 0);
      } catch (error) {
        setKitchenReturns([]);
        setReturnsTotal(0);
        setReturnsError(error instanceof Error ? error.message : "Erreur réseau lors du chargement des retours.");
      }
    } catch (error) { setEntries([]); setTotal(0); setListError(error instanceof Error ? error.message : "Erreur réseau lors du chargement des entrées."); } finally { setLoading(false); }
  }, [token, search, catF, prodF, userF, dateStart, dateEnd, sort, order, page, returnsPage]); // eslint-disable-line

  useEffect(() => { if (token && canView) fetchEntries(); }, [fetchEntries, canView]);

  const reset        = () => { setSearch(""); setCatF(""); setProdF(""); setUserF(""); setDateStart(""); setDateEnd(""); setPage(1); };
  const toggleSort   = (col: string) => { if (sort === col) setOrder(o => o === "asc" ? "desc" : "asc"); else { setSort(col); setOrder("desc"); } };
  const totalPages   = Math.max(1, Math.ceil(total / pageSize));
  const activeF      = [search, catF, prodF, userF, dateStart, dateEnd].filter(Boolean).length;
  const qColor       = (pct: number): TagColor => pct < 20 ? "red" : pct < 50 ? "amber" : "green";

  const userName = (e: StockEntry): string => {
    if (e.user?.fullName) return e.user.fullName;
    if (e.user_id) {
      const u = users.find(x => String(x.id) === String(e.user_id));
      if (u) return u.fullName;
    }
    return "—";
  };

  const COLS: { label: string; col: string | null; w: string; c?: boolean }[] = [
    { label: "Date",        col: "entry_date",   w: "w-32" },
    { label: "Produit",     col: null,           w: ""              },
    { label: "Qté init.",   col: null,           w: "w-24", c: true },
    { label: "Restant",     col: null,           w: "w-24", c: true },
    { label: "Unité",       col: null,           w: "w-16", c: true },
    { label: "Prix achat",  col: null,           w: "w-28", c: true },
    { label: "Péremption",  col: null,           w: "w-28", c: true },
    { label: "Ajouté par",  col: null,           w: "w-32", c: true },
    { label: "",            col: null,           w: "w-24", c: true },
  ];

  const fetchAllEntries = async (): Promise<StockEntry[]> => {
    try {
      const p = new URLSearchParams();
      if (search) p.append('search', search);
      if (catF) p.append('category_id', catF);
      if (prodF) p.append('product_id', prodF);
      if (userF) p.append('user_id', userF);
      if (dateStart) p.append('startDate', dateStart);
      if (dateEnd) p.append('endDate', dateEnd);
      p.append('sort', sort);
      p.append('order', order);
      p.append('limit', '10000');
      p.append('offset', '0');
      const res = await fetch(`/api/stock/entries?${p}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json() as any;
        return d.data?.entries ?? [];
      }
    } catch { }
    return [];
  };

  const doExportXLSX = async () => {
    try {
            const allEntries = await fetchAllEntries();
      if (allEntries.length === 0) {
        notify('error', 'Aucune donnee a exporter');
        return;
      }
      const res = await fetch('/api/exports/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ format: 'xlsx', items: allEntries }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `entrees-stock-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notify('success', `Export XLSX reussi ! ${allEntries.length} lignes exportees`);
    } catch {
      notify('error', 'Erreur lors de l\'export XLSX');
    }
  };

  const doExportPDF = async () => {
    try {
            const allEntries = await fetchAllEntries();
      if (allEntries.length === 0) {
        notify('error', 'Aucune donnee a exporter');
        return;
      }
      const res = await fetch('/api/exports/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ format: 'pdf', items: allEntries }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `entrees-stock-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notify('success', `Export PDF reussi ! ${allEntries.length} lignes exportees`);
    } catch {
      notify('error', 'Erreur lors de l\'export PDF');
    }
  };

  /* Guard accès */
  if (!permLoading && !canView) return (
    <SidebarLayout><Fonts /><style>{CSS}</style>
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <AccessDenied permission="STOCK_VIEW" />
      </div>
    </SidebarLayout>
  );

  return (
    <SidebarLayout>
      <Fonts />
      <style>{CSS}</style>
      <Toast show={show} notif={notif} />

      <main className="min-h-screen pb-28 p-4 sm:p-6 lg:p-8" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <div className="max-w-7xl mx-auto">

          {/* ── Header ── */}
          <motion.header initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}
            className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[12px] tracking-[.28em] uppercase font-medium mb-2" style={{ color: "#0b0c0ec0" }}>Gestion de stock</p>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">Entrées de stock</h1>
              <p className="mt-1.5 text-sm flex flex-wrap items-center gap-2" style={{ color: "#0b0c0ec0" }}>
                <span>Lots · FIFO · Traçabilité · Péremption</span>
                {total > 0 && <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-semibold" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>{total} enregistrements</span>}
                <span className="ml-auto hidden sm:flex items-center gap-1">
                  {canCreate && <span className="stat-pill tag-green">+ Créer</span>}
                  {canEdit   && <span className="stat-pill tag-blue">✎ Modifier</span>}
                  {canDelete && <span className="stat-pill tag-red">✕ Supprimer</span>}
                </span>
              </p>
            </div>
            {canCreate ? (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .97 }} onClick={() => setShowCreate(true)} className="btn-primary">
                <PackagePlus size={15} />Nouvelle entrée
              </motion.button>
            ) : (
              <button disabled title="Permission STOCK_CREATE requise" className="btn-locked" style={{ padding: "10px 20px", borderRadius: "12px" }}>
                <Lock size={14} />Nouvelle entrée
              </button>
            )}
          </motion.header>

          {/* ── Filtres ── */}
          <SectionLabel icon={Search} text="Filtres & recherche" />
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .05 }}
            className="mb-8 rounded-2xl overflow-hidden" style={{ border: "1.5px solid var(--border)", background: "var(--surface)" }}>
            <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
              <div className="relative flex-1 min-w-[160px]">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#0b0c0ec0" }} />
                <input className="fi" style={{ paddingLeft: "38px" }} placeholder="Produit, numéro de lot…"
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <button className="btn-ghost flex-shrink-0" onClick={() => setShowFilters(v => !v)}>
                <Search size={13} /><span className="hidden sm:inline">Filtres avancés</span>
                {activeF > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: "var(--accent)", color: "#fff" }}>{activeF}</span>}
                <ChevronDown size={13} style={{ transform: showFilters ? "rotate(180deg)" : "", transition: "transform .2s" }} />
              </button>
              <button className="btn-ghost flex-shrink-0" onClick={fetchEntries} disabled={loading}>
                <RefreshCw size={13} className={loading ? "spin" : ""} /><span className="hidden sm:inline">Actualiser</span>
              </button>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
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
            </div>
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: .3 }} className="overflow-hidden">
                  <div className="px-4 sm:px-5 pb-5 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                      <div>
                        <p className="text-[12px] font-semibold tracking-[.1em] uppercase mb-1.5" style={{ color: "#0b0c0ec0" }}>Catégorie</p>
                        <select className="fi" value={catF} onChange={e => { setCatF(e.target.value); setPage(1); }}>
                          <option value="">Toutes catégories</option>
                          {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold tracking-[.1em] uppercase mb-1.5" style={{ color: "#0b0c0ec0" }}>Produit</p>
                        <select className="fi" value={prodF} onChange={e => { setProdF(e.target.value); setPage(1); }}>
                          <option value="">Tous produits</option>
                          {products.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold tracking-[.1em] uppercase mb-1.5" style={{ color: "#0b0c0ec0" }}>Utilisateur</p>
                        <select className="fi" value={userF} onChange={e => { setUserF(e.target.value); setPage(1); }}>
                          <option value="">Tous</option>
                          {users.map(u => <option key={u.id} value={String(u.id)}>{u.fullName}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold tracking-[.1em] uppercase mb-1.5" style={{ color: "#0b0c0ec0" }}>Période</p>
                        <div className="flex items-center gap-1.5">
                          <input type="date" className="fi flex-1 min-w-0" value={dateStart} onChange={e => { setDateStart(e.target.value); setPage(1); }} />
                          <span className="text-sm shrink-0" style={{ color: "#0b0c0ec0" }}>—</span>
                          <input type="date" className="fi flex-1 min-w-0" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setPage(1); }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                      <span className="text-sm" style={{ color: "#0b0c0ec0" }}>{total} résultat{total > 1 ? "s" : ""}</span>
                      <button className="btn-ghost" onClick={reset}><X size={12} />Réinitialiser</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Tableau ── */}
          {listError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{listError}</span><button className="btn-ghost" onClick={fetchEntries}>Réessayer</button></div>}
          <SectionLabel icon={PackagePlus} text="Historique des entrées" />
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1 }}
            className="rounded-2xl overflow-hidden" style={{ border: "1.5px solid var(--border)", background: "var(--surface)" }}>
            {loading && (
              <div className="h-0.5 w-full overflow-hidden" style={{ background: "var(--border)" }}>
                <motion.div className="h-full" style={{ background: "var(--accent)" }}
                  initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }} />
              </div>
            )}

            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1.5px solid var(--border)", background: "var(--bg)" }}>
                    {COLS.map((h, i) => (
                      <th key={i} onClick={h.col ? () => toggleSort(h.col as string) : undefined}
                        className={`px-5 py-3.5 text-[12px] font-semibold tracking-[.14em] uppercase ${h.c ? "text-center" : "text-left"} ${h.col ? "cursor-pointer select-none" : ""} ${h.w}`}
                        style={{ color: "#0b0c0ec0" }}>
                        <span className="inline-flex items-center gap-1">
                          {h.label}
                          {h.col && sort === h.col && (order === "asc" ? <ChevronUp size={10} style={{ color: "var(--accent)" }} /> : <ChevronDown size={10} style={{ color: "var(--accent)" }} />)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && entries.length === 0 ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                        {[...Array(10)].map((_, j) => <td key={j} className="px-5 py-4"><div className="sk h-4 rounded" style={{ width: `${50 + Math.random() * 40}%` }} /></td>)}
                      </tr>
                    ))
                  ) : listError ? (
                    <tr><td colSpan={10} className="px-5 py-12 text-center text-sm text-red-700">Le chargement a échoué. Réessayez après avoir vérifié la connexion.</td></tr>
                  ) : entries.length === 0 ? (
                    <tr><td colSpan={10} className="px-5 py-16 text-center">
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="flex justify-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--surface-2)" }}>
                            <PackagePlus size={22} style={{ color: "#0b0c0ec0" }} />
                          </div>
                        </div>
                        <p className=" text-lg" style={{ color: "var(--text-2)" }}>Aucune entrée trouvée</p>
                        {canCreate && <button className="btn-primary mx-auto" onClick={() => setShowCreate(true)}><PackagePlus size={14} />Ajouter une entrée</button>}
                      </motion.div>
                    </td></tr>
                  ) : entries.map((e, idx) => {
                    const pct = e.quantity_initial > 0 ? (e.quantity_remaining / e.quantity_initial) * 100 : 0;
                    const tc  = qColor(pct);
                    return (
                      <AnimRow key={e.id} delay={idx * 0.025} onClick={() => setDetailBatchId(e.id)}>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar size={13} style={{ color: "#0b0c0ec0" }} />
                            <span className="text-sm" style={{ color: "var(--text-2)" }}>{fmt(e.entry_date)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4"><span className="font-medium" style={{ color: "var(--text)" }}>{e.product?.name ?? "—"}</span></td>
                        <td className="px-5 py-4 text-center"><span className="font-medium" style={{ color: "var(--text)" }}>{e.quantity_initial}</span></td>
                        <td className="px-5 py-4 text-center"><Tag label={e.quantity_remaining} color={tc} /></td>
                        <td className="px-5 py-4 text-center"><span className="text-sm" style={{ color: "#0b0c0ec0" }}>{e.product?.unit?.abbreviation ?? e.product?.unit?.name ?? "—"}</span></td>
                        <td className="px-5 py-4 text-center"><span className="font-semibold text-sm" style={{ color: "var(--accent)" }}>{fmtP(e.purchase_price)} F</span></td>
                        <td className="px-5 py-4 text-center">
                          {e.expiration_date ? <Tag label={fmt(e.expiration_date)} color="orange" /> : <span style={{ color: "var(--border-strong)" }}>—</span>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full shrink-0" style={{ background: "var(--surface-2)" }}>
                              <User size={11} style={{ color: "#0b0c0ec0" }} />
                            </div>
                            <span className="text-sm truncate max-w-[90px]" style={{ color: "var(--text-2)" }}>{userName(e)}</span>
                          </div>
                        </td>
                        {/*
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <Hash size={11} style={{ color: "#0b0c0ec0" }} />
                            <span className="text-[13px] truncate max-w-[130px]" style={{ color: "var(--text-2)" }}>{e.batch_number ?? "—"}</span>
                          </div>
                        </td>
                        */}
                        {/* Actions — stopPropagation pour ne pas ouvrir le modal "info" depuis les boutons */}
                        <td className="px-5 py-4" onClick={ev => ev.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button className="btn-icon" title="Voir détail" onClick={() => setDetailBatchId(e.id)}><Eye size={13} /></button>
                            {canEdit   && <button className="btn-icon edit" title="Modifier"    onClick={() => setDetailBatchId(e.id)}><Pencil size={13} /></button>}
                            {canDelete && <button className="btn-icon del"  title="Supprimer"   onClick={() => setDetailBatchId(e.id)}><Trash2 size={13} /></button>}
                          </div>
                        </td>
                      </AnimRow>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden">
              {loading && entries.length === 0 ? (
                <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="sk h-28 rounded-2xl" />)}</div>
              ) : listError ? (
                <div className="p-10 text-center text-sm text-red-700">Chargement impossible. Utilisez « Réessayer ».</div>
              ) : entries.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <PackagePlus size={24} style={{ color: "#0b0c0ec0", margin: "0 auto" }} />
                  <p className="" style={{ color: "var(--text-2)" }}>Aucune entrée</p>
                  {canCreate && <button className="btn-primary mx-auto" onClick={() => setShowCreate(true)}><PackagePlus size={14} />Ajouter</button>}
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {entries.map((e, idx) => {
                    const pct = e.quantity_initial > 0 ? (e.quantity_remaining / e.quantity_initial) * 100 : 0;
                    const tc  = qColor(pct);
                    return (
                      <motion.div key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                        className="p-4 sm:p-5 space-y-3 cursor-pointer" onClick={() => setDetailBatchId(e.id)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium" style={{ color: "var(--text)" }}>{e.product?.name ?? "—"}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Calendar size={11} style={{ color: "#0b0c0ec0" }} />
                              <span className="text-sm" style={{ color: "#0b0c0ec0" }}>{fmt(e.entry_date)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-semibold text-sm" style={{ color: "var(--accent)" }}>{fmtP(e.purchase_price)} F</span>
                            <button className="btn-icon" onClick={ev => { ev.stopPropagation(); setDetailBatchId(e.id); }}><Eye size={12} /></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div><p className="mb-0.5" style={{ color: "#0b0c0ec0" }}>Initial</p><p className=" text-base" style={{ color: "var(--text)" }}>{e.quantity_initial}</p></div>
                          <div><p className="mb-0.5" style={{ color: "#0b0c0ec0" }}>Restant</p><Tag label={e.quantity_remaining} color={tc} /></div>
                          <div><p className="mb-0.5" style={{ color: "#0b0c0ec0" }}>Unité</p><p style={{ color: "var(--text-2)" }}>{e.product?.unit?.abbreviation ?? "—"}</p></div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1"><Hash size={11} style={{ color: "#0b0c0ec0" }} /><span className="text-[13px]" style={{ color: "var(--text-2)" }}>{e.batch_number ?? "—"}</span></div>
                          {e.expiration_date && <Tag label={`Expire ${fmt(e.expiration_date)}`} color="orange" />}
                          <div className="flex items-center gap-1"><User size={11} style={{ color: "#0b0c0ec0" }} /><span className="text-[13px]" style={{ color: "var(--text-2)" }}>{userName(e)}</span></div>
                        </div>
                        <div className="progress-bar">
                          <motion.div className="progress-fill" style={{ background: pct < 20 ? "#dc2626" : pct < 50 ? "#d97706" : "var(--accent)", width: `${Math.min(pct, 100)}%` }}
                            initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: .9, delay: idx * 0.04 }} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{ borderTop: "1.5px solid var(--border)", background: "var(--bg)" }}>
              <p className="text-sm" style={{ color: "#0b0c0ec0" }}>{total} entrée{total > 1 ? "s" : ""} · Page {page}/{totalPages}</p>
              <div className="flex items-center gap-2">
                <button className="btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: "7px 12px" }}>
                  <ChevronLeft size={14} /><span className="hidden sm:inline text-sm">Préc.</span>
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    const pg = i + 1;
                    return (
                      <button key={pg} onClick={() => setPage(pg)} className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-medium transition"
                        style={{ background: page === pg ? "var(--accent)" : "transparent", color: page === pg ? "#fff" : "var(--text-2)", border: page === pg ? "none" : "1.5px solid var(--border)" }}>
                        {pg}
                      </button>
                    );
                  })}
                  {totalPages > 5 && <span className="text-sm" style={{ color: "#0b0c0ec0" }}>…</span>}
                </div>
                <button className="btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: "7px 12px" }}>
                  <span className="hidden sm:inline text-sm">Suiv.</span><ChevronRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>

          <div className="mt-8">
            <SectionLabel icon={RefreshCw} text="Retours Cuisine réintégrés au stock" />
            {returnsError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{returnsError}</span><button className="btn-ghost" onClick={fetchEntries}>Réessayer</button></div>}
            <div className="overflow-hidden rounded-2xl" style={{ border: "1.5px solid var(--border)", background: "var(--surface)" }}>
              {kitchenReturns.length === 0 ? <div className="p-8 text-center text-sm" style={{ color: "var(--text-2)" }}>{returnsError ? "Les retours n’ont pas pu être chargés." : "Aucun retour Cuisine enregistré."}</div> : <div className="overflow-x-auto">
                <table className="min-w-full text-sm"><thead><tr style={{ borderBottom: "1.5px solid var(--border)", background: "var(--bg)" }}>
                  {["Date du retour", "Produit", "Quantité réintégrée", "Référence", "Enregistré par"].map(label => <th key={label} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[.12em]" style={{ color: "var(--text-2)" }}>{label}</th>)}
                </tr></thead><tbody>{kitchenReturns.map(returned => <tr key={returned.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="whitespace-nowrap px-5 py-3.5" style={{ color: "var(--text-2)" }}>{new Date(returned.created_at).toLocaleString("fr-FR")}</td>
                  <td className="px-5 py-3.5 font-medium" style={{ color: "var(--text)" }}>{returned.product?.name ?? "—"}</td>
                  <td className="px-5 py-3.5 font-semibold text-emerald-700">+{fmtP(returned.quantity)} {returned.product?.unit?.abbreviation ?? returned.product?.unit?.name ?? ""}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--text-2)" }}>{returned.reference_number ?? "Retour Cuisine"}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--text-2)" }}>{returned.user?.fullName ?? "—"}</td>
                </tr>)}</tbody></table>
              </div>}
              {returnsTotal > returnsPageSize && <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ color: "var(--text-2)", borderTop: "1px solid var(--border)" }}><span className="text-xs">{returnsTotal} retour{returnsTotal > 1 ? "s" : ""} · Page {returnsPage}/{Math.ceil(returnsTotal / returnsPageSize)}</span><div className="flex gap-2"><button className="btn-ghost" disabled={returnsPage === 1} onClick={() => setReturnsPage(value => value - 1)}>Précédent</button><button className="btn-ghost" disabled={returnsPage >= Math.ceil(returnsTotal / returnsPageSize)} onClick={() => setReturnsPage(value => value + 1)}>Suivant</button></div></div>}
            </div>
          </div>

          {/* Bandeau FIFO */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .22 }}
            className="mt-8 rounded-2xl p-5 sm:p-6" style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A" }}>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: "#FEF3C7" }}>
                <Info size={17} style={{ color: "#B45309" }} />
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ color: "#78350F" }}>Principe FIFO — Premier entré, premier sorti</p>
                <p className="text-sm leading-relaxed" style={{ color: "#92400E" }}>
                  Chaque entrée de stock crée un lot horodaté. Lors d'une consommation, le système utilise automatiquement le lot le plus ancien en priorité, garantissant la fraîcheur des produits, réduisant les pertes par péremption et assurant la traçabilité sanitaire complète.
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      {/* Modals */}
      <CreateModal
        show={showCreate} onClose={() => setShowCreate(false)}
        products={products} units={units} token={token}
        onSuccess={fetchEntries} notify={notify} canCreate={canCreate}
      />
      <DetailModal
        batchId={detailBatchId} token={token}
        canEdit={canEdit} canDelete={canDelete}
        onClose={() => setDetailBatchId(null)}
        onRefresh={fetchEntries} notify={notify}
      />
    </SidebarLayout>
  );
}
