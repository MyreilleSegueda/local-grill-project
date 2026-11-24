"use client";

/**
 * app/dashboard/page.tsx
 *
 * Tableau de bord — données issues de l'API /api/dashboard
 * Graphique de consommation : basé sur stock_movements (OUT, LOSS, EXPIRED)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import SidebarLayout from "@/src/navbar/SidebarLayout";
import { useAuth }   from "@/lib/hooks/useAuth";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Package, Bell,
  ChevronRight, BarChart3, CheckCircle2, XCircle,
  RefreshCw, Plus, Download, Store, ArrowLeftRight,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */

interface DayPoint {
  day:            string;
  date:           string;
  total_consumed: number;
  movement_count: number;
  total_entries?: number;
  total_kitchen_out?: number;
  kitchen_movement_count?: number;
}

interface LowStockItem {
  name:          string;
  category_name: string;
  stock:         number;
  minimum_stock: number;
  unit:          string;
  stock_value?: number;
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
  productsLowStockList: LowStockItem[];
  stockValueByCategory: Record<string, number>;
  totalStockValue?: number;
  inventoryOverview?: LowStockItem[];
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
            ${notif.type === "success" ? "border-orange-200 bg-orange-50 text-orange-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {notif.type === "success" ? <CheckCircle2 size={15}/> : <XCircle size={15}/>}
          <span className="truncate">{notif.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
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
   Graphique des entrées et sorties sur sept jours
───────────────────────────────────────────────────────────────────────────── */
function ConsumptionPanel({ chart }: { chart: DayPoint[] }) {
  const maxVal   = Math.max(...chart.flatMap(d => [d.total_kitchen_out ?? 0, d.total_entries ?? 0]), 1);
  const total    = chart.reduce((s, d) => s + (d.total_kitchen_out ?? 0), 0);
  const tickMax = Math.max(10, Math.ceil(maxVal / 10) * 10);
  const ticks = [tickMax, tickMax * .75, tickMax * .5, tickMax * .25, 0];

  return (
    <motion.div initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ delay:.22 }}
      className="rounded-2xl border border-[#e3e7df] bg-white p-5 sm:p-7 shadow-sm flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-lg font-semibold text-slate-900 syne">Le rythme de votre stock</p>
          <p className="mt-1 text-sm text-slate-500">Valeur des mouvements · quantités cumulées</p>
        </div>
        <select aria-label="Période du graphique" value="7" onChange={() => {}} className="rounded-lg border border-[#e3e7df] bg-white px-3 py-2 text-sm text-slate-600 outline-none">
          <option value="7">7 derniers jours</option>
        </select>
      </div>

      <div className="flex items-center gap-5 mb-3 text-xs text-slate-500" aria-label="Légende du graphique">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-[#cf5145]"/>Entrées magasin</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-[#d99a35]"/>Sorties cuisine</span>
      </div>

      <div className="h-[290px] pt-2">
        {total === 0 && chart.every(day => !(day.total_entries ?? 0)) ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <BarChart3 size={28} className="text-slate-400"/>
            <p className="text-sm text-slate-600">Aucun mouvement sur 7 jours</p>
          </div>
        ) : (
          <div className="flex h-full gap-3">
            <div className="flex h-full w-7 flex-col justify-between pb-7 text-[11px] text-slate-400">
              {ticks.map((tick, index) => <span key={index}>{Math.round(tick)}</span>)}
            </div>
            <div className="relative h-full flex-1">
              <div className="absolute inset-x-0 top-0 bottom-7 flex flex-col justify-between" aria-hidden="true">
                {ticks.map((tick, index) => <span key={index} className="border-t border-[#e7ebe6]"/>)}
              </div>
              <div className="relative z-[1] flex h-full items-end justify-between gap-2">
                {chart.map((d, i) => {
                  const kitchenOut = d.total_kitchen_out ?? 0;
                  const outPct = (kitchenOut / tickMax) * 100;
                  const inPct = ((d.total_entries ?? 0) / tickMax) * 100;
                  return <div key={i} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                    {(kitchenOut > 0 || (d.total_entries ?? 0) > 0) && <div className="pointer-events-none absolute bottom-[calc(100%-1.5rem)] z-10 hidden whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 text-xs text-white shadow-lg group-hover:block">Entrées magasin {d.total_entries ?? 0} · Sorties cuisine {kitchenOut.toFixed(1)}</div>}
                    <div className="mb-7 flex h-[calc(100%-1.75rem)] w-full max-w-14 items-end justify-center gap-1">
                      <motion.div className="w-[42%] rounded-t-md bg-[#cf5145]" initial={{ height:0 }} animate={{ height:`${inPct}%` }} transition={{ delay:.3+i*.05, duration:.7, ease:[.16,1,.3,1] }} style={{ minHeight:(d.total_entries ?? 0) > 0 ? "5px" : 0 }}/>
                      <motion.div className="w-[42%] rounded-t-md bg-[#d99a35]" initial={{ height:0 }} animate={{ height:`${outPct}%` }} transition={{ delay:.35+i*.05, duration:.7, ease:[.16,1,.3,1] }} style={{ minHeight:kitchenOut > 0 ? "5px" : 0 }}/>
                    </div>
                    <span className="absolute bottom-0 text-[11px] capitalize text-slate-500">{d.day}.</span>
                  </div>;
                })}
              </div>
            </div>
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
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [stockSearch, setStockSearch] = useState("");

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
  const stockValue = kpis.totalStockValue ?? Object.values(kpis.stockValueByCategory ?? {}).reduce((sum, value) => sum + value, 0);
  const todayConsumption = kpis.consumptionChart?.[kpis.consumptionChart.length - 1]?.total_kitchen_out ?? 0;
  const visibleProducts = (kpis.inventoryOverview ?? []).filter(product => {
    const statusMatches = stockFilter === "all" || (stockFilter === "out" ? product.stock <= 0 : product.stock > 0 && product.stock < product.minimum_stock);
    return statusMatches && product.name.toLocaleLowerCase("fr-FR").includes(stockSearch.toLocaleLowerCase("fr-FR"));
  });

  const globalKpis: KpiConfig[] = [
    {
      title:"Valeur du stock", value:`${stockValue.toLocaleString("fr-FR")} FCFA`, Icon:Store,
      accent:"#cf5145", borderColor:"#f1dfdc", iconBg:"#fdf0ee", iconColor:"#cf5145", valueColor:"#292524",
      subtitle:"Valorisation au coût unitaire", href:"/rapports",
    },
    {
      title:"Produits référencés", rawValue: kpis.totalProducts??0, Icon:Package,
      accent:"#d99a35", borderColor:"#f1e7d7", iconBg:"#fbf4e8", iconColor:"#d99a35", valueColor:"#292524",
      subtitle:"références actives", href:"/produits",
    },
    {
      title:"Stocks à surveiller", rawValue: kpis.productsLowStockList?.length??0, Icon:Bell,
      accent:"#d97706", borderColor:"#f2e7d1", iconBg:"#fbf4e7", iconColor:"#b45309", valueColor:"#7c3d12",
      subtitle:`${kpis.productsOutOfStock??0} en rupture · seuils personnalisés`, href:"/alertes",
    },
    {
      title:"Sorties du jour", value: `${todayConsumption.toLocaleString("fr-FR")} unités`, Icon:ArrowLeftRight,
      accent:"#cf5145", borderColor:"#f1dfdc", iconBg:"#fdf0ee", iconColor:"#cf5145", valueColor:"#292524",
      subtitle:`${kpis.consumptionChart?.at(-1)?.kitchen_movement_count ?? 0} mouvements vers la cuisine`, href:"/cuisine",
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

      <main className="min-h-screen bg-[#f8f7f4] p-4 sm:p-6 lg:p-8 pb-20" style={{ color:"#292524" }}>
        <div className="max-w-7xl mx-auto">

          {/* ── Header ── */}
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:.35 }}
            className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 leading-tight syne">Un œil sur votre stock.</h1>
              <p className="mt-2 text-sm sm:text-base text-slate-500">L’essentiel pour préparer votre service en toute sérénité.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""}/>Actualiser</button>
              <a href="/rapports" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download size={16}/>Exporter</a>
              <a href="/entrees" className="flex items-center gap-2 rounded-xl bg-[#cf5145] px-4 py-3 text-sm font-semibold text-white hover:bg-[#b83c32]"><Plus size={17}/>Nouveau mouvement</a>
            </div>
          </motion.div>

          {/* ── KPIs ── */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
            {globalKpis.map((kpi, idx) => <KpiCard key={idx} kpi={kpi} idx={idx}/>)}
          </div>

          {/* ── Graphiques ── */}
          <div className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">

            {/* Consommation quotidienne depuis stock_movements */}
            <ConsumptionPanel chart={kpis.consumptionChart ?? []}/>

            {/* Produits à surveiller */}
            <motion.div initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ delay:.3 }}
              className="rounded-2xl border border-[#e6e8dc] bg-[#fffefa] p-5 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 syne"><Bell size={19}/>Un peu d’attention</h2>
                <span className="rounded-lg bg-[#f8ebcf] px-2.5 py-1 text-xs font-medium text-[#9a641e]">{kpis.productsLowStockList?.length ?? 0} produits</span>
              </div>
              <div className="divide-y divide-[#ecece3]">
                {(kpis.productsLowStockList ?? []).slice(0, 4).map((product, index) => {
                  const out = product.stock <= 0;
                  return <div key={`${product.name}-${index}`} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4efe3] text-[#a98b59]"><Package size={19}/></span>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{product.name}</p><p className="text-xs text-slate-500">Seuil minimum : {product.minimum_stock} {product.unit}</p></div>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold ${out ? "text-red-600" : "text-orange-600"}`}>{out ? "En rupture" : `${product.stock} ${product.unit} restants`}</span>
                  </div>;
                })}
                {(kpis.productsLowStockList?.length ?? 0) === 0 && <div className="py-8 text-center text-sm text-slate-500">Aucun produit à surveiller.</div>}
              </div>
              <a href="/alertes" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#cf5145] hover:underline">Voir les produits à surveiller <span aria-hidden="true">→</span></a>
            </motion.div>
          </div>



          <section className="mb-8 overflow-hidden rounded-2xl border border-[#e3e7df] bg-white shadow-sm">
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><h2 className="text-lg font-semibold text-slate-900 syne">Votre stock en un coup d’œil</h2><p className="mt-1 text-sm text-slate-500">Les bons produits, au bon moment.</p></div>
                <a href="/produits" className="text-sm font-semibold text-[#cf5145] hover:underline">+ Ajouter un produit</a>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filtrer les produits">
                  {[{ key:"all", label:"Tous les produits" }, { key:"low", label:"Stock faible" }, { key:"out", label:"En rupture" }].map(tab => <button key={tab.key} role="tab" aria-selected={stockFilter === tab.key} onClick={() => setStockFilter(tab.key as typeof stockFilter)} className={`rounded-lg px-3 py-2 text-sm ${stockFilter === tab.key ? "bg-[#fdf0ee] font-semibold text-[#b83c32]" : "text-slate-500 hover:bg-slate-50"}`}>{tab.label}</button>)}
                </div>
                <input value={stockSearch} onChange={event => setStockSearch(event.target.value)} placeholder="Rechercher un produit…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#cf5145] sm:w-64" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="border-y border-[#e8ebe6] bg-[#fafbf9] text-left text-xs text-slate-500"><tr>{["Produit", "Catégorie", "Stock disponible", "Seuil minimum", "Valeur du stock", "État", ""].map(label => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-[#edf0eb]">
                  {visibleProducts.slice(0, 12).map((product, index) => {
                    const out = product.stock <= 0;
                    const low = product.stock < product.minimum_stock;
                    return <tr key={`${product.name}-${index}`} className="hover:bg-[#fcfdfb]">
                      <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fbf4e8] text-[#b47b26]"><Package size={19}/></span><div><p className="font-semibold text-slate-900">{product.name}</p><p className="text-xs text-slate-400">Référence stock</p></div></div></td>
                      <td className="px-5 py-4 text-slate-500">{product.category_name}</td>
                      <td className="px-5 py-4"><strong className="text-slate-900">{product.stock} {product.unit}</strong><div className="mt-1 h-1 w-24 rounded-full bg-slate-100"><div className={`h-1 rounded-full ${out ? "bg-red-500" : low ? "bg-orange-400" : "bg-[#d99a35]"}`} style={{ width:`${Math.min(100, product.minimum_stock ? (product.stock / product.minimum_stock) * 100 : 100)}%` }}/></div></td>
                      <td className="px-5 py-4 text-slate-500">{product.minimum_stock} {product.unit}</td>
                      <td className="px-5 py-4 text-slate-900">{(product.stock_value ?? 0).toLocaleString("fr-FR")} FCFA</td>
                      <td className="px-5 py-4"><span className={`rounded-md px-2.5 py-1 text-xs ${out ? "bg-red-50 text-red-700" : low ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-600"}`}>{out ? "En rupture" : low ? "Stock faible" : "Disponible"}</span></td>
                      <td className="px-5 py-4"><a href="/entrees" title={`Ajouter du stock : ${product.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-lg text-slate-700 hover:bg-orange-50">+</a></td>
                    </tr>;
                  })}
                  {visibleProducts.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Aucun produit ne correspond à cette recherche.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between border-t border-[#e8ebe6] px-5 py-3 text-xs text-slate-400"><span>{visibleProducts.length} produit(s) affiché(s)</span><a href="/produits" className="hover:text-[#cf5145]">Enregistrement local automatique</a></div>
          </section>


        </div>
      </main>
    </SidebarLayout>
  );
}
