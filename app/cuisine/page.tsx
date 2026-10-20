"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SidebarLayout from "@/src/navbar/SidebarLayout";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  ArrowDownToLine,
  ChefHat,
  CircleCheck,
  Clock3,
  Eye,
  LoaderCircle,
  Package,
  Pencil,
  RefreshCw,
  RotateCcw,
  Trash2,
  Utensils,
  X,
} from "lucide-react";

type KitchenEvent = {
  id: number;
  type: "SERVED" | "RETURNED";
  quantity: string;
  created_at: string;
  actor: { fullName: string };
};

type KitchenLine = {
  id: number;
  sent_quantity: string;
  served_quantity: string;
  returned_quantity: string;
  product: { name: string; unit: { name: string; abbreviation: string } };
  dispatch: { reference: string; created_at: string; creator: { fullName: string } };
  events: KitchenEvent[];
};

type HistoryFilter = "SENT" | "CONSUMPTION" | "RETURNED" | "PENDING";
type ActionType = "SERVED" | "RETURNED";

const quantity = (value: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
const number = (value: string) => Number(value) || 0;

export default function CuisinePage() {
  const { token, user, isLoading, isAdmin } = useAuth();
  const [lines, setLines] = useState<KitchenLine[]>([]);
  const [actionQuantity, setActionQuantity] = useState("");
  const [selectedAction, setSelectedAction] = useState<{ type: ActionType; eventId?: number } | null>(null);
  const [actionLineId, setActionLineId] = useState("");
  const [historyModal, setHistoryModal] = useState<HistoryFilter>("SENT");
  const [viewTarget, setViewTarget] = useState<{ line: KitchenLine; event: KitchenEvent } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ line: KitchenLine; event: KitchenEvent } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const permissions = user?.permissions ?? [];
  const canView = isAdmin || permissions.includes("CUISINE_VIEW");
  const canConsume = isAdmin || permissions.includes("CUISINE_SERVE");
  const canReturn = isAdmin || permissions.includes("CUISINE_RETURN");

  const load = useCallback(async () => {
    if (!token || !canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/cuisine", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Erreur de chargement");
      setLines(json.data.lines ?? []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau lors du chargement.");
    } finally {
      setLoading(false);
    }
  }, [token, canView]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(
    () =>
      lines.reduce(
        (sum, line) => {
          const sent = number(line.sent_quantity);
          const consumed = number(line.served_quantity);
          const returned = number(line.returned_quantity);
          return {
            sent: sum.sent + sent,
            consumed: sum.consumed + consumed,
            returned: sum.returned + returned,
            remaining: sum.remaining + Math.max(0, sent - consumed - returned),
          };
        },
        { sent: 0, consumed: 0, returned: 0, remaining: 0 },
      ),
    [lines],
  );

  async function record(line: KitchenLine, type: ActionType, eventId?: number) {
    const amount = Number(actionQuantity);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Saisissez une quantité valide.");
      return;
    }

    setBusy(line.id);
    setError("");
    try {
      const response = await fetch(eventId ? `/api/cuisine/${line.id}/events/${eventId}` : `/api/cuisine/${line.id}/events`, {
        method: eventId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventId ? { quantity: amount } : { type, quantity: amount, operation_key: crypto.randomUUID() }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Erreur d'enregistrement");
      setSelectedAction(null);
      setActionQuantity("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setBusy(null);
    }
  }

  async function removeEvent(line: KitchenLine, event: KitchenEvent) {
    setBusy(line.id);
    setError("");
    try {
      const response = await fetch(`/api/cuisine/${line.id}/events/${event.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Erreur de suppression");
      setDeleteTarget(null);
      if (viewTarget?.event.id === event.id) setViewTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-slate-50 p-8 text-slate-500">Chargement de la cuisine…</div>
      </SidebarLayout>
    );
  }

  if (!canView) {
    return (
      <SidebarLayout>
        <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <ChefHat className="mx-auto mb-3 h-9 w-9 text-orange-500" />
            <h1 className="text-lg font-semibold text-slate-900">Accès Cuisine réservé</h1>
            <p className="mt-1 text-sm text-slate-500">
              Votre compte n’a pas la permission de consulter le suivi Cuisine.
            </p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  const cards: {
    key: HistoryFilter;
    label: string;
    value: number;
    icon: typeof Package;
    color: string;
    bg: string;
  }[] = [
    { key: "SENT", label: "Envoyé en cuisine", value: new Set(lines.filter(line => number(line.sent_quantity) > 0).map(line => line.product.name)).size, icon: Package, color: "text-blue-700", bg: "bg-blue-50" },
    { key: "CONSUMPTION", label: "Consommation", value: new Set(lines.filter(line => number(line.served_quantity) > 0).map(line => line.product.name)).size, icon: Utensils, color: "text-emerald-700", bg: "bg-emerald-50" },
    { key: "RETURNED", label: "Retourné au stock", value: new Set(lines.filter(line => number(line.returned_quantity) > 0).map(line => line.product.name)).size, icon: RotateCcw, color: "text-amber-700", bg: "bg-amber-50" },
    { key: "PENDING", label: "À traiter", value: new Set(lines.filter(line => number(line.sent_quantity) - number(line.served_quantity) - number(line.returned_quantity) > 0).map(line => line.product.name)).size, icon: Clock3, color: "text-violet-700", bg: "bg-violet-50" },
  ];

  const selectedLine = selectedAction ? lines.find((line) => line.id === Number(actionLineId)) : undefined;
  const actionRemaining = selectedLine
    ? Math.max(0, number(selectedLine.sent_quantity) - number(selectedLine.served_quantity) - number(selectedLine.returned_quantity) + (selectedAction?.eventId ? (() => {
      const event = selectedLine.events.find((item) => item.id === selectedAction.eventId);
      return event ? number(event.quantity) : 0;
    })() : 0))
    : 0;

  return (
    <SidebarLayout>
      <main className="min-h-screen bg-slate-50/80 px-4 py-7 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-7">
          <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-400 px-6 py-7 text-white shadow-lg shadow-orange-900/10 sm:px-8 sm:py-9">
            <div className="absolute -right-8 -top-16 h-56 w-56 rounded-full border-[30px] border-white/10" />
            <div className="relative flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/25">
                  <ChefHat className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[.22em] text-orange-50">Local Grill · Gestion de stock</p>
                  <h1 className="mt-1 text-3xl font-bold tracking-tight">Suivi Cuisine</h1>
                  <p className="mt-1 text-sm text-orange-50">Suivez les quantités envoyées, consommées et retournées au stock.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canConsume && <button onClick={() => { setActionQuantity(""); setActionLineId(""); setSelectedAction({ type: "SERVED" }); }} disabled={loading || totals.remaining <= 0} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"><Utensils className="h-4 w-4" />Consommation</button>}
                {canReturn && <button onClick={() => { setActionQuantity(""); setActionLineId(""); setSelectedAction({ type: "RETURNED" }); }} disabled={loading || totals.remaining <= 0} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"><ArrowDownToLine className="h-4 w-4" />Retour de stock</button>}
                <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualiser
                </button>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Historiques Cuisine">
            {cards.map(({ key, label, value, icon: Icon, color, bg }) => (
              <button
                type="button"
                key={key}
                onClick={() => setHistoryModal(key)}
                aria-pressed={historyModal === key}
                className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:p-5 ${historyModal === key ? "border-orange-400 bg-orange-50/70 ring-2 ring-orange-200" : "border-slate-200/80 bg-white hover:border-orange-300"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500 sm:text-sm">{label}</span>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} ${color}`}><Icon className="h-4 w-4" /></span>
                </span>
                <span className="mt-3 block text-2xl font-bold tracking-tight text-slate-900">
                  {value}<span className="ml-1 text-sm font-medium text-slate-400">produit{value > 1 ? "s" : ""}</span>
                </span>
                <span className="mt-1 block text-[11px] font-semibold text-orange-700">Voir l’historique →</span>
              </button>
            ))}
          </section>

          {error && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <span className="flex items-center gap-2"><X className="h-4 w-4" />{error}</span>
              <button onClick={() => void load()} className="font-semibold underline">Réessayer</button>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-semibold text-slate-900">{historyModal === "SENT" ? "Historique d’approvisionnement" : historyModal === "CONSUMPTION" ? "Historique des consommations" : historyModal === "RETURNED" ? "Historique des retours au stock" : "Produits restant à traiter"}</h2>
                {historyModal !== "SENT" && <p className="mt-0.5 text-xs text-slate-500">Détails des produits concernés par cet indicateur.</p>}
              </div>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                {historyModal === "SENT" ? lines.length : historyModal === "PENDING" ? lines.filter(line => number(line.sent_quantity) - number(line.served_quantity) - number(line.returned_quantity) > 0).length : lines.reduce((count, line) => count + line.events.filter(event => event.type === (historyModal === "CONSUMPTION" ? "SERVED" : "RETURNED")).length, 0)} élément(s)
              </span>
            </div>

            {historyModal !== "SENT" && <HistoryPanel filter={historyModal} lines={lines} canConsume={canConsume} canReturn={canReturn} onView={(line, event) => setViewTarget({ line, event })} onEdit={(line, event) => { setActionLineId(String(line.id)); setActionQuantity(String(number(event.quantity))); setSelectedAction({ type: event.type, eventId: event.id }); }} onDelete={(line, event) => setDeleteTarget({ line, event })} />}

            {historyModal === "SENT" && <>

            {loading && lines.length === 0 ? (
              <div className="flex items-center justify-center gap-2 p-14 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />Chargement des envois…</div>
            ) : lines.length === 0 && !error ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><ChefHat className="h-7 w-7" /></div>
                <p className="mt-4 font-semibold text-slate-800">Aucun produit envoyé en Cuisine</p>
                <p className="mt-1 text-sm text-slate-500">Les sorties vers la destination Cuisine apparaîtront ici.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {lines.map((line) => {
                  const sent = number(line.sent_quantity);
                  const consumed = number(line.served_quantity);
                  const returned = number(line.returned_quantity);
                  const remaining = Math.max(0, sent - consumed - returned);
                  const unit = line.product.unit.abbreviation || line.product.unit.name;
                  const done = remaining <= 0;
                  const status = done
                    ? consumed > 0 && returned > 0
                      ? "Traité · consommé et retourné"
                      : returned >= sent
                        ? "Entièrement retourné"
                        : "Entièrement consommé"
                    : consumed > 0 || returned > 0 ? "En cours" : "En attente";
                  const progress = sent > 0 ? Math.min(100, ((consumed + returned) / sent) * 100) : 0;
                  return (
                    <article key={line.id} className="p-4 sm:p-6">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Package className="h-4 w-4" /></span>
                                <h3 className="font-semibold text-slate-900">{line.product.name}</h3>
                              </div>
                              <p className="ml-11 mt-1 text-xs text-slate-500">Réf. {line.dispatch.reference} · Envoyé par {line.dispatch.creator.fullName} · {new Date(line.dispatch.created_at).toLocaleString("fr-FR")}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${done ? "bg-emerald-50 text-emerald-700" : progress > 0 ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                              {done && <CircleCheck className="mr-1 inline h-3.5 w-3.5" />}{status}
                            </span>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Metric label="Envoyé" value={sent} unit={unit} tone="text-slate-900" />
                            <Metric label="Consommé" value={consumed} unit={unit} tone="text-emerald-700" />
                            <Metric label="Retourné" value={returned} unit={unit} tone="text-amber-700" />
                            <Metric label="Restant" value={remaining} unit={unit} tone="text-violet-700" />
                          </div>

                          <div className="mt-4">
                            <div className="mb-1.5 flex justify-between text-[11px] text-slate-400"><span>Traité</span><span>{Math.round(progress)}%</span></div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-orange-400 transition-all" style={{ width: `${progress}%` }} /></div>
                          </div>

                          {line.events.length > 0 && (
                            <details className="mt-4">
                              <summary className="w-fit cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800">
                                Historique des opérations ({line.events.length})
                              </summary>
                              <ul className="mt-2 space-y-1.5 border-l-2 border-slate-100 pl-3 text-xs text-slate-500">
                                {line.events.map((event) => {
                                  const mayManage = event.type === "SERVED" ? canConsume : canReturn;
                                  return (
                                    <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-1">
                                      <span>
                                        <span className={event.type === "SERVED" ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                                          {event.type === "SERVED" ? "Consommation" : "Retour de stock"}
                                        </span>
                                        {" · "}{quantity(number(event.quantity))} {unit}{" · "}{event.actor.fullName}{" · "}{new Date(event.created_at).toLocaleString("fr-FR")}
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <button type="button" title="Voir cette opération" aria-label={`Voir ${event.type === "SERVED" ? "la consommation" : "le retour"} de ${line.product.name}`} onClick={() => setViewTarget({ line, event })} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Eye className="h-4 w-4" /></button>
                                        {mayManage && <>
                                          <button type="button" title="Modifier cette opération" aria-label={`Modifier ${event.type === "SERVED" ? "la consommation" : "le retour"} de ${line.product.name}`} onClick={() => { setActionLineId(String(line.id)); setActionQuantity(String(number(event.quantity))); setSelectedAction({ type: event.type, eventId: event.id }); }} className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"><Pencil className="h-4 w-4" /></button>
                                          <button type="button" title="Supprimer cette opération" aria-label={`Supprimer ${event.type === "SERVED" ? "la consommation" : "le retour"} de ${line.product.name}`} onClick={() => setDeleteTarget({ line, event })} className="rounded-md p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                                        </>}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </details>
                          )}
                        </div>

                        {remaining > 0 && <p className="mt-4 text-xs text-slate-500">{quantity(remaining)} {unit} encore disponibles pour consommation ou retour de stock.</p>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            </>}
          </section>
        </div>
      </main>
      {selectedAction && (() => {
        const type = selectedAction.type;
        const unit = selectedLine ? (selectedLine.product.unit.abbreviation || selectedLine.product.unit.name) : "";
        const isReturn = type === "RETURNED";
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedAction(null); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="kitchen-action-title" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
              <header className={`flex items-center justify-between border-b px-5 py-4 ${isReturn ? "border-amber-100 bg-amber-50/70" : "border-emerald-100 bg-emerald-50/70"}`}>
                <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Suivi Cuisine</p><h2 id="kitchen-action-title" className="mt-1 text-lg font-bold text-slate-900">{selectedAction.eventId ? "Modifier l’opération" : isReturn ? "Retour de stock" : "Consommation"}</h2></div>
                <button type="button" onClick={() => setSelectedAction(null)} aria-label="Fermer" className="rounded-lg p-2 text-slate-500 hover:bg-white"><X className="h-5 w-5" /></button>
              </header>
              {error && <p role="alert" className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <div className="space-y-5 p-5">
                <div>
                  <label htmlFor="kitchen-product-line" className="mb-2 block text-sm font-semibold text-slate-700">Produit envoyé en Cuisine</label>
                  <select id="kitchen-product-line" disabled={Boolean(selectedAction.eventId)} value={actionLineId} onChange={(event) => { setActionLineId(event.target.value); setActionQuantity(""); }} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100">
                    <option value="">Choisir un produit / envoi…</option>
                    {lines.filter((line) => {
                      const remaining = number(line.sent_quantity) - number(line.served_quantity) - number(line.returned_quantity);
                      return remaining > 0 || line.id === Number(actionLineId);
                    }).map((line) => <option key={line.id} value={line.id}>{line.product.name}</option>)}
                  </select>
                </div>
                {selectedLine && (type === "SERVED" ? <div className="rounded-xl border border-violet-200 bg-violet-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Restant</p><p className="mt-1 text-2xl font-bold text-violet-900">{quantity(actionRemaining)} <span className="text-sm font-medium">{unit}</span></p></div> : <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{selectedLine.product.name}</p>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <div className="rounded-lg bg-white p-2"><p className="text-[11px] text-slate-500">Envoyé</p><p className="mt-0.5 text-sm font-bold">{quantity(number(selectedLine.sent_quantity))} {unit}</p></div>
                    <div className="rounded-lg bg-white p-2"><p className="text-[11px] text-slate-500">Consommé</p><p className="mt-0.5 text-sm font-bold text-emerald-700">{quantity(number(selectedLine.served_quantity))} {unit}</p></div>
                    <div className="rounded-lg bg-white p-2"><p className="text-[11px] text-slate-500">Retourné</p><p className="mt-0.5 text-sm font-bold text-amber-700">{quantity(number(selectedLine.returned_quantity))} {unit}</p></div>
                    <div className="rounded-lg bg-white p-2"><p className="text-[11px] text-slate-500">Restant</p><p className="mt-0.5 text-sm font-bold text-violet-700">{quantity(actionRemaining)} {unit}</p></div>
                  </div>
                </div>)}
                <div>
                  <label htmlFor="kitchen-action-quantity" className="mb-2 block text-sm font-semibold text-slate-700">Quantité {isReturn ? "à retourner au stock" : "consommée"}</label>
                  <div className="relative"><input id="kitchen-action-quantity" type="number" min="0.000001" step="0.01" max={actionRemaining} value={actionQuantity} onChange={(event) => setActionQuantity(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-16 text-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" placeholder="Saisir une quantité"/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">{unit}</span></div>
                  <p className="mt-1.5 text-xs text-slate-500">Maximum disponible : {quantity(actionRemaining)} {unit}</p>
                </div>
              </div>
              <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
                <button type="button" onClick={() => setSelectedAction(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Annuler</button>
                <button type="button" disabled={!selectedLine || busy === selectedLine.id || !actionQuantity} onClick={() => selectedLine && void record(selectedLine, type, selectedAction.eventId)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${isReturn ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                  {selectedLine && busy === selectedLine.id && <LoaderCircle className="h-4 w-4 animate-spin" />}{selectedAction.eventId ? "Enregistrer les modifications" : isReturn ? "Confirmer le retour" : "Confirmer la consommation"}
                </button>
              </footer>
            </section>
          </div>
        );
      })()}
      {viewTarget && <EventViewModal line={viewTarget.line} event={viewTarget.event} onClose={() => setViewTarget(null)} />}
      {deleteTarget && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-event-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><Trash2 className="h-5 w-5" /></span><div><h2 id="delete-event-title" className="font-bold text-slate-900">Supprimer cette opération ?</h2><p className="mt-1 text-sm text-slate-500">Cette suppression recalculera les quantités Cuisine. Pour un retour, le stock sera également ajusté si la quantité retournée est toujours disponible.</p></div></div>{error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button onClick={() => { setDeleteTarget(null); setError(""); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Annuler</button><button disabled={busy === deleteTarget.line.id} onClick={() => void removeEvent(deleteTarget.line, deleteTarget.event)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === deleteTarget.line.id && <LoaderCircle className="h-4 w-4 animate-spin" />}Supprimer</button></div></section></div>}
    </SidebarLayout>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${tone}`}>{quantity(value)} <span className="text-xs font-medium text-slate-400">{unit}</span></p>
    </div>
  );
}

function EventViewModal({ line, event, onClose }: { line: KitchenLine; event: KitchenEvent; onClose: () => void }) {
  const unit = line.product.unit.abbreviation || line.product.unit.name;
  const isConsumption = event.type === "SERVED";
  const values = [
    ["Type d’opération", isConsumption ? "Consommation" : "Retour de stock"],
    ["Produit", line.product.name],
    ["Quantité", `${quantity(number(event.quantity))} ${unit}`],
    ["Référence d’envoi", line.dispatch.reference],
    ["Date de l’opération", new Date(event.created_at).toLocaleString("fr-FR")],
    ["Enregistré par", event.actor.fullName],
  ];
  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(click) => { if (click.target === click.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="kitchen-event-title" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Détail de l’opération</p><h2 id="kitchen-event-title" className="mt-1 text-lg font-bold text-slate-900">{isConsumption ? "Consommation" : "Retour de stock"}</h2></div><button onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></header>
        <dl className="divide-y divide-slate-100 px-5">{values.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 py-3"><dt className="text-sm text-slate-500">{label}</dt><dd className="text-right text-sm font-semibold text-slate-900">{value}</dd></div>)}</dl>
        <footer className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3"><button onClick={onClose} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Fermer</button></footer>
      </section>
    </div>
  );
}

function HistoryPanel({ filter, lines, canConsume, canReturn, onView, onEdit, onDelete }: {
  filter: HistoryFilter;
  lines: KitchenLine[];
  canConsume: boolean;
  canReturn: boolean;
  onView: (line: KitchenLine, event: KitchenEvent) => void;
  onEdit: (line: KitchenLine, event: KitchenEvent) => void;
  onDelete: (line: KitchenLine, event: KitchenEvent) => void;
}) {
  const eventType = filter === "CONSUMPTION" ? "SERVED" : filter === "RETURNED" ? "RETURNED" : null;
  const events = eventType ? lines.flatMap((line) => line.events.filter((event) => event.type === eventType).map((event) => ({ line, event }))) : [];
  const listedLines = filter === "PENDING"
    ? lines.filter((line) => number(line.sent_quantity) - number(line.served_quantity) - number(line.returned_quantity) > 0)
    : filter === "SENT" ? lines : [];

  return (
    <div className="overflow-x-auto p-4 sm:p-5">
          {events.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Produit</th><th className="px-4 py-3">Quantité</th><th className="px-4 py-3">Référence</th><th className="px-4 py-3">Responsable</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{events.sort((a, b) => new Date(b.event.created_at).getTime() - new Date(a.event.created_at).getTime()).map(({ line, event }) => {
                  const unit = line.product.unit.abbreviation || line.product.unit.name;
                  const mayManage = event.type === "SERVED" ? canConsume : canReturn;
                  return <tr key={event.id}><td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(event.created_at).toLocaleString("fr-FR")}</td><td className="px-4 py-3 font-medium text-slate-900">{line.product.name}</td><td className={`whitespace-nowrap px-4 py-3 font-bold ${event.type === "SERVED" ? "text-emerald-700" : "text-amber-700"}`}>{quantity(number(event.quantity))} {unit}</td><td className="px-4 py-3 text-slate-600">{line.dispatch.reference}</td><td className="px-4 py-3 text-slate-600">{event.actor.fullName}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button title="Voir" aria-label="Voir" onClick={() => onView(line, event)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Eye className="h-4 w-4" /></button>{mayManage && <><button title="Modifier" aria-label="Modifier" onClick={() => onEdit(line, event)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Pencil className="h-4 w-4" /></button><button title="Supprimer" aria-label="Supprimer" onClick={() => onDelete(line, event)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></>}</div></td></tr>;
                })}</tbody>
              </table>
            </div>
          ) : listedLines.length > 0 ? (
            <div className="space-y-3">{listedLines.map((line) => {
              const sent = number(line.sent_quantity), consumed = number(line.served_quantity), returned = number(line.returned_quantity);
              const remaining = Math.max(0, sent - consumed - returned);
              const unit = line.product.unit.abbreviation || line.product.unit.name;
              return <article key={line.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{line.product.name}</h3><p className="mt-1 text-xs text-slate-500">Réf. {line.dispatch.reference} · {new Date(line.dispatch.created_at).toLocaleString("fr-FR")} · {line.dispatch.creator.fullName}</p></div><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">{filter === "PENDING" ? `${quantity(remaining)} ${unit} à traiter` : `${quantity(sent)} ${unit} envoyés`}</span></div>
                <div className="mt-3 grid grid-cols-3 gap-2"><Metric label="Envoyé" value={sent} unit={unit} tone="text-slate-900"/><Metric label="Consommé" value={consumed} unit={unit} tone="text-emerald-700"/><Metric label="Retourné" value={returned} unit={unit} tone="text-amber-700"/></div>
              </article>;
            })}</div>
          ) : (
            <div className="py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Package className="h-6 w-6" /></div><p className="mt-3 font-semibold text-slate-800">Aucun détail à afficher</p><p className="mt-1 text-sm text-slate-500">L’historique apparaîtra ici après l’enregistrement d’une opération.</p></div>
          )}
    </div>
  );
}
