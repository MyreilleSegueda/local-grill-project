"use client";

/**
 * app/dashboard/page.tsx
 *
 * Tableau de bord — données issues de l'API /api/dashboard
 * Graphique de consommation : basé sur stock_movements (OUT, LOSS, EXPIRED)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import SidebarLayout from "@/src/navbar/SidebarLayout";
import Graph         from "@/src/components/ui/Graph";
import { useAuth }   from "@/lib/hooks/useAuth";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Package, AlertTriangle, Bell, TrendingDown, TrendingUp,
  ChevronRight, Flame, BarChart3, Activity, CheckCircle2,
  XCircle, Layers, RefreshCw, ArrowUpRight, ArrowDownRight,
  Minus, Zap, Calendar, Hash,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */

interface DayPoint {
  day:            string;
  date:           string;
  total_consumed: number;
  movement_count: number;
}

interface ConsumptionStats {
  total7days:    number;
  avgPerDay:     number;
  peakDay:       DayPoint;
  movementCount: number;
}

interface TopProduct {
  product_id:     number;
  name:           string;
  category_name:  string;
  unit:           string;
  total_consumed: number;
  movement_count: number;
  avg_per_day:    number;
}

interface TrendItem {
  product_id:   number;
  product_name: string;
  period:       string;
  direction:    "up" | "down" | "stable";
  value:        number;
  avg7:         number;
  avg30:        number;
}

interface LowStockItem {
  name:          string;
  category_name: string;
  stock:         number;
  minimum_stock: number;
  unit:          string;
}

