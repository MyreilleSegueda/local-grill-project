/**
 * app/profil/page.tsx
 *
 * Page profil complète — 3 onglets :
 *   ① Informations  : avatar, nom, email, rôles, permissions, dates système
 *   ② Sécurité      : changement de mot de passe, jauge de force, checklist
 *   ③ Activité      : logs ActivityLog paginés, filtres action/date/recherche
 *
 * Compatible avec le schéma Prisma fourni :
 *   - User  (id, email, fullName, status, createdAt, updatedAt)
 *   - UserRole → Role → RolePermission → Permission (@@map("permission"))
 *   - UserPermission → Permission
 *   - ActivityLog (@@map("activity_log")) : action String, details Text,
 *                  ipAddress, userAgent, createdAt
 */
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth }   from "@/lib/hooks/useAuth";
import {
  User, Lock, Activity, Shield, Save, Eye, EyeOff,
  ChevronLeft, ChevronRight, RefreshCw, Search,
  LogIn, LogOut, Key, Settings2, AlertCircle,
  CheckCircle2, XCircle, Clock, Monitor, Wifi,
  Filter, X, Calendar, ShieldCheck, Hash,
} from "lucide-react";

import SidebarLayout from "@/src/navbar/SidebarLayout";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ProfileData {
  id:          number;
  email:       string;
  fullName:    string;
  full_name?:  string;
  role:        string;
  roles:       string[];
  permissions: string[];
  status:      string;
  isActive:    boolean;
  createdAt:   string;
  updatedAt:   string;
}

