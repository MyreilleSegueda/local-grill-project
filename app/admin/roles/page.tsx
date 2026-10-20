/**
 * app/admin/roles/page.tsx
 *
 * Gestion des rôles avec permissions groupées par module.
 * Chaque module affiche VIEW / CREATE / EDIT / DELETE en ligne.
 * Sélection rapide : tout le module d'un clic.
 */
"use client";
import SidebarLayoutAdmin from "@/src/navbar/SidebarLayoutAdmin";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { PERMISSION_GROUPS, type PermissionGroup } from "@/lib/constants/permissions";
import {
  PencilSquareIcon, TrashIcon, XMarkIcon, CheckIcon,
  MagnifyingGlassIcon, PlusIcon, ShieldCheckIcon, KeyIcon,
  ExclamationTriangleIcon, ArrowPathIcon, FunnelIcon,
  ChevronLeftIcon, ChevronRightIcon, UsersIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bars3Icon, HomeIcon, CubeIcon,
  ArrowDownTrayIcon, ArrowUpTrayIcon,
  ClipboardDocumentListIcon,
  DocumentChartBarIcon, UserCircleIcon
} from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────
type ToastType  = "success" | "error";
interface Permission  { id: number; name: string; description?: string | null }
interface Role        { id: number; name: string; permissions: Permission[]; userCount: number; createdAt: string }
interface FormState   { name: string; permissionIds: number[] }

const PAGE_SIZES = [5, 10, 20, 50];

// Action → label + couleur
const ACTION_META: Record<string, { label: string; bg: string; text: string; border: string }> = {
  VIEW:   { label: 'Voir',      bg: 'bg-sky-50    dark:bg-sky-950/30',    text: 'text-sky-700    dark:text-sky-300',    border: 'border-sky-200    dark:border-sky-900/50'    },
  CREATE: { label: 'Créer',     bg: 'bg-emerald-50 dark:bg-emerald-950/30',text: 'text-emerald-700 dark:text-emerald-300',border: 'border-emerald-200 dark:border-emerald-900/50'},
  EDIT:   { label: 'Modifier',  bg: 'bg-amber-50  dark:bg-amber-950/30',  text: 'text-amber-700  dark:text-amber-300',  border: 'border-amber-200  dark:border-amber-900/50'  },
  DELETE: { label: 'Supprimer', bg: 'bg-red-50    dark:bg-red-950/30',    text: 'text-red-700    dark:text-red-300',    border: 'border-red-200    dark:border-red-900/50'    },
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold
        ${type === "success" ? "bg-[#009B4D] text-white" : "bg-red-600 text-white"}`}
    >
      {type === "success"
        ? <CheckIcon className="w-4 h-4 flex-shrink-0" />
        : <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children, title, subtitle, icon }: {
  open: boolean; onClose: () => void; children: React.ReactNode;
  title: string; subtitle?: string; icon?: React.ReactNode;
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
            className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl
                       border border-gray-100 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col"
          >
            {/* Header modal */}
            <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
              {icon && (
                <div className="p-2 rounded-xl bg-[#009B4D]/10 text-[#009B4D] flex-shrink-0">{icon}</div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
                {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
              </div>
              <button onClick={onClose}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── PermBadge simple (table) ─────────────────────────────────────────────────
function PermBadge({ name }: { name: string }) {
  // Détecter l'action depuis le suffixe
  const action = name.split("_").pop() ?? "";
  const meta   = ACTION_META[action];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-bold border
      ${meta ? `${meta.bg} ${meta.text} ${meta.border}` : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700"}`}>
      <KeyIcon className="w-2.5 h-2.5 opacity-60" />
      {name}
    </span>
  );
}

