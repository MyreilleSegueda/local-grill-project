"use client";
import SidebarLayoutAdmin from "@/src/navbar/SidebarLayoutAdmin";
import { useAuth } from "@/lib/hooks/useAuth";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Cog6ToothIcon, TagIcon, BeakerIcon , CubeIcon,
  CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon,
  PlusIcon, PencilSquareIcon, TrashIcon, ArrowPathIcon,
  BuildingStorefrontIcon, EnvelopeIcon, PhoneIcon, MapPinIcon,
  CurrencyDollarIcon, GlobeAltIcon, ShieldCheckIcon, ClockIcon,
  CheckIcon, InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { Utensils } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Category { id: number; name: string; description?: string | null; is_active: boolean; _count?: { products: number } }
interface MaterialCategory { id: number; name: string; description?: string | null; is_active: boolean; _count?: { materiels: number } }
interface Unit     { id: number; name: string; abbreviation: string; description?: string | null; _count?: { products: number } }
type Tab       = "general" | "categories" | "units" | "inventory-email";
type CategorySubTab = "products" | "materials";
type ToastType = "success" | "error" | "info";
type ModalKind = "add" | "edit" | "delete" | null;

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const cfg = {
    success: { bg: "bg-[#009B4D]",  icon: <CheckCircleIcon className="w-4 h-4 flex-shrink-0" /> },
    error:   { bg: "bg-red-600",    icon: <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" /> },
    info:    { bg: "bg-slate-700",  icon: <InformationCircleIcon className="w-4 h-4 flex-shrink-0" /> },
  }[type];
  return (
    <motion.div initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white max-w-sm ${cfg.bg}`}>
      {cfg.icon}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100 flex-shrink-0"><XMarkIcon className="w-4 h-4" /></button>
    </motion.div>
  );
}

// ─── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, subtitle, icon, children }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  icon?: React.ReactNode; children: React.ReactNode;
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800">
              {icon && <div className="p-2 rounded-xl bg-[#009B4D]/10 text-[#009B4D] flex-shrink-0">{icon}</div>}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
                {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Shared ────────────────────────────────────────────────────────────────────
const inputCls = `w-full px-3.5 py-2.5 rounded-xl text-sm
  bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
  text-gray-900 dark:text-gray-100 placeholder-gray-400
  focus:outline-none focus:ring-2 focus:ring-[#009B4D]/30 focus:border-[#009B4D]
  transition-all duration-200`;
const labelCls = "block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5";

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-slate-800">
        <span className="text-[#009B4D]">{icon}</span>
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold
                 bg-[#009B4D] hover:bg-[#007A3D] disabled:opacity-50 text-white
                 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all duration-200">
      {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
      {loading ? "Enregistrement…" : label}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} role="switch" aria-checked={checked}
      className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-200 flex-shrink-0 ${checked ? "bg-[#009B4D]" : "bg-gray-200 dark:bg-slate-700"}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </div>
  );
}

function ProductCountBadge({ count }: { count: number }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[13px] font-semibold border
      ${count > 0
        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40"
        : "bg-gray-50 text-gray-400 border-gray-200 dark:bg-slate-800 dark:text-gray-500 dark:border-slate-700"}`}>
      <CubeIcon className="w-3 h-3" />
      {count} produit{count !== 1 ? "s" : ""}
    </span>
  );
}

