"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Input } from "@/src/components/ui/input";
import SidebarLayoutAdmin from "@/src/navbar/SidebarLayoutAdmin";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Mail, Shield, CheckCircle2, XCircle, Search,
  Plus, Pencil, Trash2, MoreHorizontal, ChevronLeft,
  ChevronRight, Eye, EyeOff, UserCheck, UserX, RefreshCw,
  AlertTriangle, X, Check, Filter, SlidersHorizontal
} from "lucide-react";

// ─── Color map per role ────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ADMIN:         { bg: "bg-red-100 dark:bg-red-900/30",    text: "text-red-700 dark:text-red-400",    border: "border-red-200 dark:border-red-700" },
  STOCK_MANAGER: { bg: "bg-blue-100 dark:bg-blue-900/30",  text: "text-blue-700 dark:text-blue-400",  border: "border-blue-200 dark:border-blue-700" },
  KITCHEN_STAFF: { bg: "bg-amber-100 dark:bg-amber-900/30",text: "text-amber-700 dark:text-amber-400",border: "border-amber-200 dark:border-amber-700" },
  CASHIER:       { bg: "bg-violet-100 dark:bg-violet-900/30",text: "text-violet-700 dark:text-violet-400",border: "border-violet-200 dark:border-violet-700" },
};
function getRoleStyle(name: string) {
  return ROLE_COLORS[name?.toUpperCase()] ?? {
    bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", border: "border-gray-200 dark:border-gray-700"
  };
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl
        ${type === "success"
          ? "bg-[#009B4D] text-white"
          : "bg-red-600 text-white"
        }`}
    >
      {type === "success" ? <Check className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
      <span className="text-sm font-semibold">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </motion.div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold
      ${active
        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
      {active ? "Actif" : "Inactif"}
    </span>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ name }: { name: string }) {
  const s = getRoleStyle(name);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      <Shield className="w-3 h-3" />
      {name}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, email }: { name: string; email: string }) {
  const initials = name
    ? name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : email?.[0]?.toUpperCase() ?? "?";
  const hue = (email?.charCodeAt(0) ?? 0) * 47 % 360;
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
      style={{ background: `hsl(${hue}, 65%, 52%)` }}
    >
      {initials}
    </div>
  );
}

// ─── Modal overlay ─────────────────────────────────────────────────────────────
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Form field ───────────────────────────────────────────────────────────────
function Field({
  label, required, children, hint
}: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
        {label}
        {required && <span className="text-[#009B4D]">*</span>}
      </label>
      {children}
      {hint && <p className="text-[13px] text-gray-400">{hint}</p>}
    </div>
  );
}

// ─── Styled input ─────────────────────────────────────────────────────────────
function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }) {
  const { icon, ...rest } = props;
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
      )}
      <input
        {...rest}
        className={`w-full h-11 rounded-xl border border-gray-200 dark:border-slate-700
          bg-gray-50 dark:bg-slate-800/50
          text-sm text-gray-900 dark:text-gray-100
          placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-[#009B4D]/40 focus:border-[#009B4D]
          transition-all duration-200
          ${icon ? "pl-10 pr-4" : "px-4"}
          ${rest.className ?? ""}`}
      />
    </div>
  );
}

// ─── Styled select ────────────────────────────────────────────────────────────
function StyledSelect({
  value, onChange, options, placeholder
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-slate-700
          bg-gray-50 dark:bg-slate-800/50
          text-sm text-gray-900 dark:text-gray-100
          focus:outline-none focus:ring-2 focus:ring-[#009B4D]/40 focus:border-[#009B4D]
          transition-all duration-200 appearance-none cursor-pointer"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
    </div>
  );
}

// ─── Status select ────────────────────────────────────────────────────────────
function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = [
    { value: "ACTIVE", label: "Actif" },
    { value: "INACTIVE", label: "Inactif" },
    { value: "SUSPENDED", label: "Suspendu" },
  ];
  return (
    <div className="flex gap-2">
      {opts.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 h-10 rounded-xl text-sm font-semibold border transition-all duration-200
            ${value === o.value
              ? o.value === "ACTIVE"
                ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20"
                : o.value === "SUSPENDED"
                  ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20"
                  : "bg-gray-500 text-white border-gray-500"
              : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300"
            }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Password input ───────────────────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-4 pr-10 rounded-xl border border-gray-200 dark:border-slate-700
          bg-gray-50 dark:bg-slate-800/50
          text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-[#009B4D]/40 focus:border-[#009B4D]
          transition-all duration-200"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Dropdown menu ────────────────────────────────────────────────────────────
function ActionMenu({ user, onEdit, onDelete, onToggle }: {
  user: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = user.status === "ACTIVE";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-lg flex items-center justify-center
          text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
          hover:bg-gray-100 dark:hover:bg-slate-700
          transition-colors duration-150"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 z-30 w-44 rounded-xl shadow-xl
              bg-white dark:bg-slate-900
              border border-gray-100 dark:border-slate-800
              py-1.5 overflow-hidden"
          >
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Pencil className="w-4 h-4 text-[#009B4D]" />
              Modifier
            </button>
            <button
              onClick={() => { onToggle(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              {active
                ? <UserX className="w-4 h-4 text-amber-500" />
                : <UserCheck className="w-4 h-4 text-emerald-500" />
              }
              {active ? "Désactiver" : "Activer"}
            </button>
            <div className="my-1 border-t border-gray-100 dark:border-slate-800" />
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400
                hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50 dark:border-slate-800 animate-pulse">
      <td className="px-4 py-3.5"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-slate-700" /><div className="space-y-1.5"><div className="w-32 h-3.5 bg-gray-200 dark:bg-slate-700 rounded-full"/><div className="w-44 h-3 bg-gray-100 dark:bg-slate-800 rounded-full"/></div></div></td>
      <td className="px-4 py-3.5"><div className="w-20 h-6 bg-gray-100 dark:bg-slate-800 rounded-full" /></td>
      <td className="px-4 py-3.5"><div className="w-16 h-6 bg-gray-100 dark:bg-slate-800 rounded-full" /></td>
      <td className="px-4 py-3.5"><div className="w-8 h-8 bg-gray-100 dark:bg-slate-800 rounded-lg" /></td>
    </tr>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <tr><td colSpan={4}>
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
          <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Aucun utilisateur trouvé</p>
          <p className="text-sm text-gray-400 mt-1">Essayez de modifier vos filtres ou ajoutez un utilisateur</p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 rounded-xl bg-[#009B4D] text-white text-sm font-semibold hover:bg-[#007A3D] transition-colors"
        >
          Ajouter le premier utilisateur
        </button>
      </div>
    </td></tr>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<null | "add" | "edit" | "delete">(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [form, setForm] = useState({
    email: "", fullName: "", password: "", roleId: "", status: "ACTIVE"
  });
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAll = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/admin/roles", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([u, r]) => {
      setUsers(Array.isArray(u) ? u : []);
      setRoles(Array.isArray(r) ? r : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [token]);

  // ── Filter & paginate ────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.email?.toLowerCase().includes(q) ||
      u.fullName?.toLowerCase().includes(q);
    const matchRole = !roleFilter ||
      (u.userRoles || []).some((ur: any) => String(ur.role?.id) === roleFilter || ur.role?.name === roleFilter);
    const matchStatus = !statusFilter || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  // ── Modals ────────────────────────────────────────────────────────────────
  const openModal = (type: typeof modal, user: any = null) => {
    setSelectedUser(user);
    setForm(user ? {
      email: user.email || "",
      fullName: user.fullName || "",
      password: "",
      roleId: user.userRoles?.[0]?.role?.id ? String(user.userRoles[0].role.id) : "",
      status: user.status || "ACTIVE",
    } : { email: "", fullName: "", password: "", roleId: "", status: "ACTIVE" });
    setModal(type);
  };

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erreur création");
      showToast("success", "Utilisateur créé avec succès !");
      setModal(null);
      fetchAll();
    } catch (e: any) {
      showToast("error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, id: selectedUser.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erreur modification");
      showToast("success", "Utilisateur modifié avec succès !");
      setModal(null);
      fetchAll();
    } catch (e: any) {
      showToast("error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erreur suppression");
      showToast("success", "Utilisateur supprimé.");
      setModal(null);
      fetchAll();
    } catch (e: any) {
      showToast("error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (user: any) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}/toggle-status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erreur statut");
      showToast("success", `Utilisateur ${user.status === "ACTIVE" ? "désactivé" : "activé"}.`);
      fetchAll();
    } catch (e: any) {
      showToast("error", e.message);
    }
  };

  const roleOptions = roles.map(r => ({ label: r.name, value: String(r.id) }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SidebarLayoutAdmin>
      <main className="w-full max-w-[1300px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 rounded-full bg-[#009B4D]" />
              <span className="text-sm font-bold tracking-widest text-[#009B4D] uppercase">Administration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-7 h-7 text-[#009B4D]" />
              Utilisateurs
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {filtered.length} utilisateur{filtered.length !== 1 ? "s" : ""}
              {(roleFilter || statusFilter || search) && " — filtré(s)"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAll}
              className="w-10 h-10 flex items-center justify-center rounded-xl
                border border-gray-200 dark:border-slate-700
                text-gray-500 hover:text-[#009B4D] hover:border-[#009B4D]
                transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-3 h-10 rounded-xl border text-sm font-medium transition-all duration-200
                ${showFilters
                  ? "bg-[#009B4D]/10 border-[#009B4D]/40 text-[#009B4D]"
                  : "border-gray-200 dark:border-slate-700 text-gray-500 hover:border-[#009B4D]/40 hover:text-[#009B4D]"
                }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtres
              {(roleFilter || statusFilter) && (
                <span className="w-2 h-2 rounded-full bg-[#009B4D]" />
              )}
            </button>
            <button
              onClick={() => openModal("add")}
              className="flex items-center gap-2 px-4 h-10 rounded-xl bg-[#009B4D] hover:bg-[#007A3D]
                text-white text-sm font-semibold shadow-lg shadow-emerald-500/20
                active:scale-95 transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>
        </motion.div>

        {/* ── Search + Filters ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Rechercher par email ou nom..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-slate-700
                bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 shadow-sm
                focus:outline-none focus:ring-2 focus:ring-[#009B4D]/30 focus:border-[#009B4D]
                transition-all duration-200"
            />
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium">Rôle :</span>
                    <select
                      value={roleFilter}
                      onChange={e => { setRoleFilter(e.target.value); setPage(0); }}
                      className="h-9 px-3 rounded-lg border border-gray-200 dark:border-slate-700
                        bg-white dark:bg-slate-900 text-sm text-gray-700 dark:text-gray-300
                        focus:outline-none focus:ring-2 focus:ring-[#009B4D]/30 focus:border-[#009B4D]"
                    >
                      <option value="">Tous les rôles</option>
                      {roles.map(r => (
                        <option key={r.id} value={String(r.id)}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium">Statut :</span>
                    <select
                      value={statusFilter}
                      onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                      className="h-9 px-3 rounded-lg border border-gray-200 dark:border-slate-700
                        bg-white dark:bg-slate-900 text-sm text-gray-700 dark:text-gray-300
                        focus:outline-none focus:ring-2 focus:ring-[#009B4D]/30 focus:border-[#009B4D]"
                    >
                      <option value="">Tous les statuts</option>
                      <option value="ACTIVE">Actif</option>
                      <option value="INACTIVE">Inactif</option>
                      <option value="SUSPENDED">Suspendu</option>
                    </select>
                  </div>
                  {(roleFilter || statusFilter || search) && (
                    <button
                      onClick={() => { setRoleFilter(""); setStatusFilter(""); setSearch(""); setPage(0); }}
                      className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium
                        text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Réinitialiser
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Table (desktop) ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="hidden sm:block bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40">
                <th className="px-5 py-3.5 text-left text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-4 py-3.5 text-left text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rôles
                </th>
                <th className="px-4 py-3.5 text-left text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3.5 w-12" />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : paginated.length === 0
                  ? <EmptyState onAdd={() => openModal("add")} />
                  : paginated.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-gray-50 dark:border-slate-800 last:border-0
                        hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.fullName} email={user.email} />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                              {user.fullName || "—"}
                            </p>
                            <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Roles */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {(user.userRoles || []).length > 0
                            ? (user.userRoles || []).map((ur: any) => (
                              <RoleBadge key={ur.role?.id} name={ur.role?.name ?? "?"} />
                            ))
                            : <span className="text-sm text-gray-400">—</span>
                          }
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={user.status} />
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <ActionMenu
                          user={user}
                          onEdit={() => openModal("edit", user)}
                          onDelete={() => openModal("delete", user)}
                          onToggle={() => handleToggle(user)}
                        />
                      </td>
                    </motion.tr>
                  ))
              }
            </tbody>
          </table>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-slate-800
              bg-gray-50/40 dark:bg-slate-800/20">
              <span className="text-sm text-gray-500">
                {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} sur {filtered.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="w-8 h-8 rounded-lg flex items-center justify-center
                    border border-gray-200 dark:border-slate-700
                    text-gray-500 hover:text-[#009B4D] hover:border-[#009B4D]
                    disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all
                      ${page === i
                        ? "bg-[#009B4D] text-white shadow-sm"
                        : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                      }`}
                  >
                    {i + 1}
                  </button>
                )).slice(Math.max(0, page - 2), page + 3)}
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center
                    border border-gray-200 dark:border-slate-700
                    text-gray-500 hover:text-[#009B4D] hover:border-[#009B4D]
                    disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Cards (mobile) ── */}
        <div className="block sm:hidden space-y-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
            ))
            : paginated.length === 0
              ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Aucun utilisateur</p>
                </div>
              )
              : paginated.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4
                    border border-gray-100 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.fullName} email={user.email} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.fullName || "—"}</p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <ActionMenu
                      user={user}
                      onEdit={() => openModal("edit", user)}
                      onDelete={() => openModal("delete", user)}
                      onToggle={() => handleToggle(user)}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <StatusBadge status={user.status} />
                    {(user.userRoles || []).map((ur: any) => (
                      <RoleBadge key={ur.role?.id} name={ur.role?.name ?? "?"} />
                    ))}
                  </div>
                </motion.div>
              ))
          }
          {/* Mobile pagination */}
          {!loading && filtered.length > pageSize && (
            <div className="flex justify-between pt-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-slate-700 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Préc.
              </button>
              <span className="text-sm text-gray-500 self-center">Page {page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-slate-700 disabled:opacity-30 transition-colors">
                Suiv. <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ════════════════════ MODAL ADD / EDIT ════════════════════ */}
        <Modal open={modal === "add" || modal === "edit"} onClose={() => setModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#009B4D]/10 flex items-center justify-center">
                  {modal === "add"
                    ? <Plus className="w-5 h-5 text-[#009B4D]" />
                    : <Pencil className="w-5 h-5 text-[#009B4D]" />
                  }
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {modal === "add" ? "Ajouter un utilisateur" : "Modifier l'utilisateur"}
                  </h2>
                  {modal === "edit" && selectedUser && (
                    <p className="text-sm text-gray-400 mt-0.5">{selectedUser.email}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400
                  hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email" required>
                  <StyledInput
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="utilisateur@exemple.com"
                    icon={<Mail className="w-4 h-4" />}
                    required
                  />
                </Field>
                <Field label="Nom complet" required>
                  <StyledInput
                    value={form.fullName}
                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                    placeholder="Prénom Nom"
                    icon={<Users className="w-4 h-4" />}
                    required
                  />
                </Field>
              </div>

              <Field
                label={modal === "edit" ? "Nouveau mot de passe" : "Mot de passe"}
                required={modal === "add"}
                hint={modal === "edit" ? "Laissez vide pour conserver le mot de passe actuel" : undefined}
              >
                <PasswordInput
                  value={form.password}
                  onChange={v => setForm(f => ({ ...f, password: v }))}
                  placeholder={modal === "edit" ? "••••••••  (inchangé)" : "Minimum 8 caractères"}
                />
              </Field>

              <Field label="Rôle" required>
                <StyledSelect
                  value={form.roleId}
                  onChange={v => setForm(f => ({ ...f, roleId: v }))}
                  options={roleOptions}
                  placeholder="— Sélectionner un rôle —"
                />
                {/* Role preview badge */}
                {form.roleId && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2"
                  >
                    <RoleBadge name={roles.find(r => String(r.id) === form.roleId)?.name ?? ""} />
                  </motion.div>
                )}
              </Field>

              <Field label="Statut">
                <StatusSelect
                  value={form.status}
                  onChange={v => setForm(f => ({ ...f, status: v }))}
                />
              </Field>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-slate-700
                  text-sm font-semibold text-gray-600 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={modal === "add" ? handleAdd : handleEdit}
                disabled={submitting || !form.email || !form.fullName || (modal === "add" && !form.password)}
                className="flex-1 h-11 rounded-xl bg-[#009B4D] hover:bg-[#007A3D]
                  text-white text-sm font-bold shadow-lg shadow-emerald-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                  active:scale-[0.98] transition-all duration-200
                  flex items-center justify-center gap-2"
              >
                {submitting
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : modal === "add" ? <Plus className="w-4 h-4" /> : <Check className="w-4 h-4" />
                }
                {submitting ? "Enregistrement…" : modal === "add" ? "Créer l'utilisateur" : "Enregistrer"}
              </button>
            </div>
          </div>
        </Modal>

        {/* ════════════════════ MODAL DELETE ════════════════════ */}
        <Modal open={modal === "delete"} onClose={() => setModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                Supprimer l'utilisateur
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Vous allez supprimer définitivement
              </p>
              {selectedUser && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 mb-5">
                  <Avatar name={selectedUser.fullName} email={selectedUser.email} />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedUser.fullName}</p>
                    <p className="text-sm text-gray-400">{selectedUser.email}</p>
                  </div>
                </div>
              )}
              <p className="text-sm text-red-500 mb-6">
                ⚠️ Cette action est irréversible. Toutes ses données seront perdues.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-slate-700
                    text-sm font-semibold text-gray-600 dark:text-gray-300
                    hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold
                    shadow-lg shadow-red-500/20 disabled:opacity-50
                    active:scale-[0.98] transition-all duration-200
                    flex items-center justify-center gap-2"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {submitting ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        </Modal>

        {/* ── Toast ── */}
        <AnimatePresence>
          {toast && (
            <Toast
              type={toast.type}
              message={toast.message}
              onClose={() => setToast(null)}
            />
          )}
        </AnimatePresence>

      </main>
    </SidebarLayoutAdmin>
  );
}