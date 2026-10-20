"use client";

/**
 * app/sorties/page.tsx — COMPLET
 *
 * RBAC :
 *   STOCK_VIEW    → accès page + lecture tableau
 *   STOCK_CREATE  → bouton "Nouvelle sortie"
 *   STOCK_EDIT    → onglet Modifier dans le modal détail
 *   STOCK_DELETE  → onglet Supprimer (avec restitution stock automatique)
 *
 * Actions sur chaque mouvement :
 *   👁  Voir détail   → STOCK_VIEW
 *   ✎  Modifier       → STOCK_EDIT   (raison + référence seulement)
 *   🗑  Supprimer      → STOCK_DELETE (restitue qty dans lot + inventaire)
 *
 * Contraintes :
 *   • type / quantité / produit → NON modifiables
 *   • mouvement de type IN → non supprimable via cette page
 *   • DELETE → recalcule inventory_snapshots via la route API
 */

import { useEffect, useState, useRef, useCallback, JSX } from "react";
import SidebarLayout          from "@/src/navbar/SidebarLayout";
import { useAuth }            from "@/lib/hooks/useAuth";
import { usePagePermissions } from "@/lib/hooks/usePagePermissions";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  ArrowUpFromLine, Search, RefreshCw, ChevronUp, ChevronDown,
  CheckCircle2, XCircle, AlertCircle, Info, Check, X,
  Calendar, FileText, User, Layers, ChevronLeft, ChevronRight,
  Hash, ArrowRight, Zap, Lock, Eye, Pencil, Trash2,
  Package, AlertTriangle, TrendingUp,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
type NotifType = "success" | "error" | "warning";
interface Notif { type: NotifType; message: string }

interface Unit      { id: number; name: string; abbreviation?: string }
interface Category  { id: number; name: string }
interface Product   { id: number; name: string; unit_id?: number; unit?: Unit; category?: Category; minimum_stock?: number }
interface AppUser   { id: number; fullName: string; email?: string }

interface Movement {
  id: number; product_id: number; user_id: number;
  user?: { id: number; fullName: string; email?: string } | null;
  quantity: number; type: string;
  reason?: string | null; reference_number?: string | null;
  created_at: string; batch_id?: number | null;
  product?: { name?: string; unit?: { abbreviation?: string; name?: string } };
}
interface MovementDetail extends Movement {
  product?: {
    name?: string;
    unit?: { id: number; name: string; abbreviation?: string };
    category?: { id: number; name: string };
  };
  batch?: {
    id: number; batch_number: string;
    quantity_initial: number; quantity_remaining: number;
    purchase_price: number; entry_date: string; expiration_date?: string | null;
  } | null;
}
interface MovementMeta { canDelete: boolean; canEdit: boolean }

interface EditForm { reason: string; reference_number: string }
type EditErrors = Partial<Record<keyof EditForm, string>>;

interface CreateForm {
  product_id: string; quantity: string; type: string;
  reason: string; reference_number: string; destination: "STORE" | "CUISINE";
}
type CreateErrors = Partial<Record<keyof CreateForm, string>>;
type SortOrder = "asc" | "desc";
type TagColor  = "green" | "red" | "amber" | "orange" | "stone" | "blue";

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const MOVEMENT_TYPES = [
  { value: "OUT",        label: "Sortie normale",  tag: "blue"   as TagColor, desc: "Consommation standard, lot FIFO débité en premier" },
  { value: "LOSS",       label: "Perte / Casse",   tag: "red"    as TagColor, desc: "Perte enregistrée — réduit le stock sans vente" },
  { value: "EXPIRED",    label: "Péremption",      tag: "orange" as TagColor, desc: "Produit périmé retiré du stock" },
  { value: "ADJUSTMENT", label: "Ajustement",      tag: "stone"  as TagColor, desc: "Correction manuelle de l'inventaire physique" },
];
const OUTGOING_TYPES = MOVEMENT_TYPES.map((movement) => movement.value).join(",");

const typeInfo = (v: string) =>
  MOVEMENT_TYPES.find(t => t.value === v) ?? { value: v, label: v, tag: "stone" as TagColor, desc: "" };