function DeleteModal({ open, name, productCount, loading, onClose, onConfirm }: {
  open: boolean; name: string; productCount: number; loading: boolean;
  onClose: () => void; onConfirm: () => void;
}) {
  const blocked = productCount > 0;
  return (
    <Modal open={open} onClose={onClose} title="Confirmer la suppression"
      icon={<TrashIcon className="w-5 h-5 text-red-500" />}>
      <div className="space-y-4">
        {blocked ? (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Suppression impossible</p>
                <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                  <strong>« {name} »</strong> est utilisé(e) par <strong>{productCount} produit{productCount > 1 ? "s" : ""}</strong>.
                  Réassignez ou supprimez ces produits avant de continuer.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
            <p className="text-sm text-red-700 dark:text-red-400">
              Supprimer <strong>« {name} »</strong> ? Cette action est irréversible.
            </p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-all">
            {blocked ? "Fermer" : "Annuler"}
          </button>
          {!blocked && (
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 active:scale-[0.98]">
              {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <TrashIcon className="w-4 h-4" />}
              {loading ? "Suppression…" : "Supprimer"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB GENERAL
// ═══════════════════════════════════════════════════════════
function TabGeneral({ token, showToast }: { token: string | null; showToast: (m: string, t?: ToastType) => void }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json()).then(setSettings)
      .catch(() => showToast("Erreur chargement paramètres", "error"))
      .finally(() => setLoading(false));
  }, [token]);

  const set = (key: string, v: string) => setSettings(s => ({ ...s, [key]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      showToast("Paramètres enregistrés");
    } catch { showToast("Erreur lors de la sauvegarde", "error"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />)}</div>;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <SectionCard title="Informations de l'application" icon={<BuildingStorefrontIcon className="w-5 h-5" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1.5"><BuildingStorefrontIcon className="w-3.5 h-3.5 text-gray-400" />Nom de l'application</span></label>
            <input className={inputCls} type="text" placeholder="Mon Application" value={settings.appName || ""} onChange={e => set("appName", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1.5"><GlobeAltIcon className="w-3.5 h-3.5 text-gray-400" />Site web</span></label>
            <input className={inputCls} type="url" placeholder="https://exemple.com" value={settings.website || ""} onChange={e => set("website", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1.5"><CurrencyDollarIcon className="w-3.5 h-3.5 text-gray-400" />Devise</span></label>
            <select className={inputCls} value={settings.currency || "XOF"} onChange={e => set("currency", e.target.value)}>
              <option value="XOF">XOF — Franc CFA (BCEAO)</option>
              <option value="XAF">XAF — Franc CFA (BEAC)</option>
              <option value="EUR">EUR — Euro</option>
              <option value="USD">USD — Dollar américain</option>
              <option value="GNF">GNF — Franc guinéen</option>
            </select>
          </div>
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1.5"><GlobeAltIcon className="w-3.5 h-3.5 text-gray-400" />Langue</span></label>
            <select className={inputCls} value={settings.language || "fr"} onChange={e => set("language", e.target.value)}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}><span className="inline-flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5 text-gray-400" />Fuseau horaire</span></label>
            <select className={inputCls} value={settings.timezone || "Africa/Ouagadougou"} onChange={e => set("timezone", e.target.value)}>
              {["Africa/Abidjan","Africa/Dakar","Africa/Bamako","Africa/Ouagadougou","Africa/Niamey","Africa/Lagos","Africa/Accra","Europe/Paris"].map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Contact & Support" icon={<EnvelopeIcon className="w-5 h-5" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1.5"><EnvelopeIcon className="w-3.5 h-3.5 text-gray-400" />Email support</span></label>
            <input className={inputCls} type="email" placeholder="support@exemple.com" value={settings.supportEmail || ""} onChange={e => set("supportEmail", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1.5"><EnvelopeIcon className="w-3.5 h-3.5 text-gray-400" />Email alertes</span></label>
            <input className={inputCls} type="email" placeholder="alertes@exemple.com" value={settings.alertEmail || ""} onChange={e => set("alertEmail", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1.5"><PhoneIcon className="w-3.5 h-3.5 text-gray-400" />Téléphone</span></label>
            <input className={inputCls} type="tel" placeholder="+226 00 00 00 00" value={settings.phone || ""} onChange={e => set("phone", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1.5"><MapPinIcon className="w-3.5 h-3.5 text-gray-400" />Adresse</span></label>
            <input className={inputCls} type="text" placeholder="Rue, Ville, Pays" value={settings.address || ""} onChange={e => set("address", e.target.value)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Stock & Alertes" icon={<ShieldCheckIcon className="w-5 h-5" />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1.5"><ExclamationTriangleIcon className="w-3.5 h-3.5 text-gray-400" />Alerte stock bas (jours)</span></label>
            <input className={inputCls} type="number" min="1" placeholder="7" value={settings.lowStockDays || ""} onChange={e => set("lowStockDays", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5 text-gray-400" />Alerte expiration (jours)</span></label>
            <input className={inputCls} type="number" min="1" placeholder="30" value={settings.expirationAlertDays || ""} onChange={e => set("expirationAlertDays", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1.5"><ShieldCheckIcon className="w-3.5 h-3.5 text-gray-400" />Durée session (min)</span></label>
            <input className={inputCls} type="number" min="1" placeholder="60" value={settings.sessionDurationMinutes || ""} onChange={e => set("sessionDurationMinutes", e.target.value)} />
          </div>
        </div>
        <div className="space-y-3">
          {[
            { key: "enableEmailAlerts", label: "Alertes par email activées" },
            { key: "maintenanceMode",   label: "Mode maintenance (bloque les connexions utilisateurs)" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 cursor-pointer">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
              <Toggle checked={settings[key] === "true"} onChange={() => set(key, settings[key] === "true" ? "false" : "true")} />
            </label>
          ))}
        </div>
      </SectionCard>

      <div className="max-w-xs">
        <SubmitBtn loading={saving} label="Enregistrer les paramètres" />
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════
// CATEGORY FORM
// ═══════════════════════════════════════════════════════════
function CategoryForm({ form, setForm, saving, onSubmit, isEdit }: {
  form: { name: string; description: string; is_active: boolean };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; description: string; is_active: boolean }>>;
  saving: boolean; onSubmit: (e: React.FormEvent) => void; isEdit: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Nom <span className="text-red-400">*</span></label>
        <input className={inputCls} required autoFocus placeholder="ex: Épices, Légumes, Boissons…"
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Description optionnelle…"
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <label className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 cursor-pointer">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Catégorie active</span>
        <Toggle checked={form.is_active} onChange={() => setForm(f => ({ ...f, is_active: !f.is_active }))} />
      </label>
      <SubmitBtn loading={saving} label={isEdit ? "Enregistrer" : "Créer la catégorie"} />
    </form>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB CATEGORIES — with sub-tabs for Products and Materials
// ═══════════════════════════════════════════════════════════
function TabCategories({ token, showToast }: { token: string | null; showToast: (m: string, t?: ToastType) => void }) {
  const [subTab, setSubTab] = useState<CategorySubTab>("products");
  
  // Product categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProd, setLoadingProd] = useState(true);
  const [modalProd, setModalProd] = useState<ModalKind>(null);
  const [selectedProd, setSelectedProd] = useState<Category | null>(null);
  const [formProd, setFormProd] = useState({ name: "", description: "", is_active: true });
  const [savingProd, setSavingProd] = useState(false);
  const [searchProd, setSearchProd] = useState("");

  // Material categories state
  const [matCategories, setMatCategories] = useState<MaterialCategory[]>([]);
  const [loadingMat, setLoadingMat] = useState(true);
  const [modalMat, setModalMat] = useState<ModalKind>(null);
  const [selectedMat, setSelectedMat] = useState<MaterialCategory | null>(null);
  const [formMat, setFormMat] = useState({ name: "", description: "", is_active: true });
  const [savingMat, setSavingMat] = useState(false);
  const [searchMat, setSearchMat] = useState("");

  const hdrs = useMemo(() => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  // Load product categories
  const loadProd = useCallback(async () => {
    setLoadingProd(true);
    try {
      const data = await (await fetch("/api/admin/settings/categories", { headers: token ? { Authorization: `Bearer ${token}` } : {} })).json();
      setCategories(Array.isArray(data) ? data : []);
    } catch { showToast("Erreur chargement catégories produits", "error"); }
    finally { setLoadingProd(false); }
  }, [token]);

  // Load material categories
  const loadMat = useCallback(async () => {
    setLoadingMat(true);
    try {
      const res = await fetch("/api/materiels/categories", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const json = await res.json();
      setMatCategories(json.data?.categories || []);
    } catch { showToast("Erreur chargement catégories matériels", "error"); }
    finally { setLoadingMat(false); }
  }, [token]);

  useEffect(() => { loadProd(); loadMat(); }, [loadProd, loadMat]);

  // Product category handlers
  const openAddProd = () => { setFormProd({ name: "", description: "", is_active: true }); setModalProd("add"); };
  const openEditProd = (c: Category) => { setSelectedProd(c); setFormProd({ name: c.name, description: c.description || "", is_active: c.is_active }); setModalProd("edit"); };
  const openDelProd = (c: Category) => { setSelectedProd(c); setModalProd("delete"); };

  const handleSaveProd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProd.name.trim()) return;
    setSavingProd(true);
    try {
      const isEdit = modalProd === "edit";
      const res = await fetch(
        isEdit ? `/api/admin/settings/categories/${selectedProd!.id}` : "/api/admin/settings/categories",
        { method: isEdit ? "PUT" : "POST", headers: hdrs, body: JSON.stringify(formProd) }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur lors de l'enregistrement");
      showToast(isEdit ? "Catégorie modifiée" : "Catégorie créée");
      setModalProd(null); loadProd();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setSavingProd(false); }
  };

  const handleDeleteProd = async () => {
    if (!selectedProd) return;
    setSavingProd(true);
    try {
      const res = await fetch(`/api/admin/settings/categories/${selectedProd.id}`, { method: "DELETE", headers: hdrs });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur lors de la suppression");
      showToast("Catégorie supprimée"); setModalProd(null); loadProd();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setSavingProd(false); }
  };

  // Material category handlers
  const openAddMat = () => { setFormMat({ name: "", description: "", is_active: true }); setModalMat("add"); };
  const openEditMat = (c: MaterialCategory) => { setSelectedMat(c); setFormMat({ name: c.name, description: c.description || "", is_active: c.is_active }); setModalMat("edit"); };
  const openDelMat = (c: MaterialCategory) => { setSelectedMat(c); setModalMat("delete"); };

  const handleSaveMat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMat.name.trim()) return;
    setSavingMat(true);
    try {
      const isEdit = modalMat === "edit";
      const res = await fetch(
        isEdit ? `/api/materiels/categories/${selectedMat!.id}` : "/api/materiels/categories",
        { method: isEdit ? "PUT" : "POST", headers: hdrs, body: JSON.stringify(formMat) }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur lors de l'enregistrement");
      showToast(isEdit ? "Catégorie modifiée" : "Catégorie créée");
      setModalMat(null); loadMat();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setSavingMat(false); }
  };

  const handleDeleteMat = async () => {
    if (!selectedMat) return;
    setSavingMat(true);
    try {
      const res = await fetch(`/api/materiels/categories/${selectedMat.id}`, { method: "DELETE", headers: hdrs });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur lors de la suppression");
      showToast("Catégorie supprimée"); setModalMat(null); loadMat();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setSavingMat(false); }
  };

  const filteredProd = useMemo(() =>
    categories.filter(c => c.name.toLowerCase().includes(searchProd.toLowerCase()) || (c.description || "").toLowerCase().includes(searchProd.toLowerCase())),
    [categories, searchProd]
  );

  const filteredMat = useMemo(() =>
    matCategories.filter(c => c.name.toLowerCase().includes(searchMat.toLowerCase()) || (c.description || "").toLowerCase().includes(searchMat.toLowerCase())),
    [matCategories, searchMat]
  );

  // Material count badge component
  function MaterialCountBadge({ count }: { count: number }) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[13px] font-semibold border
        ${count > 0
          ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/40"
          : "bg-gray-50 text-gray-400 border-gray-200 dark:bg-slate-800 dark:text-gray-500 dark:border-slate-700"}`}>
        <Utensils  className="w-3 h-3" />
        {count} matériel{count !== 1 ? "s" : ""}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700 w-fit">
        <button
          onClick={() => setSubTab("products")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            subTab === "products"
              ? "bg-white dark:bg-slate-900 text-[#009B4D] shadow-sm border border-gray-200 dark:border-slate-700"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}>
          <CubeIcon className="w-4 h-4"/>Catégories de produits
        </button>
        <button
          onClick={() => setSubTab("materials")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            subTab === "materials"
              ? "bg-white dark:bg-slate-900 text-orange-600 shadow-sm border border-gray-200 dark:border-slate-700"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}>
          <Utensils  className="w-4 h-4"/>Catégories de matériels
        </button>
      </div>

      {/* Product Categories Content */}
      {subTab === "products" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <input className={`${inputCls} pl-9`} placeholder="Rechercher…" value={searchProd} onChange={e => setSearchProd(e.target.value)} />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
              {searchProd && <button onClick={() => setSearchProd("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XMarkIcon className="w-4 h-4"/></button>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadProd} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-[#009B4D] hover:border-[#009B4D] transition-all">
                <ArrowPathIcon className={`w-4 h-4 ${loadingProd ? "animate-spin" : ""}`} />
              </button>
              <button onClick={openAddProd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#009B4D] hover:bg-[#007A3D] text-white text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
                <PlusIcon className="w-4 h-4"/>Nouvelle catégorie
              </button>
            </div>
          </div>

          {!loadingProd && (
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{categories.length} catégorie{categories.length !== 1 ? "s" : ""} au total</span>
              <span>·</span>
              <span className="text-emerald-600">{categories.filter(c => c.is_active).length} active{categories.filter(c => c.is_active).length !== 1 ? "s" : ""}</span>
              {searchProd && <><span>·</span><span>{filteredProd.length} résultat{filteredProd.length !== 1 ? "s" : ""}</span></>}
            </div>
          )}

          {loadingProd ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse"/>)}</div>
          ) : filteredProd.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><TagIcon className="w-10 h-10 mx-auto mb-3 opacity-30"/><p className="text-sm font-medium">{searchProd ? "Aucune catégorie trouvée" : "Aucune catégorie — créez-en une !"}</p></div>
          ) : (
            <motion.div className="space-y-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
              {filteredProd.map(cat => (
                <motion.div key={cat.id}
                  variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.25 } } }}
                  className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-[#009B4D]/10 flex items-center justify-center flex-shrink-0">
                    <TagIcon className="w-5 h-5 text-[#009B4D]"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{cat.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[12px] font-bold border ${cat.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40"
                        : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-700"}`}>
                        {cat.is_active ? "Active" : "Inactive"}
                      </span>
                      <ProductCountBadge count={cat._count?.products ?? 0}/>
                    </div>
                    {cat.description && <p className="text-sm text-gray-400 mt-0.5 truncate">{cat.description}</p>}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                    <button onClick={() => openEditProd(cat)} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-all">
                      <PencilSquareIcon className="w-4 h-4"/>
                    </button>
                    <button onClick={() => openDelProd(cat)}
                      title={(cat._count?.products ?? 0) > 0 ? `Utilisée par ${cat._count!.products} produit(s)` : "Supprimer"}
                      className={`p-2 rounded-xl transition-all border ${(cat._count?.products ?? 0) > 0
                        ? "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600 cursor-not-allowed"
                        : "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/40 text-red-400 hover:text-red-600"}`}>
                      <TrashIcon className="w-4 h-4"/>
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          <Modal open={modalProd === "add"} onClose={() => setModalProd(null)} title="Nouvelle catégorie" subtitle="Créer une catégorie de produits" icon={<TagIcon className="w-5 h-5"/>}>
            <CategoryForm form={formProd} setForm={setFormProd} saving={savingProd} onSubmit={handleSaveProd} isEdit={false}/>
          </Modal>
          <Modal open={modalProd === "edit"} onClose={() => setModalProd(null)} title="Modifier la catégorie" subtitle={selectedProd ? `« ${selectedProd.name} »` : ""} icon={<PencilSquareIcon className="w-5 h-5"/>}>
            <CategoryForm form={formProd} setForm={setFormProd} saving={savingProd} onSubmit={handleSaveProd} isEdit={true}/>
          </Modal>
          <DeleteModal open={modalProd === "delete"} name={selectedProd?.name || ""} productCount={selectedProd?._count?.products ?? 0} loading={savingProd} onClose={() => setModalProd(null)} onConfirm={handleDeleteProd}/>
        </>
      )}

      {/* Material Categories Content */}
      {subTab === "materials" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <input className={`${inputCls} pl-9`} placeholder="Rechercher…" value={searchMat} onChange={e => setSearchMat(e.target.value)} />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
              {searchMat && <button onClick={() => setSearchMat("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XMarkIcon className="w-4 h-4"/></button>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadMat} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-orange-600 hover:border-orange-600 transition-all">
                <ArrowPathIcon className={`w-4 h-4 ${loadingMat ? "animate-spin" : ""}`} />
              </button>
              <button onClick={openAddMat} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95">
                <PlusIcon className="w-4 h-4"/>Nouvelle catégorie
              </button>
            </div>
          </div>

          {!loadingMat && (
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{matCategories.length} catégorie{matCategories.length !== 1 ? "s" : ""} au total</span>
              <span>·</span>
              <span className="text-orange-600">{matCategories.filter(c => c.is_active).length} active{matCategories.filter(c => c.is_active).length !== 1 ? "s" : ""}</span>
              {searchMat && <><span>·</span><span>{filteredMat.length} résultat{filteredMat.length !== 1 ? "s" : ""}</span></>}
            </div>
          )}

          {loadingMat ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse"/>)}</div>
          ) : filteredMat.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><Utensils  className="w-10 h-10 mx-auto mb-3 opacity-30"/><p className="text-sm font-medium">{searchMat ? "Aucune catégorie trouvée" : "Aucune catégorie — créez-en une !"}</p></div>
          ) : (
            <motion.div className="space-y-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
              {filteredMat.map(cat => (
                <motion.div key={cat.id}
                  variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.25 } } }}
                  className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Utensils  className="w-5 h-5 text-orange-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{cat.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[12px] font-bold border ${cat.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40"
                        : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-700"}`}>
                        {cat.is_active ? "Active" : "Inactive"}
                      </span>
                      <MaterialCountBadge count={cat._count?.materiels ?? 0}/>
                    </div>
                    {cat.description && <p className="text-sm text-gray-400 mt-0.5 truncate">{cat.description}</p>}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                    <button onClick={() => openEditMat(cat)} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-all">
                      <PencilSquareIcon className="w-4 h-4"/>
                    </button>
                    <button onClick={() => openDelMat(cat)}
                      title={(cat._count?.materiels ?? 0) > 0 ? `Utilisée par ${cat._count!.materiels} matériel(s)` : "Supprimer"}
                      className={`p-2 rounded-xl transition-all border ${(cat._count?.materiels ?? 0) > 0
                        ? "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600 cursor-not-allowed"
                        : "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/40 text-red-400 hover:text-red-600"}`}>
                      <TrashIcon className="w-4 h-4"/>
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          <Modal open={modalMat === "add"} onClose={() => setModalMat(null)} title="Nouvelle catégorie" subtitle="Créer une catégorie de matériels" icon={<Utensils  className="w-5 h-5 text-orange-600"/>}>
            <CategoryForm form={formMat} setForm={setFormMat} saving={savingMat} onSubmit={handleSaveMat} isEdit={false}/>
          </Modal>
          <Modal open={modalMat === "edit"} onClose={() => setModalMat(null)} title="Modifier la catégorie" subtitle={selectedMat ? `« ${selectedMat.name} »` : ""} icon={<PencilSquareIcon className="w-5 h-5"/>}>
            <CategoryForm form={formMat} setForm={setFormMat} saving={savingMat} onSubmit={handleSaveMat} isEdit={true}/>
          </Modal>
          <DeleteModal open={modalMat === "delete"} name={selectedMat?.name || ""} productCount={selectedMat?._count?.materiels ?? 0} loading={savingMat} onClose={() => setModalMat(null)} onConfirm={handleDeleteMat}/>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// UNIT FORM
// ═══════════════════════════════════════════════════════════
function UnitForm({ form, setForm, saving, onSubmit, isEdit }: {
  form: { name: string; abbreviation: string; description: string };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; abbreviation: string; description: string }>>;
  saving: boolean; onSubmit: (e: React.FormEvent) => void; isEdit: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Nom <span className="text-red-400">*</span></label>
          <input className={inputCls} required autoFocus placeholder="ex: Kilogramme"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/>
        </div>
        <div>
          <label className={labelCls}>Abréviation <span className="text-red-400">*</span></label>
          <input className={inputCls} required placeholder="ex: kg"
            value={form.abbreviation} onChange={e => setForm(f => ({ ...f, abbreviation: e.target.value }))}/>
        </div>
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <input className={inputCls} placeholder="Description optionnelle"
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/>
      </div>
      <SubmitBtn loading={saving} label={isEdit ? "Enregistrer" : "Créer l'unité"}/>
    </form>
  );
}

const UNIT_PRESETS = [
  { name: "Kilogramme", abbreviation: "kg" }, { name: "Gramme",     abbreviation: "g"   },
  { name: "Litre",      abbreviation: "L"  }, { name: "Millilitre", abbreviation: "mL"  },
  { name: "Pièce",      abbreviation: "pc" }, { name: "Carton",     abbreviation: "ctn" },
  { name: "Sac",        abbreviation: "sac"}, { name: "Boîte",      abbreviation: "bte" },
  { name: "Tonne",      abbreviation: "t"  }, { name: "Caisse",     abbreviation: "cs"  },
];

// ═══════════════════════════════════════════════════════════
// TAB UNITS
// ═══════════════════════════════════════════════════════════
function TabUnits({ token, showToast }: { token: string | null; showToast: (m: string, t?: ToastType) => void }) {
  const [units, setUnits]       = useState<Unit[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<ModalKind>(null);
  const [selected, setSelected] = useState<Unit | null>(null);
  const [form, setForm]         = useState({ name: "", abbreviation: "", description: "" });
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState("");

  const hdrs = useMemo(() => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await (await fetch("/api/admin/settings/units", { headers: token ? { Authorization: `Bearer ${token}` } : {} })).json();
      setUnits(Array.isArray(data) ? data : []);
    } catch { showToast("Erreur lors du chargement", "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm({ name: "", abbreviation: "", description: "" }); setModal("add"); };
  const openEdit = (u: Unit) => { setSelected(u); setForm({ name: u.name, abbreviation: u.abbreviation, description: u.description || "" }); setModal("edit"); };
  const openDel  = (u: Unit) => { setSelected(u); setModal("delete"); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.abbreviation.trim()) return;
    setSaving(true);
    try {
      const isEdit = modal === "edit";
      const res = await fetch(
        isEdit ? `/api/admin/settings/units/${selected!.id}` : "/api/admin/settings/units",
        { method: isEdit ? "PUT" : "POST", headers: hdrs, body: JSON.stringify(form) }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur lors de l'enregistrement");
      showToast(isEdit ? "Unité modifiée" : "Unité créée"); setModal(null); load();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/settings/units/${selected.id}`, { method: "DELETE", headers: hdrs });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur lors de la suppression");
      showToast("Unité supprimée"); setModal(null); load();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const addPreset = async (p: { name: string; abbreviation: string }) => {
    try {
      const res = await fetch("/api/admin/settings/units", { method: "POST", headers: hdrs, body: JSON.stringify({ ...p, description: "" }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur lors de l'ajout");
      showToast(`Unité « ${p.name} » ajoutée`); load();
    } catch (e: any) { showToast(e.message, "error"); }
  };

  const existingAbbrevs = useMemo(() => units.map(u => u.abbreviation), [units]);
  const presets  = useMemo(() => UNIT_PRESETS.filter(p => !existingAbbrevs.includes(p.abbreviation)), [existingAbbrevs]);
  const filtered = useMemo(() =>
    units.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.abbreviation.toLowerCase().includes(search.toLowerCase()) || (u.description || "").toLowerCase().includes(search.toLowerCase())),
    [units, search]
  );

  return (
    <div className="space-y-5">
      {presets.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#009B4D]/5 border border-[#009B4D]/20">
          <p className="text-sm font-bold text-[#009B4D] uppercase tracking-wider mb-3">Ajout rapide — unités courantes</p>
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button key={p.abbreviation} onClick={() => addPreset(p)} type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-white dark:bg-slate-800 border border-[#009B4D]/30 text-[#009B4D] hover:bg-[#009B4D] hover:text-white transition-all duration-150">
                <PlusIcon className="w-3 h-3"/>{p.name} <span className="opacity-60">({p.abbreviation})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <input className={`${inputCls} pl-9`} placeholder="Rechercher une unité…" value={search} onChange={e => setSearch(e.target.value)}/>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XMarkIcon className="w-4 h-4"/></button>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-[#009B4D] hover:border-[#009B4D] transition-all">
            <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}/>
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#009B4D] hover:bg-[#007A3D] text-white text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
            <PlusIcon className="w-4 h-4"/>Nouvelle unité
          </button>
        </div>
      </div>

      {!loading && (
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{units.length} unité{units.length !== 1 ? "s" : ""} au total</span>
          {search && <><span>·</span><span>{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</span></>}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><BeakerIcon className="w-10 h-10 mx-auto mb-3 opacity-30"/><p className="text-sm font-medium">{search ? "Aucune unité trouvée" : "Aucune unité — utilisez l'ajout rapide !"}</p></div>
      ) : (
        <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
          {filtered.map(unit => (
            <motion.div key={unit.id}
              variants={{ hidden: { opacity: 0, scale: 0.93 }, show: { opacity: 1, scale: 1, transition: { duration: 0.25 } } }}
              className="relative p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[#009B4D]/10 flex items-center justify-center mb-3">
                <span className="text-xl font-black text-[#009B4D] leading-none">{unit.abbreviation}</span>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{unit.name}</p>
              {unit.description && <p className="text-sm text-gray-400 mt-0.5 truncate">{unit.description}</p>}
              <div className="mt-2"><ProductCountBadge count={unit._count?.products ?? 0}/></div>
              <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(unit)} className="p-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-gray-800 transition-all">
                  <PencilSquareIcon className="w-3.5 h-3.5"/>
                </button>
                <button onClick={() => openDel(unit)}
                  title={(unit._count?.products ?? 0) > 0 ? `Utilisée par ${unit._count!.products} produit(s)` : "Supprimer"}
                  className={`p-1.5 rounded-lg border transition-all ${(unit._count?.products ?? 0) > 0
                    ? "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600 cursor-not-allowed"
                    : "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/40 text-red-400 hover:text-red-600"}`}>
                  <TrashIcon className="w-3.5 h-3.5"/>
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal open={modal === "add"} onClose={() => setModal(null)} title="Nouvelle unité" subtitle="Ajouter une unité de mesure" icon={<BeakerIcon className="w-5 h-5"/>}>
        <UnitForm form={form} setForm={setForm} saving={saving} onSubmit={handleSave} isEdit={false}/>
      </Modal>
      <Modal open={modal === "edit"} onClose={() => setModal(null)} title="Modifier l'unité" subtitle={selected ? `« ${selected.name} »` : ""} icon={<PencilSquareIcon className="w-5 h-5"/>}>
        <UnitForm form={form} setForm={setForm} saving={saving} onSubmit={handleSave} isEdit={true}/>
      </Modal>
      <DeleteModal open={modal === "delete"} name={selected?.name || ""} productCount={selected?._count?.products ?? 0} loading={saving} onClose={() => setModal(null)} onConfirm={handleDelete}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB INVENTORY EMAIL
// ═══════════════════════════════════════════════════════════
interface InventoryEmailConfig {
  enabled: boolean;
  sendDay: number;
  sendTime: string;
  lastSent?: string | null;
}

function TabInventoryEmail({ token, showToast }: { token: string | null; showToast: (m: string, t?: ToastType) => void }) {
  const [config, setConfig] = useState<InventoryEmailConfig>({
    enabled: true,
    sendDay: 28,
    sendTime: "09:00",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    fetchConfig();
  }, [token]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/settings/inventory-email", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.data) {
        setConfig(data.data);
      }
    } catch (error) {
      showToast("Erreur chargement configuration", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/inventory-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          enabled: config.enabled,
          sendDay: config.sendDay,
          sendTime: config.sendTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Configuration enregistrée");
      } else {
        showToast(data.error || "Erreur lors de l'enregistrement", "error");
      }
    } catch (error) {
      showToast("Erreur lors de l'enregistrement", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    // Valider l'email si fourni
    if (testEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      showToast("Veuillez entrer une adresse email valide", "error");
      return;
    }

    setTesting(true);
    try {
      const res = await fetch("/api/inventory/send-monthly", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          testEmail: testEmail || undefined, // Si vide, envoie à tous
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${data.recipients} email(s) envoyé(s) avec succès`);
      } else {
        showToast(data.message || "Erreur lors de l'envoi", "error");
      }
    } catch (error) {
      showToast("Erreur lors de l'envoi de test", "error");
    } finally {
      setTesting(false);
    }
  };

  const formatDayWithSuffix = (day: number): string => {
    const suffixes: Record<number, string> = { 1: "er", 21: "er", 31: "er" };
    return `${day}${suffixes[day] || ""}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
        <div className="h-64 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header info */}
      <SectionCard title="Configuration de l'envoi automatique" icon={<EnvelopeIcon className="w-5 h-5" />}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Configurez l'envoi automatique du rapport d'inventaire par email à la fin de chaque mois.
            Les emails sont envoyés à tous les utilisateurs ayant la permission <strong>INVENTORY_VIEW</strong>.
          </p>

          {config.lastSent && (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
              <InformationCircleIcon className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-400">
                Dernier envoi : {new Date(config.lastSent).toLocaleDateString("fr-FR", { 
                  day: "numeric", 
                  month: "long", 
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Configuration principale */}
      <SectionCard title="Paramètres d'envoi" icon={<ClockIcon className="w-5 h-5" />}>
        <div className="space-y-6">
          {/* Activation */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700">
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Envoi automatique</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Activer l'envoi mensuel automatique</p>
            </div>
            <Toggle
              checked={config.enabled}
              onChange={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
            />
          </div>

          {/* Jour du mois */}
          <div>
            <label className={labelCls}>Jour du mois</label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min={1}
                max={31}
                value={config.sendDay}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, sendDay: parseInt(e.target.value) || 1 }))
                }
                className={`${inputCls} w-24`}
                disabled={!config.enabled}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                du mois ({formatDayWithSuffix(config.sendDay)} jour)
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Si le jour dépasse le nombre de jours dans le mois, l'envoi aura lieu le dernier jour.
            </p>
          </div>

          {/* Heure */}
          <div>
            <label className={labelCls}>Heure d'envoi</label>
            <div className="flex items-center gap-4">
              <input
                type="time"
                value={config.sendTime}
                onChange={(e) => setConfig((c) => ({ ...c, sendTime: e.target.value }))}
                className={`${inputCls} w-32`}
                disabled={!config.enabled}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Heure locale (24h)
              </span>
            </div>
          </div>

          {/* Résumé */}
          <div className="p-4 rounded-xl bg-[#009B4D]/5 border border-[#009B4D]/10">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Résumé :</span> Les emails seront envoyés le{" "}
              <strong className="text-[#009B4D]">{formatDayWithSuffix(config.sendDay)}</strong>
              {" "}de chaque mois à{" "}
              <strong className="text-[#009B4D]">{config.sendTime}</strong>
              {config.enabled ? (
                <span className="text-emerald-600 ml-1">(activé)</span>
              ) : (
                <span className="text-gray-400 ml-1">(désactivé)</span>
              )}
            </p>
          </div>

          {/* Test Email Input */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700">
            <label className={labelCls}>Email de test (optionnel)</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="ex: admin@localgrill-bf.com"
                className={`${inputCls} flex-1`}
              />
              <button
                onClick={handleTestSend}
                disabled={testing}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                         bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300
                         hover:bg-gray-200 dark:hover:bg-slate-700
                         disabled:opacity-50 active:scale-[0.98] transition-all whitespace-nowrap"
              >
                {testing ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Envoi en cours…
                  </>
                ) : (
                  <>
                    <EnvelopeIcon className="w-4 h-4" />
                    Envoyer un test
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {testEmail 
                ? `L'email sera envoyé uniquement à ${testEmail} (doit avoir la permission INVENTORY_VIEW)`
                : "Laissez vide pour envoyer à tous les utilisateurs avec la permission INVENTORY_VIEW"}
            </p>
          </div>

          {/* Bouton Enregistrer */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                       bg-[#009B4D] hover:bg-[#007A3D] disabled:opacity-50 text-white
                       shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Enregistrer la configuration
                </>
              )}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Info destinataires */}
      <SectionCard title="Destinataires" icon={<InformationCircleIcon className="w-5 h-5" />}>
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Les emails sont envoyés automatiquement à tous les utilisateurs actifs ayant :
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-disc list-inside">
            <li>La permission directe <strong>INVENTORY_VIEW</strong></li>
            <li>Ou un rôle contenant la permission <strong>INVENTORY_VIEW</strong></li>
          </ul>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            Le rapport inclut un PDF détaillé de l'inventaire complet avec les KPIs, les produits épuisés, 
            les alertes de stock bas, et les variances.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "general",         label: "Paramètres généraux", icon: <Cog6ToothIcon className="w-4 h-4"/> },
  { key: "categories",        label: "Catégories",          icon: <TagIcon className="w-4 h-4"/> },
  { key: "units",             label: "Unités",              icon: <BeakerIcon className="w-4 h-4"/> },
  { key: "inventory-email",   label: "Email Inventaire",    icon: <EnvelopeIcon className="w-4 h-4"/> },
];

export default function AdminSettings() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = (message: string, type: ToastType = "success") => setToast({ message, type });

  return (
    <SidebarLayoutAdmin>
      <main className="w-full max-w-[1100px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#009B4D]/10"><Cog6ToothIcon className="w-6 h-6 text-[#009B4D]"/></div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1 h-4 rounded-full bg-[#009B4D]"/>
              <span className="text-[13px] font-bold tracking-widest text-[#009B4D] uppercase">Administration</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Paramètres</h1>
            <p className="text-sm text-gray-400 mt-0.5">Configuration globale du système</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700 w-fit flex-wrap">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-white dark:bg-slate-900 text-[#009B4D] shadow-sm border border-gray-200 dark:border-slate-700"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {activeTab === "general"         && <TabGeneral         token={token} showToast={showToast}/>}
            {activeTab === "categories"      && <TabCategories      token={token} showToast={showToast}/>}
            {activeTab === "units"           && <TabUnits           token={token} showToast={showToast}/>}
            {activeTab === "inventory-email" && <TabInventoryEmail  token={token} showToast={showToast}/>}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)}/>}
        </AnimatePresence>
      </main>
    </SidebarLayoutAdmin>
  );
}