// ─── RoleForm : formulaire avec permissions groupées par module ────────────────
function RoleForm({ form, setForm, allPermissions, loading, onSubmit, submitLabel }: {
  form:       FormState;
  setForm:    React.Dispatch<React.SetStateAction<FormState>>;
  allPermissions: Permission[];
  loading:    boolean;
  onSubmit:   () => void;
  submitLabel: string;
}) {
  // Construire un index permName → permId depuis les permissions chargées en DB
  const permIndex = useMemo(() => {
    const idx: Record<string, number> = {};
    allPermissions.forEach(p => { idx[p.name] = p.id; });
    return idx;
  }, [allPermissions]);

  // Vérifier si une permission (par nom) est cochée
  const isChecked = useCallback((name: string): boolean => {
    const id = permIndex[name];
    return id !== undefined && form.permissionIds.includes(id);
  }, [form.permissionIds, permIndex]);

  // Cocher/décocher une permission par nom
  const toggle = useCallback((name: string) => {
    const id = permIndex[name];
    if (id === undefined) return;
    setForm(f => ({
      ...f,
      permissionIds: f.permissionIds.includes(id)
        ? f.permissionIds.filter(x => x !== id)
        : [...f.permissionIds, id],
    }));
  }, [permIndex, setForm]);

  // Sélectionner / désélectionner tout un module
  const toggleModule = useCallback((group: PermissionGroup) => {
    const ids = group.permissions
      .map(p => permIndex[p.key])
      .filter((id): id is number => id !== undefined);

    const allSelected = ids.every(id => form.permissionIds.includes(id));
    setForm(f => ({
      ...f,
      permissionIds: allSelected
        ? f.permissionIds.filter(id => !ids.includes(id))
        : [...new Set([...f.permissionIds, ...ids])],
    }));
  }, [form.permissionIds, permIndex, setForm]);

  // Tout sélectionner / désélectionner
  const selectAll = useCallback(() => {
    setForm(f => ({ ...f, permissionIds: allPermissions.map(p => p.id) }));
  }, [allPermissions, setForm]);
  const selectNone = useCallback(() => {
    setForm(f => ({ ...f, permissionIds: [] }));
  }, [setForm]);

  // Compter les permissions sélectionnées par module
  const moduleCount = useCallback((group: PermissionGroup): number => {
    return group.permissions.filter(p => isChecked(p.key)).length;
  }, [isChecked]);
  const groupedPermissionNames = useMemo(
    () => new Set<string>(PERMISSION_GROUPS.flatMap(group => group.permissions.map(permission => permission.key))),
    [],
  );
  const customPermissions = allPermissions.filter(permission => !groupedPermissionNames.has(permission.name));

  return (
    <div className="space-y-5">
      {/* Nom du rôle */}
      <div>
        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Nom du rôle <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <ShieldCheckIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            autoFocus
            placeholder="ex: Gestionnaire stock, Caissier…"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm
              bg-gray-50 dark:bg-slate-800
              border border-gray-200 dark:border-slate-700
              text-gray-900 dark:text-gray-100 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-[#009B4D]/30 focus:border-[#009B4D] transition-all"
          />
        </div>
      </div>

      {/* Permissions */}
      <div>
        {/* Header permissions */}
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Permissions par module
          </label>
          <div className="flex items-center gap-3">
            {form.permissionIds.length > 0 && (
              <span className="text-sm font-bold text-[#009B4D] bg-[#009B4D]/10 px-2.5 py-1 rounded-full">
                {form.permissionIds.length} sélectionnée{form.permissionIds.length > 1 ? "s" : ""}
              </span>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={selectAll}
                className="text-[13px] font-bold text-[#009B4D] hover:underline transition-colors">
                Tout cocher
              </button>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <button type="button" onClick={selectNone}
                className="text-[13px] font-bold text-gray-400 hover:text-gray-600 hover:underline transition-colors">
                Tout décocher
              </button>
            </div>
          </div>
        </div>

        {/* Groupes de modules */}
        <div className="space-y-3">
          {PERMISSION_GROUPS.map(group => {
            const count    = moduleCount(group);
            const total    = group.permissions.length;
            const allOn    = count === total;
            const someOn   = count > 0 && count < total;

            return (
              <div key={group.module}
                className="rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">

                {/* En-tête du module */}
                <button
                  type="button"
                  onClick={() => toggleModule(group)}
                  className="w-full flex items-center justify-between px-4 py-3
                    bg-gray-50 dark:bg-slate-800/60 hover:bg-gray-100 dark:hover:bg-slate-800
                    transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    {/* Checkbox module */}
                    <div className={`w-4 h-4 rounded-[5px] flex items-center justify-center border transition-all flex-shrink-0
                      ${allOn
                        ? "bg-[#009B4D] border-[#009B4D]"
                        : someOn
                        ? "bg-[#009B4D]/30 border-[#009B4D]/60"
                        : "border-gray-300 dark:border-slate-600"}`}>
                      {allOn  && <CheckIcon className="w-3 h-3 text-white stroke-[3]" />}
                      {someOn && <div className="w-2 h-0.5 bg-[#009B4D] rounded-full" />}
                    </div>
                    <span className="text-base">{group.icon}</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {group.label}
                    </span>
                  </div>
                  {/* Compteur */}
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full
                    ${count === 0
                      ? "bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-500"
                      : allOn
                      ? "bg-[#009B4D]/15 text-[#009B4D]"
                      : "bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"}`}>
                    {count}/{total}
                  </span>
                </button>

                {/* Grille des permissions du module */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-white dark:bg-slate-900/50">
                  {group.permissions.map(perm => {
                    const checked = isChecked(perm.key);
                    const meta    = ACTION_META[perm.short] ?? ACTION_META['VIEW'];
                    // La permission existe-t-elle en DB ?
                    const exists  = permIndex[perm.key] !== undefined;

                    return (
                      <button
                        key={perm.key}
                        type="button"
                        onClick={() => toggle(perm.key)}
                        disabled={!exists}
                        title={!exists ? "Non disponible en DB" : perm.key}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left
                          transition-all duration-150 text-sm font-semibold
                          disabled:opacity-40 disabled:cursor-not-allowed
                          ${checked
                            ? `${meta.bg} ${meta.text} ${meta.border} shadow-sm`
                            : "bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600"}`}
                      >
                        {/* Mini checkbox */}
                        <div className={`w-3.5 h-3.5 rounded-[4px] flex items-center justify-center border flex-shrink-0 transition-all
                          ${checked
                            ? "bg-current border-current opacity-100"
                            : "border-gray-300 dark:border-slate-600"}`}>
                          {checked && (
                            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none">
                              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span>{perm.action}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {customPermissions.length > 0 && (
          <div className="mt-3 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
            <p className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-300">Autres permissions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {customPermissions.map(permission => (
                <label key={permission.id} className="flex items-start gap-2 rounded-xl border border-gray-200 dark:border-slate-700 p-3 text-sm">
                  <input type="checkbox" checked={form.permissionIds.includes(permission.id)} onChange={() => toggle(permission.name)} />
                  <span><span className="font-semibold">{permission.name}</span>{permission.description && <span className="block text-gray-500">{permission.description}</span>}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || !form.name.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
          bg-[#009B4D] hover:bg-[#007A3D]
          disabled:opacity-50 disabled:cursor-not-allowed
          text-white text-sm font-bold transition-all
          shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
      >
        {loading
          ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
          : <CheckIcon className="w-4 h-4" />}
        {loading ? "Enregistrement…" : submitLabel}
      </button>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50 dark:border-slate-800 animate-pulse">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-slate-700" />
          <div className="w-28 h-4 bg-gray-200 dark:bg-slate-700 rounded-full" />
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1.5">
          {[1,2,3].map(i => <div key={i} className="w-16 h-5 bg-gray-100 dark:bg-slate-800 rounded-lg" />)}
        </div>
      </td>
      <td className="px-4 py-4"><div className="w-8 h-5 bg-gray-100 dark:bg-slate-800 rounded-full" /></td>
      <td className="px-4 py-4"><div className="w-8 h-5 bg-gray-100 dark:bg-slate-800 rounded-full" /></td>
      <td className="px-4 py-4">
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-800" />
          <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-800" />
        </div>
      </td>
    </tr>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AdminRoles() {
  const { token } = useAuth();

  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [roles,          setRoles]          = useState<Role[]>([]);
  const [tableLoading,   setTableLoading]   = useState(true);
  const [loading,        setLoading]        = useState(false);
  const [modal,          setModal]          = useState<null | "add" | "edit" | "delete">(null);
  const [selectedRole,   setSelectedRole]   = useState<Role | null>(null);
  const [form,           setForm]           = useState<FormState>({ name: "", permissionIds: [] });
  const [toast,          setToast]          = useState<{ message: string; type: ToastType } | null>(null);

  const [search,      setSearch]      = useState("");
  const [moduleFilter,setModuleFilter]= useState("");
  const [pageSize,    setPageSize]    = useState(10);
  const [page,        setPage]        = useState(0);

  const showToast = (message: string, type: ToastType = "success") =>
    setToast({ message, type });

  // ── Charger les permissions disponibles en DB ─────────────────────────────
  const fetchPermissions = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch("/api/admin/permissions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setAllPermissions(Array.isArray(data) ? data : []);
    } catch {}
  }, [token]);

  // ── Charger les rôles ─────────────────────────────────────────────────────
  const fetchRoles = useCallback(async () => {
    if (!token) return;
    setTableLoading(true);
    try {
      const res  = await fetch("/api/admin/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      showToast("Erreur lors du chargement des rôles", "error");
    } finally {
      setTableLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPermissions();
    fetchRoles();
  }, [fetchPermissions, fetchRoles]);

  useEffect(() => { setPage(0); }, [search, moduleFilter, pageSize]);

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q  = search.toLowerCase();
    const mq = moduleFilter.toUpperCase();
    return roles.filter(r => {
      const matchSearch = !q || r.name.toLowerCase().includes(q)
        || r.permissions.some(p => p.name.toLowerCase().includes(q));
      const matchModule = !mq || r.permissions.some(p => p.name.startsWith(mq + "_"));
      return matchSearch && matchModule;
    });
  }, [roles, search, moduleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize]
  );

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/roles", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ name: form.name, permissions: form.permissionIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur création");
      showToast("Rôle créé avec succès");
      setModal(null);
      fetchRoles();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  };

  const handleEdit = async () => {
    if (!form.name.trim() || !selectedRole) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/roles/${selectedRole.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ id: selectedRole.id, name: form.name, permissions: form.permissionIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur modification");
      showToast("Rôle modifié avec succès");
      setModal(null);
      fetchRoles();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/roles/${selectedRole.id}`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ id: selectedRole.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur suppression");
      showToast("Rôle supprimé");
      setModal(null);
      fetchRoles();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setForm({ name: "", permissionIds: [] });
    setModal("add");
  };
  const openEdit = (role: Role) => {
    setSelectedRole(role);
    setForm({ name: role.name, permissionIds: role.permissions.map(p => p.id) });
    setModal("edit");
  };
  const openDelete = (role: Role) => {
    setSelectedRole(role);
    setModal("delete");
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SidebarLayoutAdmin>
      <main className="w-full max-w-[1300px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#009B4D]/10">
              <ShieldCheckIcon className="w-6 h-6 text-[#009B4D]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1 h-4 rounded-full bg-[#009B4D]" />
                <span className="text-[13px] font-bold tracking-widest text-[#009B4D] uppercase">
                  Administration
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Rôles & Permissions
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {filtered.length} rôle{filtered.length !== 1 ? "s" : ""}
                {(search || moduleFilter) && " — filtré(s)"}
                {" · "}{allPermissions.length} permissions en base
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { fetchPermissions(); fetchRoles(); }}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700
                text-gray-500 hover:text-[#009B4D] hover:border-[#009B4D] transition-all">
              <ArrowPathIcon className={`w-4 h-4 ${tableLoading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 h-10 rounded-xl bg-[#009B4D] hover:bg-[#007A3D]
                text-white text-sm font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
              <PlusIcon className="w-4 h-4" />Nouveau rôle
            </button>
          </div>
        </motion.div>

        {/* ── Filtres ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-3 items-center">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un rôle…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-8 rounded-xl text-sm
                bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                text-gray-800 dark:text-gray-200 placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-[#009B4D]/25 focus:border-[#009B4D]
                shadow-sm transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtre par module */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select
              value={moduleFilter}
              onChange={e => setModuleFilter(e.target.value)}
              className="h-10 px-3 rounded-xl text-sm bg-white dark:bg-slate-900 border border-gray-200
                dark:border-slate-700 text-gray-700 dark:text-gray-300
                focus:outline-none focus:ring-2 focus:ring-[#009B4D]/25 focus:border-[#009B4D] transition-all"
            >
              <option value="">Tous les modules</option>
              {PERMISSION_GROUPS.map(g => (
                <option key={g.module} value={g.module}>
                  {g.icon} {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Lignes par page */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500 whitespace-nowrap">Lignes :</span>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className="h-10 px-3 rounded-xl text-sm bg-white dark:bg-slate-900 border border-gray-200
                dark:border-slate-700 text-gray-700 dark:text-gray-300
                focus:outline-none focus:ring-2 focus:ring-[#009B4D]/25 focus:border-[#009B4D] transition-all"
            >
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {(search || moduleFilter) && (
            <button
              onClick={() => { setSearch(""); setModuleFilter(""); }}
              className="flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-medium
                text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-50
                dark:hover:bg-red-900/20 transition-colors"
            >
              <XMarkIcon className="w-3.5 h-3.5" />Réinitialiser
            </button>
          )}
        </motion.div>

        {/* ── Tableau desktop ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="hidden sm:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm
            border border-gray-100 dark:border-slate-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40">
                {["Rôle", "Permissions", "Total", "Utilisateurs", ""].map((h, i) => (
                  <th key={i}
                    className={`px-${i === 0 ? "5" : "4"} py-3.5 text-left text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${i === 4 ? "w-24" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLoading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : paginated.length === 0
                ? (
                  <tr><td colSpan={5}>
                    <div className="flex flex-col items-center gap-3 py-14">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                        <ShieldCheckIcon className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                      </div>
                      <p className="text-sm font-semibold text-gray-400">Aucun rôle trouvé</p>
                      <button onClick={openAdd}
                        className="px-4 py-2 rounded-xl bg-[#009B4D] text-white text-sm font-semibold hover:bg-[#007A3D] transition-colors">
                        Créer le premier rôle
                      </button>
                    </div>
                  </td></tr>
                )
                : paginated.map((role, i) => (
                  <motion.tr key={role.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="border-b border-gray-50 dark:border-slate-800 last:border-0 hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Nom */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#009B4D]/10 flex items-center justify-center flex-shrink-0">
                          <ShieldCheckIcon className="w-4 h-4 text-[#009B4D]" />
                        </div>
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          {role.name}
                        </span>
                      </div>
                    </td>

                    {/* Badges permissions */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5 max-w-sm">
                        {role.permissions.length === 0
                          ? <span className="text-sm text-gray-400 italic">Aucune</span>
                          : <>
                            {role.permissions.slice(0, 4).map(p => (
                              <PermBadge key={p.id} name={p.name} />
                            ))}
                            {role.permissions.length > 4 && (
                              <span className="text-sm font-bold text-gray-500 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-800">
                                +{role.permissions.length - 4}
                              </span>
                            )}
                          </>
                        }
                      </div>
                    </td>

                    {/* Nb perms */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold text-[#009B4D]">
                        {role.permissions.length}
                      </span>
                      <span className="text-sm text-gray-400 ml-1">/ {allPermissions.length}</span>
                    </td>

                    {/* Nb users */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <UsersIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {role.userCount ?? 0}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(role)}
                          className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700
                            text-gray-500 hover:text-gray-800 dark:text-gray-400
                            border border-gray-200 dark:border-slate-700 transition-all">
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => openDelete(role)}
                          className="p-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30
                            text-red-400 hover:text-red-600
                            border border-red-100 dark:border-red-900/50 transition-all">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              }
            </tbody>
          </table>

          {/* Pagination */}
          {!tableLoading && filtered.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-800/20">
              <span className="text-sm text-gray-500">
                {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} sur {filtered.length} rôle{filtered.length !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(0)} disabled={page === 0}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border border-gray-200 dark:border-slate-700
                    text-gray-500 hover:text-[#009B4D] hover:border-[#009B4D] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  «
                </button>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-slate-700
                    text-gray-500 hover:text-[#009B4D] hover:border-[#009B4D] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i)
                  .slice(Math.max(0, page - 2), page + 3)
                  .map(i => (
                    <button key={i} onClick={() => setPage(i)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all
                        ${page === i
                          ? "bg-[#009B4D] text-white shadow-sm"
                          : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"}`}>
                      {i + 1}
                    </button>
                  ))}
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-slate-700
                    text-gray-500 hover:text-[#009B4D] hover:border-[#009B4D] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border border-gray-200 dark:border-slate-700
                    text-gray-500 hover:text-[#009B4D] hover:border-[#009B4D] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  »
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Cartes mobile ── */}
        <div className="block sm:hidden space-y-3">
          {tableLoading
            ? [1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />)
            : paginated.length === 0
            ? (
              <div className="text-center py-12 text-gray-400">
                <ShieldCheckIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucun rôle trouvé</p>
              </div>
            )
            : paginated.map(role => (
              <motion.div key={role.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#009B4D]/10 flex items-center justify-center">
                      <ShieldCheckIcon className="w-4 h-4 text-[#009B4D]" />
                    </div>
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                      {role.name}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(role)}
                      className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500">
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => openDelete(role)}
                      className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-400">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-2.5 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <UsersIcon className="w-3.5 h-3.5" />{role.userCount ?? 0} utilisateur(s)
                  </span>
                  <span className="flex items-center gap-1">
                    <KeyIcon className="w-3.5 h-3.5" />{role.permissions.length} permissions
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.slice(0, 4).map(p => <PermBadge key={p.id} name={p.name} />)}
                  {role.permissions.length > 4 && (
                    <span className="text-[13px] font-bold text-gray-400 px-1.5 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-800">
                      +{role.permissions.length - 4}
                    </span>
                  )}
                  {role.permissions.length === 0 && (
                    <span className="text-sm text-gray-400 italic">Aucune permission</span>
                  )}
                </div>
              </motion.div>
            ))
          }
          {!tableLoading && filtered.length > pageSize && (
            <div className="flex justify-between pt-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-slate-700 disabled:opacity-30">
                <ChevronLeftIcon className="w-4 h-4" /> Préc.
              </button>
              <span className="text-sm text-gray-500 self-center">Page {page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-slate-700 disabled:opacity-30">
                Suiv. <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Modals ── */}
        <Modal open={modal === "add"} onClose={() => setModal(null)}
          title="Créer un rôle"
          subtitle="Définissez le nom et assignez les permissions par module"
          icon={<ShieldCheckIcon className="w-5 h-5" />}>
          <RoleForm
            form={form} setForm={setForm}
            allPermissions={allPermissions}
            loading={loading}
            onSubmit={handleAdd}
            submitLabel="Créer le rôle"
          />
        </Modal>

        <Modal open={modal === "edit"} onClose={() => setModal(null)}
          title="Modifier le rôle"
          subtitle={selectedRole ? `Modification de « ${selectedRole.name} »` : ""}
          icon={<PencilSquareIcon className="w-5 h-5" />}>
          <RoleForm
            form={form} setForm={setForm}
            allPermissions={allPermissions}
            loading={loading}
            onSubmit={handleEdit}
            submitLabel="Enregistrer les modifications"
          />
        </Modal>

        <Modal open={modal === "delete"} onClose={() => setModal(null)}
          title="Supprimer le rôle"
          icon={<ExclamationTriangleIcon className="w-5 h-5 text-red-500" />}>
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
              <p className="text-sm text-red-700 dark:text-red-400">
                Voulez-vous supprimer <span className="font-bold">« {selectedRole?.name} »</span> ?
                {(selectedRole?.userCount ?? 0) > 0 && (
                  <span className="block mt-1.5 font-bold">
                    ⚠️ {selectedRole?.userCount} utilisateur(s) ont ce rôle — suppression bloquée.
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-all">
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || (selectedRole?.userCount ?? 0) > 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold
                  bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                {loading
                  ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  : <TrashIcon className="w-4 h-4" />}
                {loading ? "Suppression…" : "Confirmer"}
              </button>
            </div>
          </div>
        </Modal>

        <AnimatePresence>
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </AnimatePresence>
      </main>
    </SidebarLayoutAdmin>
  );
}