const genRef = () => {
  const n = new Date();
  return `SORTIE-${n.getFullYear()}${String(n.getMonth()+1).padStart(2,"0")}${String(n.getDate()).padStart(2,"0")}-${String(n.getHours()).padStart(2,"0")}${String(n.getMinutes()).padStart(2,"0")}${String(n.getSeconds()).padStart(2,"0")}`;
};

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
    --accent:#DC2626;--accent-light:#FEF2F2;--accent-mid:#FECACA;--accent-dark:#7F1D1D;
  }
  *,*::before,*::after{font-family:'Geist',sans-serif;box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:99px}
  .serif{font-family:'Instrument Serif',Georgia,serif}
  .fi{width:100%;background:var(--surface);border:1.5px solid var(--border);border-radius:12px;
    padding:11px 14px;font-size:14px;color:var(--text);
    transition:border-color .2s,box-shadow .2s;outline:none;-webkit-appearance:none}
  .fi::placeholder{color:var(--text-3)}
  .fi:hover:not(:disabled){border-color:var(--border-strong)}
  .fi:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(220,38,38,.1)}
  .fi:disabled,.fi[readonly]{background:var(--surface-2);color:var(--text-3);cursor:not-allowed}
  .fi.err{border-color:#DC2626;box-shadow:0 0 0 3px rgba(220,38,38,.1)}
  select.fi{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239B9591' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 12px center;padding-right:36px;cursor:pointer}
  textarea.fi{resize:none;line-height:1.6}
  .tr-hover{transition:background .15s;cursor:pointer}
  .tr-hover:hover{background:#F7F5F1}
  .stat-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:600;letter-spacing:.04em}
  .btn-primary{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;border-radius:12px;
    background:var(--accent);color:#fff;font-size:14px;font-weight:600;border:none;cursor:pointer;
    transition:background .18s,box-shadow .18s,transform .12s;box-shadow:0 2px 8px rgba(220,38,38,.22)}
  .btn-primary:hover{background:#B91C1C;box-shadow:0 6px 20px rgba(220,38,38,.30);transform:translateY(-1px)}
  .btn-primary:active{transform:translateY(0)}
  .btn-primary:disabled{opacity:.45;cursor:not-allowed;transform:none}
  .btn-danger{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;border-radius:12px;
    background:#B91C1C;color:#fff;font-size:14px;font-weight:600;border:none;cursor:pointer;
    transition:all .18s;box-shadow:0 2px 8px rgba(220,38,38,.2)}
  .btn-danger:hover{background:#991B1B;transform:translateY(-1px)}
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
`;

/* ─────────────────────────────────────────────────────────────────────────────
   UTILS
───────────────────────────────────────────────────────────────────────────── */
const fmtDT = (d?: string | null) => d ? new Date(d).toLocaleString("fr-FR") : "—";
const fmtD  = (d?: string | null) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";
const fmtP  = (v?: number | string) =>
  v !== undefined && v !== "" && !isNaN(Number(v)) ? Number(v).toLocaleString("fr-FR") : "—";

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
    if (document.getElementById("sf-so")) return;
    const s = document.createElement("style"); s.id = "sf-so"; s.textContent = FONTS;
    document.head.appendChild(s);
  }, []);
  return null;
}

function Toast({ show, notif }: { show: boolean; notif: Notif | null }): JSX.Element {
  const I = { success: <CheckCircle2 size={15}/>, error: <XCircle size={15}/>, warning: <AlertCircle size={15}/> };
  const C = { success:"border-emerald-200 bg-emerald-50 text-emerald-800", error:"border-red-200 bg-red-50 text-red-800", warning:"border-amber-200 bg-amber-50 text-amber-800" };
  return (
    <AnimatePresence>
      {show && notif && (
        <motion.div initial={{opacity:0,y:-24,scale:.94}} animate={{opacity:1,y:0,scale:1}}
          exit={{opacity:0,y:-20,scale:.94}} transition={{type:"spring",stiffness:420,damping:28}}
          className={`fixed top-4 right-4 z-[80] flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl max-w-sm ${C[notif.type]}`}>
          {I[notif.type]}<span className="leading-snug">{notif.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Tag({ label, color = "stone" }: { label: string; color?: TagColor }): JSX.Element {
  return <span className={`stat-pill tag-${color}`}>{label}</span>;
}

function SectionLabel({ icon: Icon, text }: { icon: React.ElementType; text: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <Icon size={11} style={{color:"#0b0c0ec0"}}/>
      <span className="text-[12px] font-semibold tracking-[0.24em] uppercase" style={{color:"#0b0c0ec0"}}>{text}</span>
      <div className="flex-1 h-px" style={{background:"var(--border)"}}/>
    </div>
  );
}

function AnimRow({ children, delay=0, onClick }: { children: React.ReactNode; delay?: number; onClick?: ()=>void }): JSX.Element {
  const ref    = useRef<HTMLTableRowElement>(null);
  const inView = useInView(ref, { once:true, margin:"0px 0px -20px 0px" });
  return (
    <motion.tr ref={ref} initial={{opacity:0,y:8}} animate={inView?{opacity:1,y:0}:{}}
      transition={{delay,duration:.32,ease:[.25,.46,.45,.94]}}
      className="border-b tr-hover" style={{borderColor:"var(--border)"}} onClick={onClick}>
      {children}
    </motion.tr>
  );
}

function FieldLabel({ label, icon:Icon, required, error, hint, children }: {
  label:string; icon?:React.ElementType; required?:boolean;
  error?:string; hint?:string; children:React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon size={12} style={{color:"#0b0c0ec0"}}/>}
        <span className="text-[13px] font-semibold tracking-[.06em] uppercase" style={{color:"#0b0c0ec0"}}>
          {label}{required && <span style={{color:"var(--accent)"}}> *</span>}
        </span>
      </div>
      {children}
      {hint && !error && <p className="mt-1 text-[13px]" style={{color:"#0b0c0ec0"}}>{hint}</p>}
      {error && (
        <motion.p initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
          className="mt-1.5 text-sm font-medium flex items-center gap-1" style={{color:"#DC2626"}}>
          <AlertCircle size={11}/>{error}
        </motion.p>
      )}
    </div>
  );
}

function AccessDenied({ permission }: { permission: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{background:"#FEF2F2"}}>
        <Lock size={28} style={{color:"#F87171"}}/>
      </div>
      <div>
        <p className="text-lg font-bold" style={{color:"var(--text)"}}>Accès refusé</p>
        <p className="text-sm mt-1" style={{color:"#0b0c0ec0"}}>
          Permission requise :{" "}
          <code className="text-sm font-mono rounded px-1.5 py-0.5" style={{background:"var(--surface-2)",color:"var(--text-2)"}}>{permission}</code>
        </p>
      </div>
    </div>
  );
}

/* StockRing */
function StockRing({ qty, max, size=42 }: { qty:number; max:number; size?:number }): JSX.Element {
  const pct  = max>0 ? Math.min((qty/max)*100,100) : (qty>0?100:0);
  const r    = (size-4)/2; const circ=2*Math.PI*r;
  const col  = qty===0?"#DC2626":qty<(max||0)*0.3?"#D97706":"#059669";
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={3}/>
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={3} strokeLinecap="round"
        strokeDasharray={circ} initial={{strokeDashoffset:circ}} animate={{strokeDashoffset:circ-(pct/100)*circ}}
        transition={{duration:1,ease:[.16,1,.3,1],delay:.15}}/>
    </svg>
  );
}

/* ProductCard pour le modal Create */
function ProductCard({ product, qty }: { product: Product; qty: number }): JSX.Element {
  const unit = product.unit?.abbreviation || product.unit?.name || "u";
  const col  = qty===0?"#DC2626":"#059669";
  return (
    <motion.div initial={{opacity:0,height:0,marginBottom:0}} animate={{opacity:1,height:"auto",marginBottom:16}}
      exit={{opacity:0,height:0,marginBottom:0}} transition={{duration:.28}} className="overflow-hidden">
      <div className="rounded-2xl border p-4" style={{background:"var(--accent-light)",borderColor:"var(--accent-mid)"}}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{color:"var(--accent-dark)"}}>{product.name}</p>
            <p className="text-sm mt-0.5" style={{color:"var(--accent)"}}>{unit} — {product.category?.name||""}</p>
            <p className="text-[12px] mt-2 font-medium flex items-center gap-1.5" style={{color:qty===0?"#DC2626":"var(--text-2)"}}>
              <ArrowRight size={12}/>Disponible (FIFO) :&nbsp;<strong style={{color:col}}>{qty} {unit}</strong>
            </p>
          </div>
          <div className="flex flex-col items-center shrink-0">
            <StockRing qty={qty} max={product.minimum_stock||qty||1} size={42}/>
            <span className="text-sm font-bold mt-0.5 serif" style={{color:col}}>{qty}</span>
            <span className="text-[12px]" style={{color:"#0b0c0ec0"}}>en stock</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* Modal wrapper */
function Modal({ open, onClose, width="max-w-2xl", children }: {
  open:boolean; onClose:()=>void; width?:string; children:React.ReactNode;
}): JSX.Element {
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h);
  },[onClose]);
  useEffect(()=>{ document.body.style.overflow=open?"hidden":""; return()=>{document.body.style.overflow="";} },[open]);

  return (
    <AnimatePresence>
      {open&&(
        <>
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
          <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center sm:px-4 pointer-events-none">
            <motion.div initial={{opacity:0,y:"100%"}} animate={{opacity:1,y:0}} exit={{opacity:0,y:"100%"}}
              transition={{type:"spring",stiffness:320,damping:32}}
              className={`pointer-events-auto relative w-full ${width} flex flex-col`}
              style={{background:"var(--surface)",border:"1.5px solid var(--border)",
                borderRadius:"24px 24px 0 0",maxHeight:"92dvh",
                boxShadow:"0 -24px 80px -8px rgba(26,23,20,.22)"}}
              onClick={e=>e.stopPropagation()}>
              <div className="sm:hidden flex justify-center pt-3 pb-0.5 flex-shrink-0">
                <div className="w-10 h-1 rounded-full" style={{background:"var(--border)"}}/>
              </div>
              <div className="overflow-y-auto flex-1 flex flex-col">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CREATE MODAL (nouvelle sortie)
───────────────────────────────────────────────────────────────────────────── */
function CreateModal({ show, onClose, products, units, token, onSuccess, notify, canCreate }: {
  show:boolean; onClose:()=>void; products:Product[]; units:Unit[];
  token:string|null; onSuccess:()=>void;
  notify:(t:NotifType,m:string)=>void; canCreate:boolean;
}): JSX.Element {
  const [busy,setBusy]             = useState(false);
  const [selProd,setSelProd]       = useState<Product|null>(null);
  const [physQty,setPhysQty]       = useState(0);
  const [errs,setErrs]             = useState<CreateErrors>({});
  const [fd,setFd]                 = useState<CreateForm>({
    product_id:"",quantity:"",type:"OUT",reason:"Autre destination",reference_number:genRef(),destination:"STORE",
  });
  const set=(k:keyof CreateForm,v:string)=>{setFd(p=>({...p,[k]:v}));setErrs(p=>({...p,[k]:""}))}

  useEffect(()=>{
    if(!show)setTimeout(()=>{setSelProd(null);setPhysQty(0);setErrs({});setFd({product_id:"",quantity:"",type:"OUT",reason:"Autre destination",reference_number:genRef(),destination:"STORE"});},350);
  },[show]);

  useEffect(()=>{
    if(!fd.product_id){setSelProd(null);setPhysQty(0);return;}
    const p=products.find(x=>String(x.id)===String(fd.product_id));
    setSelProd(p??null);
    fetch(`/api/stock/quantity?product_id=${fd.product_id}`,{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.ok?r.json():null).then((d:any)=>setPhysQty(d?.data?.quantity??0)).catch(()=>{});
  },[fd.product_id,products,token]);

  const validate=():boolean=>{
    const e:CreateErrors={};
    if(!fd.product_id)e.product_id="Sélectionnez un produit";
    if(!fd.quantity||parseFloat(fd.quantity)<=0)e.quantity="Quantité invalide (> 0)";
    else if(parseFloat(fd.quantity)>physQty)e.quantity=`Dépasse le stock disponible (${physQty})`;
    if(!fd.reason.trim())e.reason="Précisez la raison";
    setErrs(e);return Object.keys(e).length===0;
  };

  const handleSubmit=async()=>{
    if(!canCreate){notify("error","Permission STOCK_CREATE requise");return;}
    if(!validate())return;
    setBusy(true);
    try{
      const res=await fetch("/api/stock/consume",{method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({
          product_id:parseInt(fd.product_id),quantity:parseFloat(fd.quantity),
          type:fd.type,reason:fd.reason,reference_number:fd.reference_number,
          destination:fd.destination,
        }),
      });
      if(res.ok){notify("success","Sortie enregistrée !");onClose();onSuccess();}
      else{const d=await res.json() as any;
        if(d?.error?.toLowerCase().includes("stock"))setErrs(p=>({...p,quantity:d.error}));
        else notify("error",d.error||"Erreur lors de l'enregistrement");
      }
    }catch{notify("error","Erreur réseau");}finally{setBusy(false);}
  };

  const ti=typeInfo(fd.type);
  const ro=!canCreate;

  return (
    <Modal open={show} onClose={onClose} width="max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{borderBottom:"1.5px solid var(--border)"}}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{background:canCreate?"var(--accent-light)":"#F1F5F9"}}>
            {canCreate?<ArrowUpFromLine size={16} style={{color:"var(--accent)"}}/>:<Lock size={16} style={{color:"#94A3B8"}}/>}
          </div>
          <div>
            <p className="text-[12px] font-semibold tracking-[.18em] uppercase" style={{color:"#0b0c0ec0"}}>Stock</p>
            <h2 className="text-xl font-normal" style={{color:"var(--text)"}}>Nouvelle sortie</h2>
          </div>
        </div>
        <button onClick={onClose} className="btn-icon"><X size={14}/></button>
      </div>
      {/* Body */}
      <div className="overflow-y-auto flex-1 px-6 py-6 space-y-5">
        {ro&&(
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold"
            style={{background:"#FFFBEB",border:"1px solid #FDE68A",color:"#92400E"}}>
            <Lock size={13}/>Mode lecture — permission STOCK_CREATE requise
          </div>
        )}

        <FieldLabel label="Produit" icon={Layers} required={!ro} error={errs.product_id}>
          <select className="fi" value={fd.product_id} disabled={ro} onChange={e=>set("product_id",e.target.value)}>
            <option value="">Choisir un produit…</option>
            {products.map(p=>{const u=p.unit||units.find(x=>x.id===p.unit_id);return<option key={p.id} value={p.id}>{p.name} ({u?.abbreviation||u?.name||"u"})</option>;})}
          </select>
        </FieldLabel>

        <AnimatePresence>{selProd&&<ProductCard product={selProd} qty={physQty}/>}</AnimatePresence>

        {fd.type==="OUT"&&<FieldLabel label="Destination" icon={ArrowRight}>
          <select className="fi" value={fd.destination} disabled={ro} onChange={e=>{const destination=e.target.value as "STORE"|"CUISINE";setFd(p=>({...p,destination,reason:p.reason==="Consommation cuisine"||p.reason==="Autre destination"?(destination==="CUISINE"?"Consommation cuisine":"Autre destination"):p.reason}));setErrs(p=>({...p,destination:""}));}}>
            <option value="STORE">Autre destination</option>
            <option value="CUISINE">Cuisine (suivi du service et des retours)</option>
          </select>
        </FieldLabel>}

        <div className="grid grid-cols-2 gap-3">
          <FieldLabel label="Quantité" icon={Layers} required={!ro} error={errs.quantity}>
            <div className="relative">
              <input type="number" step="0.01" min="0.01" className={`fi ${errs.quantity?"err":""}`}
                style={{paddingRight:selProd?"46px":"14px"}} placeholder="0"
                value={fd.quantity} disabled={ro} onChange={e=>set("quantity",e.target.value)}/>
              {selProd&&<span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold" style={{color:"#0b0c0ec0"}}>{selProd.unit?.abbreviation||"u"}</span>}
            </div>
            {physQty>0&&<p className="mt-1 text-[13px]" style={{color:"#0b0c0ec0"}}>Max : <strong style={{color:"var(--text-2)"}}>{physQty}</strong></p>}
          </FieldLabel>
          <FieldLabel label="Type" icon={Zap} required={!ro} error={errs.type}>
            <select className="fi" value={fd.type} disabled={ro} onChange={e=>set("type",e.target.value)}>
              {MOVEMENT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FieldLabel>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={fd.type} initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:.18}}
            className="flex items-center gap-2 -mt-1">
            <Tag label={ti.label} color={ti.tag}/><span className="text-[13px]" style={{color:"#0b0c0ec0"}}>{ti.desc}</span>
          </motion.div>
        </AnimatePresence>

        <FieldLabel label={fd.destination==="STORE"?"Autre destination / détails":"Raison / Détails"} icon={FileText} required={!ro} error={errs.reason}>
          <input className={`fi ${errs.reason?"err":""}`} placeholder={fd.destination==="STORE"?"Précisez la destination (ex. événement, salle…)":"Ex: Consommation cuisine, Casse…"}
            value={fd.reason} disabled={ro} onChange={e=>set("reason",e.target.value)}/>
          {fd.destination==="STORE"&&<p className="mt-1 text-xs" style={{color:"var(--text-2)"}}>Indiquez où va le produit, puis confirmez la sortie.</p>}
        </FieldLabel>

        <FieldLabel label="Numéro de référence" icon={Hash}>
          <div className="relative">
            <input className="fi" style={{paddingRight:"90px"}} value={fd.reference_number} disabled={ro}
              onChange={e=>set("reference_number",e.target.value)}/>
            {!ro&&<button type="button" onClick={()=>set("reference_number",genRef())}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold flex items-center gap-1" style={{color:"var(--accent)"}}>
              <RefreshCw size={10}/>Regénérer
            </button>}
          </div>
        </FieldLabel>

        {!ro&&fd.product_id&&fd.quantity&&!errs.quantity&&(
          <motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}}
            className="rounded-2xl px-5 py-4 space-y-2" style={{background:"var(--bg)",border:"1.5px solid var(--border)"}}>
            <p className="text-[12px] font-semibold tracking-[.16em] uppercase" style={{color:"#0b0c0ec0"}}>Récapitulatif</p>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{color:"var(--text-2)"}}>Produit</span>
              <span className="text-sm font-medium" style={{color:"var(--text)"}}>{selProd?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{color:"var(--text-2)"}}>Quantité déduite</span>
              <span className="text-lg font-medium" style={{color:"var(--accent)"}}>{fd.quantity} {selProd?.unit?.abbreviation||"u"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{color:"var(--text-2)"}}>Stock après sortie</span>
              <span className="text-sm font-semibold" style={{color:(physQty-parseFloat(fd.quantity||"0"))<0?"#DC2626":"var(--text)"}}>
                {Math.max(physQty-parseFloat(fd.quantity||"0"),0)} {selProd?.unit?.abbreviation||"u"}
              </span>
            </div>
          </motion.div>
        )}
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 gap-3 flex-shrink-0" style={{borderTop:"1.5px solid var(--border)",background:"var(--bg)"}}>
        <button className="btn-ghost" onClick={onClose}>Annuler</button>
        {canCreate
          ? <button className="btn-primary" onClick={handleSubmit} disabled={busy}>
              {busy?<><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full spin"/>Enregistrement…</>:<><Check size={14}/>Confirmer la sortie</>}
            </button>
          : <button className="btn-locked" disabled><Lock size={13}/>Non autorisé</button>
        }
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DETAIL MODAL — onglets : Infos | Modifier | Supprimer
───────────────────────────────────────────────────────────────────────────── */
function DetailModal({ movementId, token, canEdit, canDelete, onClose, onRefresh, notify }: {
  movementId: number|null; token:string|null; canEdit:boolean; canDelete:boolean;
  onClose:()=>void; onRefresh:()=>void; notify:(t:NotifType,m:string)=>void;
}): JSX.Element {
  type TabId = "info"|"edit"|"delete";
  const [tab,     setTab]     = useState<TabId>("info");
  const [detail,  setDetail]  = useState<{movement:MovementDetail;meta:MovementMeta}|null>(null);
  const [loadD,   setLoadD]   = useState(false);
  const [editBusy,setEditB]   = useState(false);
  const [delBusy, setDelB]    = useState(false);
  const [confirm, setConfirm] = useState("");
  const [ef,      setEf]      = useState<EditForm>({reason:"",reference_number:""});
  const [errs,    setErrs]    = useState<EditErrors>({});
  const setE=(k:keyof EditForm,v:string)=>{setEf(p=>({...p,[k]:v}));setErrs(p=>({...p,[k]:""}))}

  useEffect(()=>{
    if(!movementId){setDetail(null);setTab("info");setConfirm("");return;}
    setLoadD(true);
    fetch(`/api/stock/movements/${movementId}`,{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.ok?r.json():Promise.reject())
      .then((d:any)=>{
        if(d?.data){
          setDetail(d.data);
          const m=d.data.movement;
          setEf({reason:m.reason??"",reference_number:m.reference_number??""});
        }
      })
      .catch(()=>notify("error","Impossible de charger le détail"))
      .finally(()=>setLoadD(false));
  },[movementId]); // eslint-disable-line

  const validate=():boolean=>{
    const e:EditErrors={};
    if(!ef.reason.trim())e.reason="La raison ne peut pas être vide";
    setErrs(e);return Object.keys(e).length===0;
  };

  const handleEdit=async()=>{
    if(!detail||!validate())return;
    setEditB(true);
    try{
      const res=await fetch(`/api/stock/movements/${detail.movement.id}`,{
        method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({reason:ef.reason,reference_number:ef.reference_number}),
      });
      if(res.ok){
        notify("success","Mouvement mis à jour !");onRefresh();
        const fresh=await fetch(`/api/stock/movements/${detail.movement.id}`,{headers:{Authorization:`Bearer ${token}`}});
        const fd=await fresh.json() as any;
        if(fd?.data)setDetail(fd.data);
        setTab("info");
      }else{
        const d=await res.json() as any;
        if(d.fields)setErrs(d.fields);
        else notify("error",d.error??"Erreur lors de la modification");
      }
    }catch{notify("error","Erreur réseau");}finally{setEditB(false);}
  };

  const handleDelete=async()=>{
    if(!detail)return;
    if(confirm!==String(detail.movement.id)){notify("warning","Saisissez l'ID exact pour confirmer");return;}
    setDelB(true);
    try{
      const res=await fetch(`/api/stock/movements/${detail.movement.id}`,{
        method:"DELETE",headers:{Authorization:`Bearer ${token}`},
      });
      if(res.ok){notify("success","Mouvement supprimé et stock restitué !");onRefresh();onClose();}
      else{const d=await res.json() as any;notify("error",d.reason??d.error??"Suppression impossible");}
    }catch{notify("error","Erreur réseau");}finally{setDelB(false);}
  };

  const m    = detail?.movement;
  const meta = detail?.meta;
  const ti   = m ? typeInfo(m.type) : null;

  const TABS: Array<{id:TabId;label:string;icon:React.ReactNode;show:boolean}> = [
    {id:"info",   label:"Infos",     icon:<Eye     size={13}/>, show:true},
    {id:"edit",   label:"Modifier",  icon:<Pencil  size={13}/>, show:canEdit&&!!meta?.canEdit},
    {id:"delete", label:"Supprimer", icon:<Trash2  size={13}/>, show:canDelete&&!!meta?.canDelete},
  ];

  return (
    <Modal open={movementId!==null} onClose={onClose} width="max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{borderBottom:"1.5px solid var(--border)"}}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{background:"var(--accent-light)"}}>
            <ArrowUpFromLine size={16} style={{color:"var(--accent)"}}/>
          </div>
          <div>
            <p className="text-[12px] font-semibold tracking-[.18em] uppercase" style={{color:"#0b0c0ec0"}}>Mouvement de stock</p>
            <h2 className="text-base font-semibold" style={{color:"var(--text)"}}>
              {loadD?"Chargement…":(m?`#${m.id} — ${m.product?.name??"—"}`:"—")}
            </h2>
          </div>
        </div>
        <button onClick={onClose} className="btn-icon"><X size={14}/></button>
      </div>

      {/* Tab bar */}
      <div className="px-4 py-2.5 flex items-center gap-1 flex-shrink-0" style={{borderBottom:"1.5px solid var(--border)",background:"var(--bg)"}}>
        {TABS.filter(t=>t.show).map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`tab-btn flex items-center gap-1.5 ${tab===t.id?"active":""}`}>
            {t.icon}{t.label}
          </button>
        ))}
        {/* Badges si actions non dispo */}
        {canDelete&&!meta?.canDelete&&m&&(
          <span className="text-[13px] ml-2 flex items-center gap-1" style={{color:"#0b0c0ec0"}}>
            <AlertTriangle size={11}/>Mouvement IN — non supprimable ici
          </span>
        )}
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 px-6 py-6">
        {loadD?(
          <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="sk h-12 rounded-xl"/>)}</div>
        ):(
          <AnimatePresence mode="wait">

            {/* ── INFO ── */}
            {tab==="info"&&m&&(
              <motion.div key="info" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} className="space-y-5">
                {/* Badge type */}
                <div className="flex items-center gap-3">
                  {ti&&<Tag label={ti.label} color={ti.tag}/>}
                  <span className="text-sm" style={{color:"#0b0c0ec0"}}>{ti?.desc}</span>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {label:"Quantité",       value:Number(m.quantity).toLocaleString("fr-FR"),           color:"var(--accent)"},
                    {label:"Produit",         value:m.product?.name??"—",                                color:"var(--text)"},
                    {label:"Unité",           value:m.product?.unit?.abbreviation??m.product?.unit?.name??"—", color:"var(--text-2)"},
                    {label:"Date",            value:fmtDT(m.created_at),                                 color:"var(--text)"},
                    {label:"Créé par",        value:m.user?.fullName??"—",                               color:"var(--text)"},
                    {label:"ID",              value:`#${m.id}`,                                          color:"#0b0c0ec0"},
                  ].map((k,i)=>(
                    <div key={i} className="rounded-xl p-3" style={{background:"var(--surface-2)",border:"1px solid var(--border)"}}>
                      <p className="text-[12px] uppercase font-semibold tracking-wider mb-0.5" style={{color:"#0b0c0ec0"}}>{k.label}</p>
                      <p className="text-sm font-semibold" style={{color:k.color}}>{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* Raison + Référence */}
                <div className="space-y-3">
                  {[
                    {label:"Raison",     value:m.reason??"—",             icon:<FileText size={13}/>},
                    {label:"Référence",  value:m.reference_number??"—",   icon:<Hash     size={13}/>},
                  ].map((item,i)=>(
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{background:"var(--surface-2)",border:"1px solid var(--border)"}}>
                      <span style={{color:"#0b0c0ec0",marginTop:2}}>{item.icon}</span>
                      <div>
                        <p className="text-[12px] uppercase font-semibold tracking-wider" style={{color:"#0b0c0ec0"}}>{item.label}</p>
                        <p className="text-sm font-semibold mt-0.5" style={{color:"var(--text)"}}>{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lot associé */}
                {m.batch&&(
                  <div className="rounded-2xl p-4" style={{background:"#F0FDF4",border:"1px solid #BBF7D0"}}>
                    <p className="text-[12px] uppercase font-semibold tracking-wider mb-2" style={{color:"#166534"}}>Lot débité</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      {[
                        {label:"N° lot",     value:m.batch.batch_number},
                        {label:"Qté initiale",value:Number(m.batch.quantity_initial).toLocaleString("fr-FR")},
                        {label:"Qté restante",value:Number(m.batch.quantity_remaining).toLocaleString("fr-FR")},
                        {label:"Entrée",     value:fmtD(m.batch.entry_date)},
                      ].map((row,i)=>(
                        <div key={i}><span className="text-sm" style={{color:"#166534"}}>{row.label}</span>
                          <p className="font-semibold" style={{color:"#14532D"}}>{row.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions rapides */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {canEdit&&meta?.canEdit&&<button className="btn-ghost" onClick={()=>setTab("edit")}><Pencil size={13}/>Modifier</button>}
                  {canDelete&&meta?.canDelete&&(
                    <button className="btn-ghost" style={{color:"#DC2626",borderColor:"#FCA5A5"}} onClick={()=>setTab("delete")}>
                      <Trash2 size={13}/>Supprimer
                    </button>
                  )}
                  {canDelete&&!meta?.canDelete&&m.type==="IN"&&(
                    <div className="text-sm flex items-center gap-1.5 px-3 py-2 rounded-xl"
                      style={{background:"var(--surface-2)",border:"1px solid var(--border)",color:"#0b0c0ec0"}}>
                      <AlertTriangle size={12}/>Mouvement IN — supprimez le lot via Entrées
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── MODIFIER ── */}
            {tab==="edit"&&m&&(
              <motion.div key="edit" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{background:"#EFF6FF"}}>
                    <Pencil size={15} style={{color:"#0369A1"}}/>
                  </div>
                  <div>
                    <h3 className="font-bold" style={{color:"var(--text)"}}>Modifier le mouvement</h3>
                    <p className="text-sm" style={{color:"#0b0c0ec0"}}>Type, quantité et produit ne peuvent pas être modifiés</p>
                  </div>
                </div>

                {/* Champs en lecture seule */}
                <div className="grid grid-cols-2 gap-3">
                  <FieldLabel label="Type" hint="Non modifiable">
                    <input className="fi" value={typeInfo(m.type).label} readOnly/>
                  </FieldLabel>
                  <FieldLabel label="Quantité" hint="Non modifiable">
                    <input className="fi" value={`${Number(m.quantity)} ${m.product?.unit?.abbreviation||"u"}`} readOnly/>
                  </FieldLabel>
                </div>

                {/* Champs modifiables */}
                <FieldLabel label="Raison / Détails" icon={FileText} required error={errs.reason}>
                  <input className={`fi ${errs.reason?"err":""}`} value={ef.reason} onChange={e=>setE("reason",e.target.value)}/>
                </FieldLabel>
                <FieldLabel label="Numéro de référence" icon={Hash}>
                  <div className="relative">
                    <input className="fi" style={{paddingRight:"90px"}} value={ef.reference_number}
                      onChange={e=>setE("reference_number",e.target.value)}/>
                    <button type="button" onClick={()=>setE("reference_number",genRef())}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold flex items-center gap-1"
                      style={{color:"var(--accent)"}}>
                      <RefreshCw size={10}/>Regénérer
                    </button>
                  </div>
                </FieldLabel>

                {/* Résumé */}
                {(ef.reason!==(m.reason??"") || ef.reference_number!==(m.reference_number??""))&&(
                  <div className="rounded-xl px-4 py-3 text-sm" style={{background:"var(--accent-light)",border:"1px solid var(--accent-mid)",color:"var(--accent-dark)"}}>
                    <p className="font-semibold mb-1">Modifications :</p>
                    {ef.reason!==(m.reason??"")&&<p>· Raison modifiée</p>}
                    {ef.reference_number!==(m.reference_number??"")&&<p>· Référence : {m.reference_number??"—"} → {ef.reference_number}</p>}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button className="btn-ghost flex-1" onClick={()=>setTab("info")}>Annuler</button>
                  <button className="btn-primary flex-1" style={{background:"#2563EB",boxShadow:"none"}} onClick={handleEdit} disabled={editBusy}>
                    {editBusy?<><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full spin"/>Enregistrement…</>:<><Check size={14}/>Enregistrer</>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── SUPPRIMER ── */}
            {tab==="delete"&&m&&(
              <motion.div key="delete" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{background:"#FEF2F2"}}>
                    <Trash2 size={15} style={{color:"#DC2626"}}/>
                  </div>
                  <h3 className="text-lg font-bold" style={{color:"#DC2626"}}>Supprimer le mouvement</h3>
                </div>

                {/* Info restitution stock */}
                <div className="rounded-2xl p-4" style={{background:"#F0FDF4",border:"1px solid #BBF7D0"}}>
                  <div className="flex items-start gap-3">
                    <TrendingUp size={16} style={{color:"#166534",marginTop:2}}/>
                    <div>
                      <p className="font-semibold text-sm" style={{color:"#166534"}}>Stock automatiquement restitué</p>
                      <p className="text-sm mt-1" style={{color:"#15803D"}}>
                        La suppression de ce mouvement restituera <strong>{Number(m.quantity)} {m.product?.unit?.abbreviation||"u"}</strong> dans
                        {m.batch?<> le lot <strong>{m.batch.batch_number}</strong> et</>:""} l'inventaire théorique du produit <strong>{m.product?.name}</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl p-4" style={{background:"#FEF2F2",border:"1px solid #FCA5A5"}}>
                  <p className="text-sm font-semibold mb-2" style={{color:"#991B1B"}}>⚠ Cette action est irréversible</p>
                  <ul className="text-sm space-y-1" style={{color:"#DC2626"}}>
                    <li>· Mouvement <strong>#{m.id}</strong> ({typeInfo(m.type).label}) supprimé</li>
                    <li>· Quantité restituée : {Number(m.quantity)} {m.product?.unit?.abbreviation||"u"}</li>
                    <li>· Inventaire théorique recalculé</li>
                  </ul>
                </div>

                <FieldLabel label={`Tapez l'ID du mouvement pour confirmer`} icon={Hash} required>
                  <input className="fi" placeholder={String(m.id)} value={confirm}
                    onChange={e=>setConfirm(e.target.value)}/>
                  {confirm&&confirm!==String(m.id)&&(
                    <p className="mt-1.5 text-sm" style={{color:"#dc2626"}}>L'ID ne correspond pas</p>
                  )}
                </FieldLabel>

                <div className="flex gap-3">
                  <button className="btn-ghost flex-1" onClick={()=>{setTab("info");setConfirm("");}}>Annuler</button>
                  <button className="btn-danger flex-1" disabled={confirm!==String(m.id)||delBusy} onClick={handleDelete}>
                    {delBusy
                      ?<><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full spin"/>Suppression…</>
                      :<><Trash2 size={14}/>Supprimer et restituer</>}
                  </button>
                </div>
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
const TABLE_COLS = [
  { label:"Date",        col:"created_at", c:false },
  { label:"Produit",     col:null,         c:false },
  { label:"Quantité",    col:null,         c:true  },
  { label:"Unité",       col:null,         c:true  },
  { label:"Type",        col:null,         c:true  },
  /* { label:"Raison",      col:null,         c:false }, */
  { label:"Référence",   col:null,         c:false },
  { label:"Utilisateur", col:null,         c:false },
  { label:"",            col:null,         c:true  },
];

export default function SortiesPage(): JSX.Element {
  const { token }                       = useAuth();
  const { notif, show, notify }         = useNotify();
  const { can, isLoading: permLoading } = usePagePermissions();

  const canView   = can("SORTIE_STOCK_VIEW");
  const canCreate = can("SORTIE_STOCK_CREATE");
  const canEdit   = can("SORTIE_STOCK_EDIT");
  const canDelete = can("SORTIE_STOCK_DELETE");

  const [products,   setProducts]   = useState<Product[]>([]);
  const [units,      setUnits]      = useState<Unit[]>([]);
  const [users,      setUsers]      = useState<AppUser[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements,  setMovements]  = useState<Movement[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [listError,  setListError]  = useState("");

  const [search,      setSearch]      = useState("");
  const [typeF,       setTypeF]       = useState("");
  const [catF,        setCatF]        = useState("");
  const [prodF,       setProdF]       = useState("");
  const [userF,       setUserF]       = useState("");
  const [dateStart,   setDateStart]   = useState("");
  const [dateEnd,     setDateEnd]     = useState("");
  const [sort,        setSort]        = useState("created_at");
  const [order,       setOrder]       = useState<SortOrder>("desc");
  const [page,        setPage]        = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 10;

  const [showCreate,     setShowCreate]     = useState(false);
  const [detailMvtId,    setDetailMvtId]    = useState<number|null>(null);

  /* Init */
  useEffect(()=>{
    if(!token||!canView)return;
    fetch("/api/products",{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.ok?r.json():null)
      .then((d:any)=>{if(d?.data){setProducts(d.data.products??[]);setUnits(d.data.units??[]);setCategories(d.data.categories??[]);}})
      .catch(()=>{});
    fetch("/api/admin/users",{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.ok?r.json():null)
      .then((d:any)=>{if(d)setUsers(d.data?.users??d.users??[]);})
      .catch(()=>{});
  },[token,canView]);

  const fetchMovements = useCallback(async()=>{
    setLoading(true);
    setListError("");
    try{
      const p=new URLSearchParams();
      if(search)p.append("search",search);p.append("type",typeF||OUTGOING_TYPES);
      if(catF)p.append("category_id",catF);if(prodF)p.append("product_id",prodF);
      if(userF)p.append("user_id",userF);if(dateStart)p.append("startDate",dateStart);
      if(dateEnd)p.append("endDate",dateEnd);
      p.append("sort",sort);p.append("order",order);
      p.append("limit",String(pageSize));p.append("offset",String((page-1)*pageSize));
      const res=await fetch(`/api/stock/movements?${p}`,{headers:{Authorization:`Bearer ${token}`}});
      if(!res.ok){const d=await res.json().catch(()=>null);throw new Error(d?.error??"Impossible de charger les sorties.");}
      const d=await res.json() as any;setMovements(d.data?.movements??[]);setTotal(d.data?.total??0);
    }catch(error){setMovements([]);setTotal(0);setListError(error instanceof Error?error.message:"Erreur réseau lors du chargement des sorties.");}finally{setLoading(false);}
  },[token,search,typeF,catF,prodF,userF,dateStart,dateEnd,sort,order,page]); // eslint-disable-line

  useEffect(()=>{if(token&&canView)fetchMovements();},[fetchMovements,canView]);

  const reset=()=>{setSearch("");setTypeF("");setCatF("");setProdF("");setUserF("");setDateStart("");setDateEnd("");setPage(1);};
  const toggleSort=(col:string)=>{if(sort===col)setOrder(o=>o==="asc"?"desc":"asc");else{setSort(col);setOrder("desc");}};
  const totalPages=Math.max(1,Math.ceil(total/pageSize));
  const activeF=[search,typeF,catF,prodF,userF,dateStart,dateEnd].filter(Boolean).length;

  const userName=(m:Movement):string=>{
    if(m.user?.fullName)return m.user.fullName;
    return users.find(u=>String(u.id)===String(m.user_id))?.fullName??"—";
  };

  const fetchAllMovements = async (): Promise<Movement[]> => {
    try {
      const p=new URLSearchParams();
      if(search)p.append("search",search);p.append("type",typeF||OUTGOING_TYPES);
      if(catF)p.append("category_id",catF);if(prodF)p.append("product_id",prodF);
      if(userF)p.append("user_id",userF);if(dateStart)p.append("startDate",dateStart);
      if(dateEnd)p.append("endDate",dateEnd);
      p.append("sort",sort);p.append("order",order);
      p.append("limit","10000");p.append("offset","0");
      const res=await fetch(`/api/stock/movements?${p}`,{headers:{Authorization:`Bearer ${token}`}});
      if(res.ok){const d=await res.json() as any;return d.data?.movements??[];}
    }catch{}
    return [];
  };

  const doExportXLSX = async () => {
    try {
            const allMovements = await fetchAllMovements();
      if(allMovements.length===0){notify('error','Aucune donnee a exporter');return;}
      const res = await fetch('/api/exports/exits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ format: 'xlsx', items: allMovements }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sorties-stock-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notify('success', `Export XLSX reussi ! ${allMovements.length} lignes exportees`);
    } catch {
      notify('error', 'Erreur lors de l\'export XLSX');
    }
  };

  const doExportPDF = async () => {
    try {
            const allMovements = await fetchAllMovements();
      if(allMovements.length===0){notify('error','Aucune donnee a exporter');return;}
      const res = await fetch('/api/exports/exits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ format: 'pdf', items: allMovements }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sorties-stock-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notify('success', `Export PDF reussi ! ${allMovements.length} lignes exportees`);
    } catch {
      notify('error', 'Erreur lors de l\'export PDF');
    }
  };

  /* Guard accès */
  if(!permLoading&&!canView)return(
    <SidebarLayout><Fonts/><style>{CSS}</style>
      <div className="min-h-screen flex items-center justify-center" style={{background:"var(--bg)"}}>
        <AccessDenied permission="SORTIE_STOCK_VIEW"/>
      </div>
    </SidebarLayout>
  );

  return (
    <SidebarLayout>
      <Fonts/>
      <style>{CSS}</style>
      <Toast show={show} notif={notif}/>

      <main className="min-h-screen pb-28 p-4 sm:p-6 lg:p-8" style={{ background:"var(--bg)", color:"var(--text)" }}>
        <div className="max-w-7xl mx-auto">

          {/* ── Header ── */}
          <motion.header initial={{opacity:0,y:-14}} animate={{opacity:1,y:0}} transition={{duration:.38}}
            className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[12px] tracking-[.28em] uppercase font-medium mb-2" style={{color:"#0b0c0ec0"}}>Gestion de stock</p>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">Sorties de stock</h1>
              <p className="mt-1.5 text-sm flex flex-wrap items-center gap-2" style={{color:"#0b0c0ec0"}}>
                <span>FIFO · Pertes · Péremptions · Ajustements</span>
                {total>0&&<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-semibold" style={{background:"var(--accent-light)",color:"var(--accent)"}}>{total} mouvements</span>}
                <span className="ml-auto hidden sm:flex items-center gap-1">
                  {canCreate&&<span className="stat-pill tag-red">+ Créer</span>}
                  {canEdit&&<span className="stat-pill tag-blue">✎ Modifier</span>}
                  {canDelete&&<span className="stat-pill" style={{background:"#FEF2F2",color:"#991B1B",border:"1px solid #FCA5A5"}}>✕ Supprimer</span>}
                </span>
              </p>
            </div>
            {canCreate?(
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:.97}} onClick={()=>setShowCreate(true)} className="btn-primary">
                <ArrowUpFromLine size={15}/>Nouvelle sortie
              </motion.button>
            ):(
              <button disabled title="Permission STOCK_CREATE requise" className="btn-locked" style={{padding:"10px 20px",borderRadius:"12px"}}>
                <Lock size={14}/>Nouvelle sortie
              </button>
            )}
          </motion.header>

          {/* ── Filtres ── */}
          <SectionLabel icon={Search} text="Filtres & recherche"/>
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.05}}
            className="mb-8 rounded-2xl overflow-hidden" style={{border:"1.5px solid var(--border)",background:"var(--surface)"}}>
            <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
              <div className="relative flex-1 min-w-[160px]">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{color:"#0b0c0ec0"}}/>
                <input className="fi" style={{paddingLeft:"38px"}} placeholder="Produit, référence, raison…"
                  value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
              </div>
              <button className="btn-ghost flex-shrink-0" onClick={()=>setShowFilters(v=>!v)}>
                <Search size={13}/><span className="hidden sm:inline">Filtres avancés</span>
                {activeF>0&&<span className="flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-bold" style={{background:"var(--accent)",color:"#fff"}}>{activeF}</span>}
                <ChevronDown size={13} style={{transform:showFilters?"rotate(180deg)":"",transition:"transform .2s"}}/>
              </button>
              <button className="btn-ghost flex-shrink-0" onClick={fetchMovements} disabled={loading}>
                <RefreshCw size={13} className={loading?"spin":""}/>
                <span className="hidden sm:inline">Actualiser</span>
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
              {showFilters&&(
                <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}}
                  exit={{height:0,opacity:0}} transition={{duration:.3}} className="overflow-hidden">
                  <div className="px-4 sm:px-5 pb-5 pt-1" style={{borderTop:"1px solid var(--border)"}}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                      <div>
                        <p className="text-[12px] font-semibold tracking-[.1em] uppercase mb-1.5" style={{color:"#0b0c0ec0"}}>Type</p>
                        <select className="fi" value={typeF} onChange={e=>{setTypeF(e.target.value);setPage(1);}}>
                          <option value="">Tous types de sortie</option>
                          {MOVEMENT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      {([
                        {label:"Catégorie",val:catF, setter:setCatF, opts:categories.map(c=>({v:String(c.id),l:c.name})),    ph:"Toutes catégories"},
                        {label:"Produit",  val:prodF,setter:setProdF,opts:products.map(p=>({v:String(p.id),l:p.name})),     ph:"Tous produits"},
                        {label:"Utilisateur",val:userF,setter:setUserF,opts:users.map(u=>({v:String(u.id),l:u.fullName})), ph:"Tous"},
                      ] as const).map(({label,val,setter,opts,ph})=>(
                        <div key={label}>
                          <p className="text-[12px] font-semibold tracking-[.1em] uppercase mb-1.5" style={{color:"#0b0c0ec0"}}>{label}</p>
                          <select className="fi" value={val} onChange={e=>{setter(e.target.value);setPage(1);}}>
                            <option value="">{ph}</option>
                            {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                          </select>
                        </div>
                      ))}
                      <div>
                        <p className="text-[12px] font-semibold tracking-[.1em] uppercase mb-1.5" style={{color:"#0b0c0ec0"}}>Période</p>
                        <div className="flex items-center gap-1.5">
                          <input type="date" className="fi flex-1 min-w-0" value={dateStart} onChange={e=>{setDateStart(e.target.value);setPage(1);}}/>
                          <span className="text-sm shrink-0" style={{color:"#0b0c0ec0"}}>—</span>
                          <input type="date" className="fi flex-1 min-w-0" value={dateEnd} onChange={e=>{setDateEnd(e.target.value);setPage(1);}}/>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4" style={{borderTop:"1px solid var(--border)"}}>
                      <span className="text-sm" style={{color:"#0b0c0ec0"}}>{total} résultat{total>1?"s":""}</span>
                      <button className="btn-ghost" onClick={reset}><X size={12}/>Réinitialiser</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Tableau ── */}
          {listError&&<div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{listError}</span><button className="btn-ghost" onClick={fetchMovements}>Réessayer</button></div>}
          <SectionLabel icon={ArrowUpFromLine} text="Historique des sorties"/>
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.1}}
            className="rounded-2xl overflow-hidden" style={{border:"1.5px solid var(--border)",background:"var(--surface)"}}>
            {loading&&(
              <div className="h-0.5 w-full overflow-hidden" style={{background:"var(--border)"}}>
                <motion.div className="h-full" style={{background:"var(--accent)"}}
                  initial={{x:"-100%"}} animate={{x:"100%"}} transition={{repeat:Infinity,duration:1.2,ease:"linear"}}/>
              </div>
            )}

            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr style={{borderBottom:"1.5px solid var(--border)",background:"var(--bg)"}}>
                    {TABLE_COLS.map((h,i)=>(
                      <th key={i} onClick={h.col?()=>toggleSort(h.col as string):undefined}
                        className={`px-5 py-3.5 text-[12px] font-semibold tracking-[.14em] uppercase ${h.c?"text-center":"text-left"} ${h.col?"cursor-pointer select-none":""}`}
                        style={{color:"#0b0c0ec0"}}>
                        <span className="inline-flex items-center gap-1">
                          {h.label}
                          {h.col&&sort===h.col&&(order==="asc"?<ChevronUp size={10} style={{color:"var(--accent)"}}/>:<ChevronDown size={10} style={{color:"var(--accent)"}}/>)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading&&movements.length===0
                    ?[...Array(5)].map((_,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid var(--border)"}}>
                        {[...Array(9)].map((_,j)=><td key={j} className="px-5 py-4"><div className="sk h-4 rounded" style={{width:`${50+Math.random()*40}%`}}/></td>)}
                      </tr>
                    ))
                    :listError
                    ?<tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-red-700">Le chargement a échoué. Réessayez après avoir vérifié la connexion.</td></tr>
                    :movements.length===0
                    ?<tr><td colSpan={9} className="px-5 py-16 text-center">
                      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-3">
                        <div className="flex justify-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{background:"var(--surface-2)"}}>
                            <ArrowUpFromLine size={22} style={{color:"#0b0c0ec0"}}/>
                          </div>
                        </div>
                        <p className="serif text-lg" style={{color:"var(--text-2)"}}>Aucune sortie trouvée</p>
                        {canCreate&&<button className="btn-primary mx-auto" onClick={()=>setShowCreate(true)}><ArrowUpFromLine size={14}/>Nouvelle sortie</button>}
                      </motion.div>
                    </td></tr>
                    :movements.map((m,idx)=>{
                      const ti=typeInfo(m.type);
                      return (
                        <AnimRow key={m.id} delay={idx*0.025} onClick={()=>setDetailMvtId(m.id)}>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar size={13} style={{color:"#0b0c0ec0"}}/>
                              <span className="text-sm" style={{color:"var(--text-2)"}}>{new Date(m.created_at).toLocaleString("fr-FR")}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4"><span className="font-medium" style={{color:"var(--text)"}}>{m.product?.name??"—"}</span></td>
                          <td className="px-5 py-4 text-center"><span className="font-medium" style={{color:"var(--accent)"}}>{m.quantity}</span></td>
                          <td className="px-5 py-4 text-center"><span className="text-sm" style={{color:"#0b0c0ec0"}}>{m.product?.unit?.abbreviation??m.product?.unit?.name??"—"}</span></td>
                          <td className="px-5 py-4 text-center"><Tag label={ti.label} color={ti.tag}/></td>
                          {/* <td className="px-5 py-4 max-w-[180px]"><span className="block truncate text-sm" style={{color:"var(--text-2)"}}>{m.reason??"—"}</span></td> */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <Hash size={11} style={{color:"#0b0c0ec0"}}/>
                              <span className="text-[13px] truncate max-w-[120px]" style={{color:"var(--text-2)"}}>{m.reference_number??"—"}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full shrink-0" style={{background:"var(--surface-2)"}}>
                                <User size={11} style={{color:"#0b0c0ec0"}}/>
                              </div>
                              <span className="text-sm truncate max-w-[90px]" style={{color:"var(--text-2)"}}>{userName(m)}</span>
                            </div>
                          </td>
                          {/* Actions */}
                          <td className="px-5 py-4" onClick={ev=>ev.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button className="btn-icon" title="Voir" onClick={()=>setDetailMvtId(m.id)}><Eye size={13}/></button>
                              {canEdit   &&<button className="btn-icon edit" title="Modifier"  onClick={()=>setDetailMvtId(m.id)}><Pencil size={13}/></button>}
                              {canDelete &&<button className="btn-icon del"  title="Supprimer" onClick={()=>setDetailMvtId(m.id)}><Trash2 size={13}/></button>}
                            </div>
                          </td>
                        </AnimRow>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden">
              {loading&&movements.length===0
                ?<div className="p-4 space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="sk h-28 rounded-2xl"/>)}</div>
                :listError
                ?<div className="p-10 text-center text-sm text-red-700">Chargement impossible. Utilisez « Réessayer ».</div>
                :movements.length===0
                ?<div className="p-10 text-center space-y-3">
                  <ArrowUpFromLine size={24} style={{color:"#0b0c0ec0",margin:"0 auto"}}/>
                  <p className="serif" style={{color:"var(--text-2)"}}>Aucune sortie</p>
                  {canCreate&&<button className="btn-primary mx-auto" onClick={()=>setShowCreate(true)}><ArrowUpFromLine size={14}/>Ajouter</button>}
                </div>
                :<div className="divide-y" style={{borderColor:"var(--border)"}}>
                  {movements.map((m,idx)=>{
                    const ti=typeInfo(m.type);
                    return (
                      <motion.div key={m.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:idx*0.04}}
                        className="p-4 sm:p-5 space-y-3 cursor-pointer" onClick={()=>setDetailMvtId(m.id)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium" style={{color:"var(--text)"}}>{m.product?.name??"—"}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Calendar size={11} style={{color:"#0b0c0ec0"}}/>
                              <span className="text-sm" style={{color:"#0b0c0ec0"}}>{new Date(m.created_at).toLocaleDateString("fr-FR")}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Tag label={ti.label} color={ti.tag}/>
                            <button className="btn-icon" onClick={ev=>{ev.stopPropagation();setDetailMvtId(m.id);}}><Eye size={12}/></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div><p className="mb-0.5" style={{color:"#0b0c0ec0"}}>Quantité</p>
                            <p className="serif text-base" style={{color:"var(--accent)"}}>{m.quantity} <span style={{color:"#0b0c0ec0",fontSize:11}}>{m.product?.unit?.abbreviation??""}</span></p>
                          </div>
                          <div><p className="mb-0.5" style={{color:"#0b0c0ec0"}}>Utilisateur</p><p style={{color:"var(--text-2)"}}>{userName(m)}</p></div>
                          <div><p className="mb-0.5" style={{color:"#0b0c0ec0"}}>Référence</p><p className="text-[13px] truncate" style={{color:"var(--text-2)"}}>{m.reference_number??"—"}</p></div>
                        </div>
                        {m.reason&&<p className="text-sm italic" style={{color:"#0b0c0ec0"}}>{m.reason}</p>}
                      </motion.div>
                    );
                  })}
                </div>
              }
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{borderTop:"1.5px solid var(--border)",background:"var(--bg)"}}>
              <p className="text-sm" style={{color:"#0b0c0ec0"}}>{total} sortie{total>1?"s":""} · Page {page}/{totalPages}</p>
              <div className="flex items-center gap-2">
                <button className="btn-ghost" disabled={page===1} onClick={()=>setPage(p=>p-1)} style={{padding:"7px 12px"}}>
                  <ChevronLeft size={14}/><span className="hidden sm:inline text-sm">Préc.</span>
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(totalPages,5))].map((_,i)=>{const pg=i+1;return(
                    <button key={pg} onClick={()=>setPage(pg)} className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-medium transition"
                      style={{background:page===pg?"var(--accent)":"transparent",color:page===pg?"#fff":"var(--text-2)",border:page===pg?"none":"1.5px solid var(--border)"}}>
                      {pg}
                    </button>
                  );})}
                  {totalPages>5&&<span className="text-sm" style={{color:"#0b0c0ec0"}}>…</span>}
                </div>
                <button className="btn-ghost" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} style={{padding:"7px 12px"}}>
                  <span className="hidden sm:inline text-sm">Suiv.</span><ChevronRight size={14}/>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Bandeau FIFO */}
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.22}}
            className="mt-8 rounded-2xl p-5 sm:p-6" style={{background:"#FFFBEB",border:"1.5px solid #FDE68A"}}>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{background:"#FEF3C7"}}>
                <Info size={17} style={{color:"#B45309"}}/>
              </div>
              <div>
                <p className="font-semibold mb-1" style={{color:"#78350F"}}>Déduction FIFO — Premier entré, premier sorti</p>
                <p className="text-sm leading-relaxed" style={{color:"#92400E"}}>
                  Lors d'une sortie, le système consomme automatiquement le lot le plus ancien en premier. La suppression d'un mouvement restitue automatiquement la quantité dans le lot et recalcule l'inventaire théorique.
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      <CreateModal show={showCreate} onClose={()=>setShowCreate(false)} products={products} units={units}
        token={token} onSuccess={fetchMovements} notify={notify} canCreate={canCreate}/>

      <DetailModal movementId={detailMvtId} token={token} canEdit={canEdit} canDelete={canDelete}
        onClose={()=>setDetailMvtId(null)} onRefresh={fetchMovements} notify={notify}/>
    </SidebarLayout>
  );
}
