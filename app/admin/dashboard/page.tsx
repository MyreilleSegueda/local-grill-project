"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Calendar, Shield, Bell, XCircle, AlertTriangle,
  TrendingUp, Package, BarChart3, Activity, ChevronRight,
  Layers, Zap, RefreshCw, Clock, ArrowUpRight, ArrowDownRight,
  Smile,
  SmileIcon
} from "lucide-react";
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  KeyIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';
import SidebarLayoutAdmin from "@/src/navbar/SidebarLayoutAdmin";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { Variants } from "framer-motion";



// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number | string }) {
  const [display, setDisplay] = useState(0);
  const target = typeof value === "number" ? value : 0;

  useEffect(() => {
    let rafId: number;
    const start = performance.now();
    const duration = 1100;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * target));
      if (progress < 1) rafId = requestAnimationFrame(step);
      else setDisplay(target);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target]);

  if (typeof value === "string") return <span>{value}</span>;
  return <span>{display.toLocaleString("fr-FR")}</span>;
}

// ─── Pulse dot ────────────────────────────────────────────────────────────────
function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ backgroundColor: color }}
      />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
    </span>
  );
}

// ─── Mini sparkline SVG ───────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 72, H = 28;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 2) + 1}`)
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
        opacity="0.8"
      />
      {/* last point dot */}
      {(() => {
        const last = data[data.length - 1];
        const x = W;
        const y = H - ((last - min) / range) * (H - 2) + 1;
        return <circle cx={x} cy={y} r="2.5" fill={color} />;
      })()}
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Card {
  title: string;
  href: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  trend?: number;
  sparkData?: number[];
  badge?: string;
  badgeColor?: string;
  description?: string;
  pulse?: boolean;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0, sessions: 0, roles: 0,
    alerts: 0, criticalAlerts: 0,
    ruptures: 0, expired: 0, stockValue: 0,
    totalMovements: 0, lowStockProducts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [greeting, setGreeting] = useState("Bonjour");
  const router = useRouter();

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir");
  }, []);

  const fetchData = () => {
    const token = localStorage.getItem("adminToken");
    setLoading(true);
    Promise.all([
      fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/admin/sessions", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/admin/roles", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/alerts", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/dashboard/kpis", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([users, sessions, roles, alertsData, kpisData]) => {
        const alerts = alertsData.data?.alerts || [];
        const kpis = kpisData.data || {};
        setStats({
          users: users.length,
          sessions: sessions.length,
          roles: roles.length,
          alerts: alerts.length,
          criticalAlerts: alerts.filter((a: any) => a.severity === "CRITICAL" && !a.is_resolved).length,
          ruptures: kpis.productsOutOfStock || 0,
          expired: kpis.expiredBatches || 0,
          stockValue: kpis.totalStockValue || 0,
          totalMovements: kpis.totalMovements || 0,
          lowStockProducts: kpis.lowStockProducts || 0,
        });
        setLastRefresh(new Date());
      })
      .catch(() => router.push("/login/pg-admin"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  // ── Card groups ──────────────────────────────────────────────────────────────
  const adminCards: Card[] = [
    {
      title: "Utilisateurs",
      href: "/admin/users",
      value: stats.users,
      icon: <Users className="w-5 h-5" />,
      color: "#009B4D",
      bg: "from-emerald-500/8 to-transparent",
      trend: 12,
      sparkData: [3, 5, 4, 7, 6, 8, stats.users],
      description: "Comptes enregistrés",
    },
    {
      title: "Sessions actives",
      href: "/admin/sessions",
      value: stats.sessions,
      icon: <Activity className="w-5 h-5" />,
      color: "#0EA5E9",
      bg: "from-sky-500/8 to-transparent",
      trend: stats.sessions > 2 ? 5 : -2,
      sparkData: [2, 4, 3, 5, 4, 6, stats.sessions],
      description: "Connexions en cours",
      pulse: true,
    },
    {
      title: "Rôles",
      href: "/admin/roles",
      value: stats.roles,
      icon: <Shield className="w-5 h-5" />,
      color: "#8B5CF6",
      bg: "from-violet-500/8 to-transparent",
      description: "Groupes de permissions",
    },
  ];

  const alertCards: Card[] = [
    {
      title: "Alertes actives",
      href: "/alertes",
      value: stats.alerts,
      icon: <Bell className="w-5 h-5" />,
      color: "#F59E0B",
      bg: "from-amber-500/8 to-transparent",
      badge: stats.criticalAlerts > 0 ? `${stats.criticalAlerts} critiques` : undefined,
      badgeColor: "#EF4444",
      description: "Nécessitent une action",
      pulse: stats.criticalAlerts > 0,
    },
    {
      title: "Ruptures stock",
      href: "/stock/ruptures",
      value: stats.ruptures,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "#EF4444",
      bg: "from-red-500/8 to-transparent",
      description: "Produits épuisés",
      pulse: stats.ruptures > 0,
    },
    {
      title: "Lots périmés",
      href: "/stock/expires",
      value: stats.expired,
      icon: <XCircle className="w-5 h-5" />,
      color: "#F97316",
      bg: "from-orange-500/8 to-transparent",
      description: "À retirer du stock",
    },
  ];

  const stockCards: Card[] = [
    {
      title: "Valeur du stock",
      href: "/stock",
      value: `${stats.stockValue.toLocaleString("fr-FR")} FCFA`,
      icon: <BarChart3 className="w-5 h-5" />,
      color: "#009B4D",
      bg: "from-emerald-500/8 to-teal-500/5",
      description: "Valeur totale inventoriée",
    },
    {
      title: "Mouvements",
      href: "/stock/mouvements",
      value: stats.totalMovements,
      icon: <TrendingUp className="w-5 h-5" />,
      color: "#06B6D4",
      bg: "from-cyan-500/8 to-transparent",
      trend: 8,
      sparkData: [10, 14, 12, 18, 15, 20, stats.totalMovements],
      description: "Entrées & sorties totales",
    },
    {
      title: "Stock faible",
      href: "/stock/faible",
      value: stats.lowStockProducts,
      icon: <Package className="w-5 h-5" />,
      color: "#EC4899",
      bg: "from-pink-500/8 to-transparent",
      description: "Sous le seuil minimum",
      pulse: stats.lowStockProducts > 0,
    },
  ];

  // Typage explicite pour Framer Motion
  const stagger: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <SidebarLayoutAdmin>
      <main className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-10">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <PulseDot color="#009B4D" />
              <span className="text-[13px] font-bold tracking-[0.18em] text-[#009B4D] uppercase">
                Tableau de bord
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {greeting}&nbsp;
              <span className="inline-block animate-[wave_1s_ease-in-out]">
                <SmileIcon color="#009B4D" />
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Vue d'ensemble de votre système de gestion
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-[13px] text-gray-400 uppercase tracking-wide">Actualisé à</span>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
                         bg-[#009B4D] hover:bg-[#007A3D] active:scale-95
                         shadow-lg shadow-emerald-500/25 transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>
        </motion.header>

        {/* ── Critical banner ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {stats.criticalAlerts > 0 && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0.8, originY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <Link href="/alertes">
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl
                                bg-red-50 dark:bg-red-950/30
                                border border-red-200 dark:border-red-800/50
                                hover:bg-red-100 dark:hover:bg-red-950/50
                                transition-colors cursor-pointer group shadow-sm">
                  <PulseDot color="#EF4444" />
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {stats.criticalAlerts} alerte{stats.criticalAlerts > 1 ? "s" : ""} critique{stats.criticalAlerts > 1 ? "s" : ""} — action immédiate requise
                  </p>
                  <ChevronRight className="w-4 h-4 text-red-500 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Administration ─────────────────────────────────────────────────── */}
        <SectionBlock label="Administration" icon={<Shield className="w-4 h-4" />}>
          <motion.div variants={stagger} initial="hidden" animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminCards.map((c, i) => <motion.div key={i} variants={item}><KpiCard card={c} /></motion.div>)}
          </motion.div>
        </SectionBlock>

        {/* ── Alertes ────────────────────────────────────────────────────────── 
        <SectionBlock label="Alertes & Incidents" icon={<Zap className="w-4 h-4" />}>
          <motion.div variants={stagger} initial="hidden" animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {alertCards.map((c, i) => <motion.div key={i} variants={item}><KpiCard card={c} /></motion.div>)}
          </motion.div>
        </SectionBlock>*/}

        {/* ── Stock ────────────────────────────────────────────────────────────
        <SectionBlock label="Stock & Inventaire" icon={<Layers className="w-4 h-4" />}>
          <motion.div variants={stagger} initial="hidden" animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stockCards.map((c, i) => <motion.div key={i} variants={item}><KpiCard card={c} /></motion.div>)}
          </motion.div>
        </SectionBlock>*/}

        {/* ── Quick actions ───────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <SectionLabel label="Actions rapides" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Gestion des utilisateurs", href: "/admin/users", icon: <Users className="w-5 h-5" />, color: "#009B4D" },
              { label: "Rôles et permissions", href: "/admin/roles", icon: <KeyIcon className="w-5 h-5" />, color: "#0EA5E9" },
              { label: "Sessions", href: "/admin/sessions", icon: <ShieldCheckIcon className="w-5 h-5" />, color: "#F59E0B" },
              { label: "Logs", href: "/admin/logs", icon: <DocumentTextIcon className="w-5 h-5" />, color: "#8B5CF6" },
            ].map((a, i) => (
              <Link key={i} href={a.href}>
                <motion.div
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900
                             border border-gray-100 dark:border-slate-800
                             hover:border-gray-200 dark:hover:border-slate-700
                             hover:shadow-md shadow-sm transition-all duration-200 cursor-pointer group"
                >
                  <div className="p-2 rounded-xl" style={{ backgroundColor: `${a.color}15`, color: a.color }}>
                    {a.icon}
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-tight flex-1">
                    {a.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>

      </main>
    </SidebarLayoutAdmin>
  );
}

// ─── Section block ────────────────────────────────────────────────────────────
function SectionBlock({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <SectionLabel label={label} icon={icon} />
      {children}
    </section>
  );
}

function SectionLabel({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-1 h-5 rounded-full bg-[#009B4D]" />
      {icon && <span className="text-gray-400">{icon}</span>}
      <span className="text-sm font-bold tracking-[0.14em] text-gray-500 dark:text-gray-400 uppercase">
        {label}
      </span>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ card }: { card: Card }) {
  const pos = (card.trend ?? 0) >= 0;

  return (
    <Link href={card.href} className="block h-full">
      <motion.div
        whileHover={{ y: -2, boxShadow: "0 12px 40px -8px rgba(0,0,0,0.12)" }}
        whileTap={{ scale: 0.975 }}
        className={`
          relative overflow-hidden rounded-2xl p-5 h-full flex flex-col
          bg-white dark:bg-slate-900
          border border-gray-100 dark:border-slate-800
          shadow-sm transition-all duration-300 cursor-pointer group
        `}
      >
        {/* Subtle gradient tint */}
        <div className={`absolute inset-0 bg-gradient-to-br ${card.bg} pointer-events-none`} />

        {/* Top: icon + badges */}
        <div className="relative flex items-start justify-between mb-4">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ backgroundColor: `${card.color}15`, color: card.color }}
          >
            {card.icon}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {card.pulse && (
              <div className="mt-1">
                <PulseDot color={card.color} />
              </div>
            )}
            {card.badge && (
              <span
                className="text-[13px] font-bold text-white px-2 py-0.5 rounded-full"
                style={{ backgroundColor: card.badgeColor || card.color }}
              >
                {card.badge}
              </span>
            )}
            {card.trend !== undefined && (
              <span
                className={`inline-flex items-center gap-0.5 text-[13px] font-bold px-2 py-0.5 rounded-full ${
                  pos
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {pos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(card.trend)}%
              </span>
            )}
          </div>
        </div>

        {/* Value */}
        <div
          className="relative text-3xl font-black tracking-tight mb-1 tabular-nums"
          style={{ color: card.color }}
        >
          <AnimatedNumber value={card.value} />
        </div>

        {/* Labels */}
        <div className="relative flex-1">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{card.title}</p>
          {card.description && (
            <p className="text-sm text-gray-400 mt-0.5">{card.description}</p>
          )}
        </div>

        {/* Sparkline */}
        {card.sparkData && (
          <div className="relative mt-4 flex justify-between items-end">
            <span className="text-[12px] text-gray-300 dark:text-gray-600 font-medium">7 derniers jours</span>
            <div className="opacity-60 group-hover:opacity-100 transition-opacity">
              <Sparkline data={card.sparkData} color={card.color} />
            </div>
          </div>
        )}

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] scale-x-0 group-hover:scale-x-100
                     origin-left transition-transform duration-300"
          style={{ backgroundColor: card.color }}
        />
      </motion.div>
    </Link>
  );
}