interface DashboardData {
  totalProducts:       number;
  productsOutOfStock:  number;
  activeAlerts:        number;
  criticalAlerts:      number;
  losses: {
    total_loss_value: number;
    loss_percentage:  number;
    expired_count:    number;
  };
  consumptionChart:   DayPoint[];
  consumptionStats:   ConsumptionStats;
  topProducts:        TopProduct[];
  trends:             TrendItem[];
  productsLowStockList: LowStockItem[];
  stockValueByCategory: Record<string, number>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN
───────────────────────────────────────────────────────────────────────────── */

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
`;

const CSS = `
  * { font-family: 'DM Sans', sans-serif; }
  .syne { font-family: 'Syne', sans-serif; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .sk {
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease infinite;
    border-radius: 10px;
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   MICRO-COMPOSANTS
───────────────────────────────────────────────────────────────────────────── */

function Fonts(): null {
  useEffect(() => {
    if (document.getElementById("dash-f")) return;
    const s = document.createElement("style"); s.id = "dash-f"; s.textContent = FONTS;
    document.head.appendChild(s);
  }, []);
  return null;
}

function Toast({ show, notif }: { show: boolean; notif: { type: "success"|"error"; message: string } | null }) {
  return (
    <AnimatePresence>
      {show && notif && (
        <motion.div initial={{ opacity:0, y:-14, scale:.95 }} animate={{ opacity:1, y:0, scale:1 }}
          exit={{ opacity:0, y:-14, scale:.95 }} transition={{ type:"spring", stiffness:320, damping:26 }}
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg max-w-xs
            ${notif.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {notif.type === "success" ? <CheckCircle2 size={15}/> : <XCircle size={15}/>}
          <span className="truncate">{notif.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={12} className="text-slate-600 shrink-0"/>
      <span className="text-[12px] font-semibold tracking-[0.18em] uppercase text-slate-600 whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-slate-200 min-w-0"/>
    </div>
  );
}

function AnimRow({ children, delay }: { children: React.ReactNode; delay: number }) {
  const ref    = useRef<HTMLTableRowElement>(null);
  const inView = useInView(ref, { once:true });
  return (
    <motion.tr ref={ref} initial={{ opacity:0, y:4 }} animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ delay, duration:.25 }}
      className="border-b border-slate-100 transition-colors hover:bg-slate-50">
      {children}
    </motion.tr>
  );
}

function AnimBar({ pct, color, delay, thin=false }: { pct:number; color:string; delay:number; thin?:boolean }) {
  const h = thin ? "h-1" : "h-1.5";
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-100 ${h}`}>
      <motion.div initial={{ width:0 }} animate={{ width:`${Math.min(pct||0, 100)}%` }}
        transition={{ delay, duration:.9, ease:[.16,1,.3,1] }}
        className={`${h} rounded-full`} style={{ background:color }}/>
    </div>
  );
}

function CountUp({ end, duration=1100, suffix="", decimals=0 }: { end:number; duration?:number; suffix?:string; decimals?:number }) {
  const [count, setCount] = useState(0);
  const ref    = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once:true });
  useEffect(() => {
    if (!inView || !end) { setCount(end||0); return; }
    let s=0; const step=end/(duration/16);
    const t=setInterval(()=>{ s+=step; if(s>=end){setCount(end);clearInterval(t);}else setCount(s); },16);
    return ()=>clearInterval(t);
  },[inView,end,duration]);
  return <span ref={ref}>{decimals>0?count.toFixed(decimals):Math.floor(count).toLocaleString("fr-FR")}{suffix}</span>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SKELETON
───────────────────────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="sk h-9 w-48"/>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_,i) => <div key={i} className="sk h-28 sm:h-32"/>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="sk h-64 sm:h-72"/>
        <div className="sk h-64 sm:h-72"/>
      </div>
      <div className="sk h-48"/>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   KPI CARD
───────────────────────────────────────────────────────────────────────────── */
interface KpiConfig {
  title:       string;
  rawValue?:   number;
  value?:      string;
  suffix?:     string;
  Icon:        React.ElementType;
  accent:      string;
  borderColor: string;
  iconBg:      string;
  iconColor:   string;
  valueColor:  string;
  subtitle?:   string;
  href:        string;
}
function KpiCard({ kpi, idx }: { kpi: KpiConfig; idx: number }) {
  return (
    <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
      transition={{ delay:idx*.07, type:"spring", stiffness:130, damping:20 }}>
      <button onClick={() => (window.location.href = kpi.href)}
        className="w-full h-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded-2xl group">
        <div className="relative overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 h-full"
          style={{ borderColor: kpi.borderColor }}>
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background:kpi.accent }}/>
          <div className="absolute inset-0 rounded-2xl opacity-[0.03]" style={{ background:kpi.accent }}/>
          <div className="relative flex items-start justify-between mb-3 sm:mb-4">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl shrink-0" style={{ background:kpi.iconBg }}>
              <kpi.Icon size={15} style={{ color:kpi.iconColor }}/>
            </div>
            <ChevronRight size={12} className="text-slate-500 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-slate-600 mt-0.5 shrink-0"/>
          </div>
          <div className="relative">
            <p className="text-[12px] sm:text-[12px] font-semibold uppercase tracking-widest text-slate-600 mb-1">{kpi.title}</p>
            <p className="text-2xl sm:text-[2rem] font-bold leading-none syne" style={{ color:kpi.valueColor }}>
              {kpi.rawValue !== undefined
                ? <CountUp end={kpi.rawValue} suffix={kpi.suffix??""}/>
                : kpi.value}
            </p>
            {kpi.subtitle && <p className="mt-1.5 text-[14px] sm:text-[14px] text-slate-600 truncate">{kpi.subtitle}</p>}
          </div>
        </div>
      </button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONSUMPTION CHART PANEL
   Graphique + 4 mini-stats en dessous
───────────────────────────────────────────────────────────────────────────── */
function ConsumptionPanel({ chart, stats }: { chart: DayPoint[]; stats: ConsumptionStats | undefined }) {
  const maxVal   = Math.max(...chart.map(d => d.total_consumed), 1);
  const total    = chart.reduce((s, d) => s + d.total_consumed, 0);
  const avg      = chart.length > 0 ? total / chart.length : 0;
  const peak     = chart.reduce((b, d) => d.total_consumed > b.total_consumed ? d : b, chart[0] ?? { day:"—", date:"", total_consumed:0, movement_count:0 });
  const nonZero  = chart.filter(d => d.total_consumed > 0).length;

  const miniStats = [
    { label:"Total 7j",  value: total.toFixed(1),              Icon: Hash,     color:"#6366f1" },
    { label:"Moy./jour", value: avg.toFixed(1),                 Icon: BarChart3, color:"#0ea5e9" },
    { label:"Pic",       value: `${peak.day} (${peak.total_consumed.toFixed(1)})`, Icon: Zap, color:"#f59e0b" },
    { label:"Jours actifs", value: `${nonZero}/7`,              Icon: Calendar, color:"#10b981" },
  ];

  return (
    <motion.div initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ delay:.22 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm flex flex-col">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-widest text-slate-600">
            Consommation quotidienne
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700 syne">7 derniers jours</p>
        </div>
        <span className="text-[12px] text-slate-600 mt-1">OUT · LOSS · EXPIRED</span>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 mb-4">
        {miniStats.map((s, i) => (
          <motion.div key={i} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:.3+i*.06 }}
            className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
            <s.Icon size={12} style={{ color:s.color, flexShrink:0 }}/>
            <div className="min-w-0">
              <p className="text-[12px] text-slate-600 leading-none mb-0.5">{s.label}</p>
              <p className="text-sm font-bold text-slate-700 truncate syne">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Barres verticales custom */}
      <div className="flex-1 min-h-0 h-44 sm:h-48 flex flex-col justify-end">
        {total === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <BarChart3 size={28} className="text-slate-400"/>
            <p className="text-sm text-slate-600">Aucune consommation sur 7 jours</p>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-1 h-full">
            {chart.map((d, i) => {
              const pct      = maxVal > 0 ? (d.total_consumed / maxVal) * 100 : 0;
              const isToday  = i === chart.length - 1;
              const color    = d.total_consumed === 0
                ? "#f1f5f9"
                : isToday ? "#6366f1" : `hsl(${220 + i * 6}, 70%, ${55 + (100-pct)*0.15}%)`;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  {d.total_consumed > 0 && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 hidden group-hover:flex
                      flex-col items-center pointer-events-none z-10">
                      <div className="rounded-lg bg-slate-800 px-2 py-1 text-[12px] text-white whitespace-nowrap shadow-lg">
                        {d.total_consumed.toFixed(1)} · {d.movement_count} mvt
                      </div>
                      <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"/>
                    </div>
                  )}

                  {/* Valeur au dessus de la barre */}
                  {d.total_consumed > 0 && (
                    <span className="text-[12px] font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.total_consumed.toFixed(0)}
                    </span>
                  )}

                  {/* Barre */}
                  <motion.div className="w-full rounded-t-lg"
                    initial={{ height:0 }}
                    animate={{ height:`${Math.max(pct, d.total_consumed > 0 ? 4 : 0)}%` }}
                    transition={{ delay:.35 + i*.06, duration:.7, ease:[.16,1,.3,1] }}
                    style={{ background:color, minHeight: d.total_consumed > 0 ? "6px" : "0" }}
                  />

                  {/* Label jour */}
                  <span className={`text-[12px] capitalize font-medium mt-1 ${isToday ? "text-indigo-600 font-bold" : "text-slate-600"}`}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE PRINCIPALE
───────────────────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { token, isLoading: authLoading } = useAuth();
  const [data,        setData]        = useState<DashboardData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [notif,       setNotif]       = useState<{ type:"success"|"error"; message:string } | null>(null);
  const [showNotif,   setShowNotif]   = useState(false);

  const notify = (type: "success"|"error", message: string) => setNotif({ type, message });

  useEffect(() => {
    if (!notif) return;
    setShowNotif(true);
    const t = setTimeout(() => { setShowNotif(false); setNotif(null); }, 3500);
    return () => clearTimeout(t);
  }, [notif]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json() as { success: boolean; data: DashboardData };
        if (json.success) setData(json.data);
        else notify("error", "Erreur lors du chargement");
      } else {
        notify("error", "Erreur API dashboard");
      }
    } catch {
      notify("error", "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) fetchData(); }, [fetchData, token]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => { setRefreshing(false); notify("success", "Données actualisées"); }, 300);
  };

  const kpis = data ?? {} as DashboardData;

  const globalKpis: KpiConfig[] = [
    {
      title:"Total Produits", rawValue: kpis.totalProducts??0, Icon:Package,
      accent:"#6366f1", borderColor:"#e0e7ff", iconBg:"#eef2ff", iconColor:"#6366f1", valueColor:"#1e1b4b",
      subtitle:"références actives", href:"/produits",
    },
    {
      title:"Ruptures", rawValue: kpis.productsOutOfStock??0, Icon:AlertTriangle,
      accent:"#f59e0b", borderColor:"#fef3c7", iconBg:"#fffbeb", iconColor:"#d97706", valueColor:"#78350f",
      subtitle:"produits épuisés", href:"/inventaire",
    },
    {
      title:"Alertes actives", rawValue: kpis.activeAlerts??0, Icon:Bell,
      accent:"#f97316", borderColor:"#ffedd5", iconBg:"#fff7ed", iconColor:"#ea580c", valueColor:"#7c2d12",
      subtitle:`${kpis.criticalAlerts??0} critiques`, href:"/alertes",
    },
    {
      title:"Pertes — 30j",
      value: `${(kpis.losses?.total_loss_value??0).toLocaleString("fr-FR")} FCFA`,
      Icon:TrendingDown,
      accent:"#ef4444", borderColor:"#fee2e2", iconBg:"#fef2f2", iconColor:"#dc2626", valueColor:"#7f1d1d",
      subtitle:`${kpis.losses?.loss_percentage?.toFixed(2)??0}% du stock`, href:"/rapports",
    },
  ];

  /* Loading */
  if (authLoading || loading) {
    return (
      <SidebarLayout>
        <Fonts/><style>{CSS}</style>
        <main className="min-h-screen bg-slate-50"><Skeleton/></main>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <Fonts/>
      <style>{CSS}</style>
      <Toast show={showNotif} notif={notif}/>

      <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 pb-20" style={{ color:"#1e293b" }}>
        <div className="max-w-7xl mx-auto">

          {/* ── Header ── */}
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:.35 }}
            className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-600 mb-0.5">
                Tableau de bord
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight syne">Vue d'ensemble</h1>
              <p className="mt-0.5 text-[13px] sm:text-sm text-slate-600">
                {new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
              </p>
            </div>
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-sm font-medium text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-40">
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""}/>
              <span>Actualiser</span>
            </button>
          </motion.div>

          {/* ── KPIs ── */}
          <SectionLabel icon={Activity} label="Indicateurs clés"/>
          <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
            {globalKpis.map((kpi, idx) => <KpiCard key={idx} kpi={kpi} idx={idx}/>)}
          </div>

          {/* ── Graphiques ── */}
          <SectionLabel icon={BarChart3} label="Analyse"/>
          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">

            {/* Consommation quotidienne depuis stock_movements */}
            <ConsumptionPanel
              chart={kpis.consumptionChart ?? []}
              stats={kpis.consumptionStats}
            />

            {/* Gaspillage & pertes */}
            <motion.div initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ delay:.3 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-widest text-slate-600">Gaspillage & pertes</p>
              <p className="mt-1 mb-4 sm:mb-5 text-sm font-semibold text-slate-700 syne">Bilan 30 jours</p>

              <div className="space-y-2.5 mb-5">
                {[
                  { label:"Total pertes",      value:`${(kpis.losses?.total_loss_value??0).toLocaleString("fr-FR")} FCFA`, color:"#1e293b", bg:"bg-slate-50", delay:.1 },
                  { label:"Mouvements pertes", value:String(kpis.losses?.expired_count??0),                                 color:"#dc2626", bg:"bg-red-50",   delay:.17 },
                  { label:"% perte / stock",   value:`${kpis.losses?.loss_percentage?.toFixed(2)??"0"}%`,                  color:"#ea580c", bg:"bg-orange-50",delay:.24 },
                ].map((row, i) => (
                  <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                    transition={{ delay:row.delay }}
                    className={`flex items-center justify-between rounded-xl border border-slate-100 ${row.bg} px-3 sm:px-4 py-2.5`}>
                    <span className="text-sm sm:text-sm text-slate-500">{row.label}</span>
                    <span className="text-sm sm:text-sm font-semibold syne" style={{ color:row.color }}>{row.value}</span>
                  </motion.div>
                ))}
              </div>

              <div>
                <div className="mb-2 flex justify-between text-[14px] sm:text-[14px] text-slate-600">
                  <span>Taux de perte global</span>
                  <span>{kpis.losses?.loss_percentage?.toFixed(1)??0}%</span>
                </div>
                <AnimBar pct={kpis.losses?.loss_percentage??0} color="linear-gradient(90deg, #f59e0b, #ef4444)" delay={.7}/>
              </div>
            </motion.div>
          </div>

          {/* ── Produits à surveiller ── 
          {(kpis.productsLowStockList?.length ?? 0) > 0 && (
            <div className="mb-8">
              <SectionLabel icon={AlertTriangle} label="Produits à surveiller"/>
              <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:.18 }}
                className="rounded-2xl border border-amber-100 bg-white shadow-sm overflow-hidden">

                {/* Desktop 
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {["Produit","Catégorie","Stock","Minimum","Unité","Criticité"].map((h,i) => (
                          <th key={i} className={`px-4 sm:px-5 py-3 text-[12px] font-semibold uppercase tracking-wider text-slate-600 ${i>=2?"text-right":"text-left"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.productsLowStockList.map((p, idx) => {
                        const pct    = p.minimum_stock > 0 ? Math.round((p.stock/p.minimum_stock)*100) : 100;
                        const accent = pct < 33 ? "#ef4444" : pct < 66 ? "#f97316" : "#f59e0b";
                        return (
                          <AnimRow key={idx} delay={idx*.05}>
                            <td className="px-4 sm:px-5 py-3.5 font-medium text-slate-700 max-w-[140px] truncate">{p.name}</td>
                            <td className="px-4 sm:px-5 py-3.5">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-sm text-slate-500">{p.category_name}</span>
                            </td>
                            <td className="px-4 sm:px-5 py-3.5 text-right font-semibold syne" style={{ color:accent }}>{p.stock}</td>
                            <td className="px-4 sm:px-5 py-3.5 text-right text-slate-600">{p.minimum_stock}</td>
                            <td className="px-4 sm:px-5 py-3.5 text-right text-slate-600 text-sm">{p.unit}</td>
                            <td className="px-4 sm:px-5 py-3.5 text-right">
                              <div className="inline-flex items-center gap-2 min-w-[90px] sm:min-w-[110px]">
                                <AnimBar pct={pct} color={accent} delay={.3+idx*.05} thin/>
                                <span className="text-[13px] font-semibold w-8 text-right shrink-0 syne" style={{ color:accent }}>{pct}%</span>
                              </div>
                            </td>
                          </AnimRow>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile 
                <div className="sm:hidden divide-y divide-slate-100">
                  {kpis.productsLowStockList.map((p, idx) => {
                    const pct    = p.minimum_stock > 0 ? Math.round((p.stock/p.minimum_stock)*100) : 100;
                    const accent = pct < 33 ? "#ef4444" : pct < 66 ? "#f97316" : "#f59e0b";
                    return (
                      <motion.div key={idx} initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }}
                        transition={{ delay:idx*.05 }} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[13px] text-slate-500">{p.category_name}</span>
                          </div>
                          <span className="text-lg font-bold shrink-0 syne" style={{ color:accent }}>{p.stock}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AnimBar pct={pct} color={accent} delay={.3+idx*.05} thin/>
                          <span className="text-[13px] font-semibold shrink-0 syne" style={{ color:accent }}>{pct}%</span>
                        </div>
                        <p className="text-[13px] text-slate-600">Min: {p.minimum_stock} {p.unit}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}*/}

          {/* ── Tendances + Valeur par catégorie ── */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Tendances */}
            {(kpis.trends?.length ?? 0) > 0 && (
              <div>
                <SectionLabel icon={Activity} label="Tendances — 7j vs 30j"/>
                <div className="flex flex-wrap gap-2">
                  {kpis.trends.slice(0, 12).map((trend, idx) => {
                    const up     = trend.direction === "up";
                    const stable = trend.direction === "stable";
                    return (
                      <motion.div key={idx} initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }}
                        transition={{ delay:idx*.04, type:"spring", stiffness:200 }}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                          stable ? "border-slate-100 bg-slate-50" :
                          up     ? "border-emerald-100 bg-emerald-50" :
                                   "border-red-100 bg-red-50"
                        }`}
                        title={`Moy. 7j: ${trend.avg7} | Moy. 30j: ${trend.avg30}`}>
                        {stable
                          ? <Minus size={12} className="text-slate-600 shrink-0"/>
                          : up
                          ? <ArrowUpRight size={12} className="text-emerald-500 shrink-0"/>
                          : <ArrowDownRight size={12} className="text-red-400 shrink-0"/>
                        }
                        <span className="text-sm sm:text-sm text-slate-600 truncate max-w-[120px]">{trend.product_name}</span>
                        <span className={`text-sm font-semibold shrink-0 syne ${stable ? "text-slate-600" : up ? "text-emerald-600" : "text-red-500"}`}>
                          {trend.value > 0 ? "+" : ""}{trend.value}%
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Valeur par catégorie */}
            {Object.keys(kpis.stockValueByCategory ?? {}).length > 0 && (
              <div>
                <SectionLabel icon={Layers} label="Valeur par catégorie"/>
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {Object.entries(kpis.stockValueByCategory)
                    .sort(([,a],[,b]) => b - a)
                    .map(([cat, val], idx, arr) => {
                      const maxCat = arr[0]?.[1] ?? 1;
                      const pct    = (val / maxCat) * 100;
                      return (
                        <motion.div key={idx} initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }}
                          transition={{ delay:idx*.05 }}
                          className={`px-4 sm:px-5 py-3 transition hover:bg-slate-50 ${idx < arr.length-1 ? "border-b border-slate-100" : ""}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm text-slate-600 truncate mr-3">{cat}</span>
                            <span className="text-sm font-semibold text-slate-700 shrink-0 syne">{val.toLocaleString("fr-FR")} FCFA</span>
                          </div>
                          <AnimBar pct={pct} color="#6366f1" delay={.2+idx*.04} thin/>
                        </motion.div>
                      );
                    })
                  }
                </div>
              </div>
            )}
          </div>

          {/* ── Top produits consommés ── */}
          {(kpis.topProducts?.length ?? 0) > 0 && (
            <div>
              <SectionLabel icon={Flame} label="Top produits consommés — 30 jours"/>
              <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:.2 }}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

                {/* Desktop */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {["#","Produit","Catégorie","Unité","Total","Moy./jour","Mouvements"].map((h,i) => (
                          <th key={i} className={`px-4 sm:px-5 py-3 text-[12px] font-semibold uppercase tracking-wider text-slate-600 ${i>=4?"text-right":"text-left"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.topProducts.map((p, idx) => (
                        <AnimRow key={idx} delay={idx*.04}>
                          <td className="px-4 sm:px-5 py-4">
                            <span className="text-sm font-bold text-slate-500 syne">{String(idx+1).padStart(2,"0")}</span>
                          </td>
                          <td className="px-4 sm:px-5 py-4 font-medium text-slate-700 max-w-[160px] truncate">{p.name}</td>
                          <td className="px-4 sm:px-5 py-4">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-sm text-slate-500">{p.category_name}</span>
                          </td>
                          <td className="px-4 sm:px-5 py-4 text-sm text-slate-600">{p.unit}</td>
                          <td className="px-4 sm:px-5 py-4 text-right font-semibold text-emerald-600 syne">{p.total_consumed}</td>
                          <td className="px-4 sm:px-5 py-4 text-right text-slate-600">{p.avg_per_day}</td>
                          <td className="px-4 sm:px-5 py-4 text-right text-slate-600">{p.movement_count}</td>
                        </AnimRow>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {kpis.topProducts.map((p, idx) => (
                    <motion.div key={idx} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                      transition={{ delay:idx*.05 }}
                      className="flex items-center justify-between px-4 py-3.5 gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-500 shrink-0 syne">{String(idx+1).padStart(2,"0")}</span>
                          <span className="font-medium text-slate-700 truncate text-sm">{p.name}</span>
                        </div>
                        <span className="text-sm text-slate-600">{p.category_name} · {p.unit}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-emerald-600 text-sm syne">{p.total_consumed}</p>
                        <p className="text-[13px] text-slate-600">{p.avg_per_day}/j · {p.movement_count} mvt</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}

        </div>
      </main>
    </SidebarLayout>
  );
}