interface LogEntry {
  id:        number;
  action:    string;
  details:   string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface LogsData {
  logs:         LogEntry[];
  pagination: {
    page:    number; limit:  number; total:  number;
    pages:   number; hasNext: boolean; hasPrev: boolean;
  };
  actionCounts: { action: string; count: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Métadonnées d'actions (valeurs libres stockées dans ActivityLog.action)
// ─────────────────────────────────────────────────────────────────────────────
type ActionMeta = { label: string; color: string; icon: React.ElementType };

const ACTION_META: Record<string, ActionMeta> = {
  LOGIN:            { label: "Connexion",       color: "#10b981", icon: LogIn       },
  LOGOUT:           { label: "Déconnexion",      color: "#6b7280", icon: LogOut      },
  LOGIN_FAILED:     { label: "Échec connexion",  color: "#ef4444", icon: XCircle     },
  OTP_VERIFIED:     { label: "OTP vérifié",      color: "#8b5cf6", icon: ShieldCheck },
  PASSWORD_CHANGE:  { label: "Mot de passe",     color: "#f59e0b", icon: Key         },
  PROFILE_UPDATE:   { label: "Profil modifié",   color: "#3b82f6", icon: Settings2   },
  SESSION_EXPIRE:   { label: "Session expirée",  color: "#9ca3af", icon: Clock       },
  SESSION_REVOKE:   { label: "Session révoquée", color: "#dc2626", icon: XCircle     },
};
function getMeta(action: string): ActionMeta {
  return ACTION_META[action] ?? {
    label: action.replace(/_/g, " "),
    color: "#9ca3af",
    icon:  Activity,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Couleurs de rôles
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  ADMIN:         "bg-red-100    text-red-700    border-red-200",
  SUPERVISOR:    "bg-purple-100 text-purple-700 border-purple-200",
  STOCK_MANAGER: "bg-blue-100   text-blue-700   border-blue-200",
  KITCHEN_STAFF: "bg-amber-100  text-amber-700  border-amber-200",
  CASHIER:       "bg-violet-100 text-violet-700 border-violet-200",
  COMPTABLE:     "bg-teal-100   text-teal-700   border-teal-200",
  LIVREUR:       "bg-orange-100 text-orange-700 border-orange-200",
  VIGILE:        "bg-slate-100  text-slate-700  border-slate-200",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function emailToHsl(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},60%,50%)`;
}
function getInitials(name: string): string {
  return (name || "?").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function timeAgo(iso: string): string {
  const ms  = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1)  return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30)   return `Il y a ${d}j`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function pwdStrength(pwd: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pwd.length >= 8)           s++;
  if (pwd.length >= 12)          s++;
  if (/[A-Z]/.test(pwd))         s++;
  if (/[a-z]/.test(pwd))         s++;
  if (/[0-9]/.test(pwd))         s++;
  if (/[^A-Za-z0-9]/.test(pwd))  s++;
  if (s <= 2) return { score: s, label: "Faible",    color: "#ef4444" };
  if (s <= 4) return { score: s, label: "Moyen",     color: "#f59e0b" };
  if (s <= 5) return { score: s, label: "Fort",      color: "#10b981" };
  return             { score: s, label: "Très fort", color: "#009B4D" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Composants utilitaires
// ─────────────────────────────────────────────────────────────────────────────
function Toast({
  msg, type, onClose,
}: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-5 right-5 z-[200] flex items-center gap-3
      px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold max-w-sm
      ${type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
      {type === "success"
        ? <CheckCircle2 size={15} className="flex-shrink-0" />
        : <AlertCircle  size={15} className="flex-shrink-0" />}
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

function Field({
  label, type = "text", value, onChange, disabled = false,
  error = "", right, placeholder = "", autoComplete,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; disabled?: boolean;
  error?: string; right?: React.ReactNode;
  placeholder?: string; autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-bold uppercase tracking-wider
        text-gray-500 dark:text-gray-400">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all
            bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100
            placeholder:text-gray-300 dark:placeholder:text-gray-600
            disabled:opacity-50 disabled:cursor-not-allowed
            ${right ? "pr-12" : ""}
            ${error
              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              : "border-gray-200 dark:border-slate-700 focus:border-[#009B4D] focus:ring-2 focus:ring-[#009B4D]/20"
            }`}
        />
        {right && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-sm text-red-500">
          <AlertCircle size={11} className="flex-shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONGLET 1 — Informations
// ─────────────────────────────────────────────────────────────────────────────
function TabInfo({
  profile,
  onSave,
}: {
  profile: ProfileData;
  onSave:  (d: { fullName?: string; email?: string }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [email,    setEmail]    = useState(profile.email);
  const [saving,   setSaving]   = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  useEffect(() => {
    setFullName(profile.fullName);
    setEmail(profile.email);
  }, [profile.fullName, profile.email]);

  const isDirty =
    fullName.trim() !== profile.fullName ||
    email.trim().toLowerCase() !== profile.email;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2)
      e.fullName = "Minimum 2 caractères";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "Adresse email invalide";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !isDirty) return;
    setSaving(true);
    try {
      await onSave({
        fullName: fullName.trim(),
        email:    email.trim().toLowerCase(),
      });
    } finally {
      setSaving(false);
    }
  }

  const avatarBg = emailToHsl(profile.email);
  const initials  = getInitials(profile.fullName);

  return (
    <div className="space-y-8">

      {/* ── Carte identité ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5
        p-5 rounded-2xl
        bg-gradient-to-br from-gray-50 to-white
        dark:from-slate-800/60 dark:to-slate-800/20
        border border-gray-100 dark:border-slate-700">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center
              text-white text-2xl font-black shadow-xl select-none"
            style={{
              background: `linear-gradient(135deg, ${avatarBg},
                hsl(${Math.abs(profile.id * 37) % 360},60%,38%))`,
            }}
          >
            {initials}
          </div>
          {/* Point de statut */}
          <div className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full
            border-2 border-white dark:border-slate-900 flex items-center justify-center
            ${profile.status === "ACTIVE"
              ? "bg-emerald-400"
              : profile.status === "SUSPENDED"
              ? "bg-red-400"
              : "bg-gray-400"}`}
          />
        </div>

        {/* Infos principales */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
            {profile.fullName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {profile.email}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {profile.roles.map(r => (
              <span key={r}
                className={`px-2.5 py-0.5 rounded-full text-[13px] font-bold border
                  ${ROLE_COLORS[r] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {r}
              </span>
            ))}
          </div>
        </div>

        {/* Meta droite */}
        <div className="sm:text-right flex-shrink-0 space-y-1">
          <p className="text-sm text-gray-400 flex items-center gap-1 sm:justify-end">
            <Hash size={10} /> ID {profile.id}
          </p>
          <p className={`text-sm font-bold ${
            profile.status === "ACTIVE"    ? "text-emerald-500" :
            profile.status === "SUSPENDED" ? "text-red-500"     : "text-gray-500"
          }`}>
            {profile.status}
          </p>
          <p className="text-sm text-gray-400">
            Depuis {new Date(profile.createdAt).toLocaleDateString("fr-FR", {
              month: "short", year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* ── Formulaire ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field
          label="Nom complet"
          value={fullName}
          onChange={v => { setFullName(v); setErrors(e => ({ ...e, fullName: "" })); }}
          error={errors.fullName}
          placeholder="Jean Dupont"
          autoComplete="name"
        />
        <Field
          label="Adresse email"
          type="email"
          value={email}
          onChange={v => { setEmail(v); setErrors(e => ({ ...e, email: "" })); }}
          error={errors.email}
          placeholder="jean@restaurant.com"
          autoComplete="email"
        />
      </div>

      {/* ── Permissions ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-[#009B4D]" />
          <span className="text-[13px] font-bold text-gray-500 dark:text-gray-400
            uppercase tracking-wider">
            Permissions assignées ({profile.permissions.length})
          </span>
        </div>
        {profile.permissions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 p-4 rounded-xl
            bg-gray-50 dark:bg-slate-800/40
            border border-gray-100 dark:border-slate-700">
            {profile.permissions.map(p => (
              <span key={p}
                className="px-2.5 py-1 rounded-lg text-[13px] font-mono font-medium
                  bg-[#009B4D]/8 text-[#009B4D]
                  dark:bg-[#009B4D]/20 dark:text-emerald-400
                  border border-[#009B4D]/20">
                {p}
              </span>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl
            bg-gray-50 dark:bg-slate-800/40
            border border-dashed border-gray-200 dark:border-slate-600 text-center">
            <p className="text-sm text-gray-400 italic">Aucune permission assignée</p>
          </div>
        )}
      </div>

      {/* ── Infos système ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: "Compte créé le",       value: fmtDate(profile.createdAt) },
          { label: "Dernière modification", value: fmtDate(profile.updatedAt) },
        ].map(({ label, value }) => (
          <div key={label} className="px-4 py-3 rounded-xl
            bg-gray-50 dark:bg-slate-800/50
            border border-gray-100 dark:border-slate-700">
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">
              {label}
            </p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Bouton save ── */}
      <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-slate-800">
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold
            text-white bg-[#009B4D] hover:bg-[#007d3e] transition-all
            disabled:opacity-40 disabled:cursor-not-allowed
            shadow-lg shadow-[#009B4D]/20
            hover:shadow-[#009B4D]/35 hover:-translate-y-0.5 active:translate-y-0"
        >
          {saving
            ? <><RefreshCw size={14} className="animate-spin" />Enregistrement…</>
            : <><Save size={14} />Enregistrer les modifications</>}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONGLET 2 — Sécurité
// ─────────────────────────────────────────────────────────────────────────────
function TabSecurity({
  onSave,
}: {
  onSave: (d: {
    currentPassword: string;
    newPassword:     string;
    confirmPassword: string;
  }) => Promise<void>;
}) {
  const [current, setCurrent] = useState("");
  const [newPwd,  setNewPwd]  = useState("");
  const [confirm, setConfirm] = useState("");
  const [show,    setShow]    = useState({ current: false, new: false, confirm: false });
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [ok,      setOk]      = useState(false);

  const strength = newPwd ? pwdStrength(newPwd) : null;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!current) e.current = "Requis";
    if (!newPwd)  e.newPwd  = "Requis";
    else {
      if (newPwd.length < 8)         e.newPwd = "Minimum 8 caractères";
      else if (!/[A-Z]/.test(newPwd)) e.newPwd = "Au moins une majuscule requise";
      else if (!/[0-9]/.test(newPwd)) e.newPwd = "Au moins un chiffre requis";
    }
    if (!confirm)           e.confirm = "Requis";
    else if (confirm !== newPwd) e.confirm = "Les mots de passe ne correspondent pas";
    if (current && newPwd && current === newPwd)
      e.newPwd = "Doit être différent du mot de passe actuel";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        currentPassword: current,
        newPassword:     newPwd,
        confirmPassword: confirm,
      });
      setCurrent(""); setNewPwd(""); setConfirm("");
      setErrors({});
      setOk(true);
      setTimeout(() => setOk(false), 6000);
    } finally {
      setSaving(false);
    }
  }

  function EyeBtn({ k }: { k: "current" | "new" | "confirm" }) {
    return (
      <button type="button"
        onClick={() => setShow(s => ({ ...s, [k]: !s[k] }))}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
        {show[k] ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    );
  }

  const criteria = [
    { ok: newPwd.length >= 8,           text: "8 caractères minimum"       },
    { ok: newPwd.length >= 12,          text: "12 caractères (recommandé)" },
    { ok: /[A-Z]/.test(newPwd),         text: "Une majuscule"              },
    { ok: /[a-z]/.test(newPwd),         text: "Une minuscule"              },
    { ok: /[0-9]/.test(newPwd),         text: "Un chiffre"                 },
    { ok: /[^A-Za-z0-9]/.test(newPwd),  text: "Caractère spécial"         },
  ];

  return (
    <div className="space-y-7 max-w-md">

      {/* Avertissement */}
      <div className="flex items-start gap-3 p-4 rounded-xl
        bg-amber-50 dark:bg-amber-900/20
        border border-amber-200 dark:border-amber-800/40">
        <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Après modification, vous devrez vous reconnecter sur tous vos appareils actifs.
        </p>
      </div>

      {/* Confirmation succès */}
      {ok && (
        <div className="flex items-center gap-3 p-4 rounded-xl
          bg-emerald-50 dark:bg-emerald-900/20
          border border-emerald-200 dark:border-emerald-800/40">
          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
            Mot de passe modifié avec succès !
          </p>
        </div>
      )}

      {/* Champs */}
      <div className="space-y-5">
        <Field
          label="Mot de passe actuel"
          type={show.current ? "text" : "password"}
          value={current}
          onChange={v => { setCurrent(v); setErrors(e => ({ ...e, current: "" })); }}
          error={errors.current}
          placeholder="••••••••"
          autoComplete="current-password"
          right={<EyeBtn k="current" />}
        />

        <Field
          label="Nouveau mot de passe"
          type={show.new ? "text" : "password"}
          value={newPwd}
          onChange={v => { setNewPwd(v); setErrors(e => ({ ...e, newPwd: "" })); }}
          error={errors.newPwd}
          placeholder="••••••••"
          autoComplete="new-password"
          right={<EyeBtn k="new" />}
        />

        {/* Jauge de force */}
        {newPwd && strength && (
          <div className="space-y-3 p-4 rounded-xl
            bg-gray-50 dark:bg-slate-800/50
            border border-gray-100 dark:border-slate-700">
            {/* Label + score */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Force du mot de passe
              </span>
              <span className="text-sm font-bold" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
            {/* Barres */}
            <div className="flex gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}
                  className="h-1.5 flex-1 rounded-full transition-all duration-300"
                  style={{
                    background: i < strength.score ? strength.color : "#e5e7eb",
                  }}
                />
              ))}
            </div>
            {/* Checklist */}
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 pt-0.5">
              {criteria.map(({ ok: met, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-[13px]">
                  {met
                    ? <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
                    : <div className="w-2.5 h-2.5 rounded-full flex-shrink-0
                        border-2 border-gray-300 dark:border-slate-500" />}
                  <span className={met
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-400 dark:text-gray-500"}>
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Field
          label="Confirmer le nouveau mot de passe"
          type={show.confirm ? "text" : "password"}
          value={confirm}
          onChange={v => { setConfirm(v); setErrors(e => ({ ...e, confirm: "" })); }}
          error={errors.confirm}
          placeholder="••••••••"
          autoComplete="new-password"
          right={<EyeBtn k="confirm" />}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={!current || !newPwd || !confirm || saving}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold
          text-white bg-[#009B4D] hover:bg-[#007d3e] transition-all
          disabled:opacity-40 disabled:cursor-not-allowed
          shadow-lg shadow-[#009B4D]/20
          hover:shadow-[#009B4D]/35 hover:-translate-y-0.5 active:translate-y-0"
      >
        {saving
          ? <><RefreshCw size={14} className="animate-spin" />Modification…</>
          : <><Lock size={14} />Changer le mot de passe</>}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONGLET 3 — Activité
// ─────────────────────────────────────────────────────────────────────────────
function TabActivity({ token }: { token: string | null }) {
  const [data,        setData]        = useState<LogsData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [action,      setAction]      = useState("");
  const [search,      setSearch]      = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [from,        setFrom]        = useState("");
  const [to,          setTo]          = useState("");
  const [showFilters, setShowFilters] = useState(false);
const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), limit: "15" });
      if (action) p.set("action", action);
      if (search) p.set("search", search);
      if (from)   p.set("from",   from);
      if (to)     p.set("to",     to);

      const res = await fetch(`/api/profil/logs?${p}`, {
        headers:     token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, action, search, from, to, token]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Debounce recherche
function handleSearchInput(v: string) {
  setSearchInput(v);

  if (debounce.current) {
    clearTimeout(debounce.current);
  }

  debounce.current = setTimeout(() => {
    setSearch(v);
    setPage(1);
  }, 400);
}

  function clearFilters() {
    setAction(""); setSearch(""); setSearchInput("");
    setFrom(""); setTo(""); setPage(1);
  }
  const nbFilters = [action, search, from, to].filter(Boolean).length;

  // ── Pagination intelligente ────────────────────────────────────────────────
  function buildPageRange(cur: number, total: number, delta = 2): number[] {
    const range: number[] = [];
    for (
      let i = Math.max(1, cur - delta);
      i <= Math.min(total, cur + delta);
      i++
    ) range.push(i);
    return range;
  }

  return (
    <div className="space-y-5">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-3">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Rechercher une action, une IP…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border text-sm outline-none transition-all
              bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100
              border-gray-200 dark:border-slate-700
              focus:border-[#009B4D] focus:ring-2 focus:ring-[#009B4D]/20"
          />
          {searchInput && (
            <button
              onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2
                text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filtres */}
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium
            transition-all
            ${showFilters || nbFilters > 0
              ? "border-[#009B4D]/50 bg-[#009B4D]/8 text-[#009B4D] dark:text-emerald-400"
              : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:border-gray-300"}`}
        >
          <Filter size={13} />
          Filtres
          {nbFilters > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#009B4D] text-white text-[12px]
              flex items-center justify-center font-bold">
              {nbFilters}
            </span>
          )}
        </button>

        {/* Refresh */}
        <button onClick={fetchLogs}
          className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-700
            text-gray-500 hover:text-[#009B4D] hover:border-[#009B4D]/50 transition-all">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Filtres avancés ── */}
      {showFilters && (
        <div className="p-5 rounded-2xl space-y-5
          bg-gray-50 dark:bg-slate-800/50
          border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold uppercase tracking-wider
              text-gray-500 dark:text-gray-400">
              Filtres avancés
            </span>
            {nbFilters > 0 && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-red-500
                  hover:text-red-600 font-medium transition-colors">
                <X size={11} />Tout effacer
              </button>
            )}
          </div>

          {/* Par type d'action */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              Type d'action
            </p>
            <div className="flex flex-wrap gap-2">
              {/* Bouton "Toutes" */}
              <button
                onClick={() => { setAction(""); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold
                  transition-all border
                  ${!action
                    ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-transparent"
                    : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-600 hover:border-gray-300"}`}
              >
                Toutes{data && (
                  <span className="ml-1.5 opacity-50 font-normal">
                    ({data.pagination.total})
                  </span>
                )}
              </button>
              {/* Par action trouvée dans les logs */}
              {data?.actionCounts.map(({ action: a, count }) => {
                const meta  = getMeta(a);
                const Icon  = meta.icon;
                const isOn  = action === a;
                return (
                  <button key={a}
                    onClick={() => { setAction(isOn ? "" : a); setPage(1); }}
                    style={{
                      background:  isOn ? `${meta.color}18` : undefined,
                      borderColor: isOn ? meta.color         : undefined,
                      color:       isOn ? meta.color         : undefined,
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                      text-sm font-semibold border transition-all
                      ${!isOn
                        ? "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-600 hover:border-gray-300"
                        : ""}`}
                  >
                    <Icon size={11} />
                    {meta.label}
                    <span className="opacity-60 font-normal">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Par date */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Depuis le",  val: from, set: (v: string) => { setFrom(v); setPage(1); } },
              { label: "Jusqu'au",   val: to,   set: (v: string) => { setTo(v);   setPage(1); } },
            ].map(({ label, val, set }) => (
              <div key={label} className="space-y-1.5">
                <label className="flex items-center gap-1 text-sm font-medium
                  text-gray-500 dark:text-gray-400">
                  <Calendar size={10} />{label}
                </label>
                <input
                  type="date"
                  value={val}
                  onChange={e => set(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none
                    bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100
                    border-gray-200 dark:border-slate-700
                    focus:border-[#009B4D] focus:ring-2 focus:ring-[#009B4D]/20"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats par action (top 4) ── */}
      {data && data.actionCounts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.actionCounts.slice(0, 4).map(({ action: a, count }) => {
            const meta  = getMeta(a);
            const Icon  = meta.icon;
            const isOn  = action === a;
            return (
              <button key={a}
                onClick={() => { setAction(isOn ? "" : a); setPage(1); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border
                  text-left transition-all hover:-translate-y-0.5
                  ${isOn
                    ? "border-[#009B4D]/30 bg-[#009B4D]/5 shadow-sm"
                    : "bg-white dark:bg-slate-800/50 border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600"}`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${meta.color}18` }}>
                  <Icon size={16} style={{ color: meta.color }} />
                </div>
                <div>
                  <p className="text-xl font-black text-gray-900 dark:text-white leading-none">
                    {count}
                  </p>
                  <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">
                    {meta.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Liste des logs ── */}
      <div className="space-y-2 min-h-[200px]">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i}
              className="h-[72px] rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse"
            />
          ))
        ) : !data || data.logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16
            text-gray-400 dark:text-gray-500">
            <Activity size={40} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">Aucun log trouvé</p>
            <p className="text-sm mt-1 opacity-70">Essayez de modifier vos filtres</p>
            {nbFilters > 0 && (
              <button onClick={clearFilters}
                className="mt-3 text-sm text-[#009B4D] hover:underline font-medium">
                Effacer les filtres
              </button>
            )}
          </div>
        ) : data.logs.map(log => {
          const meta  = getMeta(log.action);
          const Icon  = meta.icon;
          let details: Record<string, unknown> = {};
          try { details = JSON.parse(log.details ?? "{}"); } catch {}

          return (
            <div key={log.id}
              className="group flex items-start gap-4 px-4 py-3.5 rounded-xl
                bg-white dark:bg-slate-800/50
                border border-gray-100 dark:border-slate-700/80
                hover:border-gray-200 dark:hover:border-slate-600
                hover:shadow-sm transition-all">

              {/* Icône */}
              <div className="mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center
                flex-shrink-0"
                style={{ background: `${meta.color}16` }}>
                <Icon size={16} style={{ color: meta.color }} />
              </div>

              {/* Corps */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {meta.label}
                  </span>
                  <time
                    title={fmtDateTime(log.createdAt)}
                    className="text-[13px] text-gray-400 flex items-center gap-1
                      flex-shrink-0 whitespace-nowrap"
                  >
                    <Clock size={10} />
                    {timeAgo(log.createdAt)}
                  </time>
                </div>

                {/* Méta-infos */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  {log.ipAddress && (
                    <span className="flex items-center gap-1 text-[13px] text-gray-400">
                      <Wifi size={10} />{log.ipAddress}
                    </span>
                  )}
                  {log.userAgent && (
                    <span className="flex items-center gap-1 text-[13px] text-gray-400
                      max-w-[220px] truncate">
                      <Monitor size={10} />
                      {log.userAgent.length > 45
                        ? log.userAgent.slice(0, 45) + "…"
                        : log.userAgent}
                    </span>
                  )}
                  {/* Extrait du JSON details */}
                  {Object.keys(details).length > 0 &&
                    !("success" in details) && (
                    <span className="text-[12px] font-mono text-gray-300
                      dark:text-gray-600 max-w-[200px] truncate">
                      {JSON.stringify(details).slice(0, 60)}
                      {JSON.stringify(details).length > 60 ? "…" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Pagination ── */}
      {data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-3
          border-t border-gray-100 dark:border-slate-800">
          <p className="text-sm text-gray-400">
            {(data.pagination.page - 1) * data.pagination.limit + 1}–
            {Math.min(
              data.pagination.page * data.pagination.limit,
              data.pagination.total
            )}{" "}
            sur {data.pagination.total}
          </p>

          <div className="flex items-center gap-1.5">
            {/* Précédent */}
            <button
              disabled={!data.pagination.hasPrev}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-gray-200 dark:border-slate-700
                text-gray-600 dark:text-gray-400
                disabled:opacity-30 disabled:cursor-not-allowed
                hover:border-[#009B4D]/50 hover:text-[#009B4D] transition-all">
              <ChevronLeft size={14} />
            </button>

            {/* Pages numérotées */}
            {(() => {
              const total = data.pagination.pages;
              const cur   = data.pagination.page;
              const range = buildPageRange(cur, total);
              return (
                <>
                  {range[0] > 1 && (
                    <>
                      <button onClick={() => setPage(1)}
                        className="w-8 h-8 rounded-lg border border-gray-200
                          dark:border-slate-700 text-sm text-gray-600
                          dark:text-gray-400 hover:border-[#009B4D]/50 transition-all">
                        1
                      </button>
                      {range[0] > 2 && (
                        <span className="text-gray-400 text-sm px-0.5">…</span>
                      )}
                    </>
                  )}
                  {range.map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all
                        ${p === cur
                          ? "bg-[#009B4D] text-white shadow-md shadow-[#009B4D]/25"
                          : "border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-[#009B4D]/50 hover:text-[#009B4D]"}`}>
                      {p}
                    </button>
                  ))}
                  {range[range.length - 1] < total && (
                    <>
                      {range[range.length - 1] < total - 1 && (
                        <span className="text-gray-400 text-sm px-0.5">…</span>
                      )}
                      <button onClick={() => setPage(total)}
                        className="w-8 h-8 rounded-lg border border-gray-200
                          dark:border-slate-700 text-sm text-gray-600
                          dark:text-gray-400 hover:border-[#009B4D]/50 transition-all">
                        {total}
                      </button>
                    </>
                  )}
                </>
              );
            })()}

            {/* Suivant */}
            <button
              disabled={!data.pagination.hasNext}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-gray-200 dark:border-slate-700
                text-gray-600 dark:text-gray-400
                disabled:opacity-30 disabled:cursor-not-allowed
                hover:border-[#009B4D]/50 hover:text-[#009B4D] transition-all">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────
export default function ProfilPage() {
  const router = useRouter();
  const { token, isLoading, isAuthenticated } = useAuth();

  const [profile,  setProfile]  = useState<ProfileData | null>(null);
  const [tab,      setTab]      = useState<"info" | "security" | "activity">("info");
  const [toast,    setToast]    = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [fetching, setFetching] = useState(true);

  // Guard non connecté
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  // Charger le profil
  useEffect(() => {
    if (!token) return;
    setFetching(true);
    fetch("/api/profil", {
      headers:     { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: ProfileData) => {
        // Normaliser fullName (peut s'appeler full_name côté API)
        setProfile({
          ...d,
          fullName: d.fullName || d.full_name || "",
        });
      })
      .catch(() => showToast("Impossible de charger le profil", "error"))
      .finally(() => setFetching(false));
  }, [token]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
  }

  // ── Handler PATCH profil ───────────────────────────────────────────────────
  async function handleSaveInfo(data: { fullName?: string; email?: string }) {
    const res  = await fetch("/api/profil", {
      method:      "PATCH",
      headers:     {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body:        JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error ?? "Erreur lors de la mise à jour", "error");
      throw new Error(json.error);
    }
    setProfile(p => p
      ? {
          ...p,
          ...(data.fullName ? { fullName: data.fullName } : {}),
          ...(data.email    ? { email:    data.email    } : {}),
          updatedAt: json.updatedAt ?? p.updatedAt,
        }
      : p
    );
    showToast("Profil mis à jour avec succès", "success");
  }

  // ── Handler changement de mot de passe ────────────────────────────────────
  async function handleSavePassword(data: {
    currentPassword: string;
    newPassword:     string;
    confirmPassword: string;
  }) {
    const res  = await fetch("/api/profil/password", {
      method:      "POST",
      headers:     {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body:        JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error ?? "Erreur lors du changement de mot de passe", "error");
      throw new Error(json.error);
    }
    showToast("Mot de passe modifié avec succès", "success");
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center
        bg-gray-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <RefreshCw size={20} className="animate-spin text-[#009B4D]" />
          <span className="text-sm font-medium">Chargement du profil…</span>
        </div>
      </div>
    );
  }
  if (!profile) return null;

  const avatarBg = emailToHsl(profile.email);
  const initials  = getInitials(profile.fullName);

  const TABS = [
    { id: "info"     as const, label: "Informations", icon: User     },
    { id: "security" as const, label: "Sécurité",     icon: Lock     },
    { id: "activity" as const, label: "Activité",     icon: Activity },
  ];

  return (
    
        <SidebarLayout>
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">

      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Mon profil
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Gérez vos informations personnelles et votre sécurité
            </p>
          </div>
          {/* Avatar header */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center
              text-white font-black text-lg shadow-xl flex-shrink-0 select-none"
            style={{
              background: `linear-gradient(135deg, ${avatarBg},
                hsl(${Math.abs(profile.id * 37) % 360},60%,38%))`,
            }}
          >
            {initials}
          </div>
        </div>

        {/* ── Cartes stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Rôle principal",  value: profile.role,                   icon: Shield      },
            { label: "Statut",          value: profile.status,                  icon: CheckCircle2 },
            { label: "Permissions",     value: `${profile.permissions.length}`, icon: Key         },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label}
              className="flex flex-col items-center text-center p-4
                bg-white dark:bg-slate-900 rounded-2xl
                border border-gray-200 dark:border-slate-800 shadow-sm">
              <Icon size={18} className="text-[#009B4D] mb-2" />
              <p className="text-[12px] font-bold text-gray-400 dark:text-gray-500
                uppercase tracking-wide">
                {label}
              </p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5 truncate w-full">
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Carte à onglets ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl
          border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-gray-100 dark:border-slate-800
            bg-gray-50/60 dark:bg-slate-900">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold
                    border-b-2 transition-all flex-1 justify-center sm:flex-none sm:justify-start
                    ${active
                      ? "border-[#009B4D] text-[#009B4D] bg-white dark:bg-slate-900"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/70 dark:hover:bg-slate-800/50"}`}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Contenu */}
          <div className="p-5 sm:p-7">
            {tab === "info"     && <TabInfo profile={profile} onSave={handleSaveInfo} />}
            {tab === "security" && <TabSecurity onSave={handleSavePassword} />}
            {tab === "activity" && <TabActivity token={token} />}
          </div>
        </div>

      </div>
    </div>
        </SidebarLayout>
  );
}