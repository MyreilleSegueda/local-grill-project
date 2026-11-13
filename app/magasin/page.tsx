"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import SidebarLayout from "@/src/navbar/SidebarLayout";
import { useAuth } from "@/lib/hooks/useAuth";
import { ArrowLeftRight, Check, Clock3, LoaderCircle, Package, RefreshCw, Warehouse, X } from "lucide-react";
import { addQuantities, formatQuantity, isPositiveQuantity, subtractQuantities } from "@/lib/utils/decimalQuantity";

type StoreBalance = {
  id: number;
  quantity: string;
  batch: {
    id: number;
    batch_number: string;
    entry_date: string;
    expiration_date: string | null;
    purchase_price: string;
    product: { id: number; name: string; unit: { abbreviation: string; name: string } };
  };
};

type StoreReturn = {
  id: number;
  quantity: string;
  received_quantity: string;
  status: "PENDING" | "PARTIAL";
  requested_at: string;
  reason: string | null;
  product: { name: string; unit: { abbreviation: string; name: string } };
  batch: { batch_number: string; entry_date: string };
  requester: { fullName: string };
  dispatch_line: { dispatch: { reference: string; created_at: string } };
};

type StoreMovement = {
  id: number;
  from_location: "GENERAL" | "STORE" | "CUISINE";
  to_location: "GENERAL" | "STORE" | "CUISINE";
  quantity: string;
  created_at: string;
  reference_number: string | null;
  product: { name: string; unit: { abbreviation: string; name: string } };
  batch: { batch_number: string; entry_date: string };
  actor: { fullName: string };
};

type StoreData = {
  balances: StoreBalance[];
  returns: StoreReturn[];
  movements: StoreMovement[];
  permissions: { canView: boolean; canTransfer: boolean; canReceive: boolean; canReturnToStock: boolean };
};
const emptyData: StoreData = {
  balances: [],
  returns: [],
  movements: [],
  permissions: { canView: false, canTransfer: false, canReceive: false, canReturnToStock: false },
};

const qty = (value: string | number) =>
  formatQuantity(String(value));
const locationLabel = (location: StoreMovement["from_location"]) =>
  location === "GENERAL" ? "Stock" : location === "STORE" ? "Magasin" : "Cuisine";

export default function MagasinPage() {
  const { token, user, isLoading, isAdmin } = useAuth();
  const [data, setData] = useState<StoreData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | "transfer" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [destination, setDestination] = useState<"CUISINE" | "STOCK">("CUISINE");
  const [receiptQuantities, setReceiptQuantities] = useState<Record<number, string>>({});

  const permissions = user?.permissions ?? [];
  const canView = isAdmin || permissions.some((permission) =>
    ["STORE_VIEW", "STORE_TRANSFER", "STORE_RECEIVE", "STORE_RETURN_STOCK"].includes(permission),
  );
  const canSeeStock = isAdmin || permissions.some((permission) =>
    ["STORE_VIEW", "STORE_TRANSFER", "STORE_RETURN_STOCK"].includes(permission),
  );
  const canSeeHistory = isAdmin || permissions.includes("STORE_VIEW");
  const canTransferToKitchen = isAdmin || permissions.includes("STORE_TRANSFER");
  const canReceiveReturns = isAdmin || permissions.includes("STORE_RECEIVE");
  const canReturnToGeneral = isAdmin || permissions.includes("STORE_RETURN_STOCK");
  const destinationOptions = [
    ...(canTransferToKitchen ? [{ value: "CUISINE" as const, label: "Cuisine" }] : []),
    ...(canReturnToGeneral ? [{ value: "STOCK" as const, label: "Stock" }] : []),
  ];
  const selectedDestination = destinationOptions.some((option) => option.value === destination)
    ? destination
    : destinationOptions[0]?.value;
  const canManageTransfer = selectedDestination === "CUISINE" ? canTransferToKitchen : canReturnToGeneral;

  const load = useCallback(async () => {
    if (!token || !canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/store", { headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Impossible de charger le Magasin");
      setData(json.data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [token, canView]);

  useEffect(() => { void load(); }, [load]);

  const productTotals = useMemo(() => {
    const totals = new Map<number, { id: number; name: string; unit: string; quantity: string }>();
    for (const balance of data.balances) {
      const product = balance.batch.product;
      const current = totals.get(product.id);
      totals.set(product.id, {
        id: product.id,
        name: product.name,
        unit: product.unit.abbreviation || product.unit.name,
        quantity: current ? addQuantities(current.quantity, balance.quantity) : balance.quantity,
      });
    }
    return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [data.balances]);

  async function submitTransfer(event: FormEvent) {
    event.preventDefault();
    if (!productId || !isPositiveQuantity(quantity)) return;
    setBusy("transfer");
    setError("");
    setNotice("");
    try {
      if (!selectedDestination) throw new Error("Aucune autorisation de transfert Magasin n’est attribuée.");
      const response = await fetch("/api/store", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: Number(productId), quantity, destination: selectedDestination }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Transfert impossible");
      setNotice(selectedDestination === "CUISINE" ? "Transfert vers la Cuisine enregistré." : "Retour vers le stock général enregistré.");
      setQuantity("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setBusy(null);
    }
  }

  async function receiveReturn(request: StoreReturn) {
    const amount = receiptQuantities[request.id];
    setBusy(request.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/store/returns/${request.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity: amount }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Réception impossible");
      setNotice("Retour contrôlé et réceptionné dans le Magasin.");
      setReceiptQuantities((current) => ({ ...current, [request.id]: "" }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setBusy(null);
    }
  }

  async function rejectReturn(request: StoreReturn) {
    setBusy(request.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/store/returns/${request.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reject_remaining: true }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Refus impossible");
      setNotice("Le reliquat de la demande a été refusé et reste en Cuisine.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) {
    return <SidebarLayout><div className="p-8 text-slate-500">Chargement du Magasin…</div></SidebarLayout>;
  }

  if (!canView) {
    return (
      <SidebarLayout>
        <div className="m-8 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <Warehouse className="mx-auto mb-3 h-9 w-9 text-cyan-700" />
          <h1 className="font-semibold text-slate-900">Accès Magasin réservé</h1>
          <p className="mt-1 text-sm text-slate-500">Votre compte n’a pas la permission STORE_VIEW.</p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <main className="min-h-screen bg-slate-50/80 px-4 py-7 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-br from-cyan-800 to-teal-600 p-6 text-white shadow-lg sm:p-8">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><Warehouse className="h-7 w-7" /></span>
              <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-100">Local Grill · Stock intermédiaire</p><h1 className="mt-1 text-3xl font-bold">Magasin</h1><p className="mt-1 text-sm text-cyan-50">Lots FIFO, transferts et retours Cuisine à réceptionner.</p></div>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/25 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualiser</button>
          </header>

          {(error || notice) && <div role={error ? "alert" : "status"} className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {error ? <X className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" />}{error || notice}
          </div>}

          {(destinationOptions.length > 0 || canSeeStock) && <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(350px,.9fr)]">
            {destinationOptions.length > 0 && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><ArrowLeftRight className="h-5 w-5" /></span><div><h2 className="font-semibold">Transférer le stock Magasin</h2><p className="text-sm text-slate-500">Le prélèvement s’effectue par lots, du plus ancien au plus récent.</p></div></div>
              <form onSubmit={submitTransfer} className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Produit
                  <select required value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3">
                    <option value="">Choisir un produit…</option>
                    {productTotals.map((product) => <option key={product.id} value={product.id}>{product.name} · {qty(product.quantity)} {product.unit}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">Quantité
                  <input required type="number" min="0.000001" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3" />
                </label>
                <label className="text-sm font-medium text-slate-700">Destination
                  <select value={selectedDestination} onChange={(event) => setDestination(event.target.value as "CUISINE" | "STOCK")} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3">
                    {destinationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <button type="submit" disabled={!canManageTransfer || busy === "transfer" || loading || productTotals.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-800 px-4 py-3 font-semibold text-white hover:bg-cyan-900 disabled:opacity-50 sm:col-span-2">
                  {busy === "transfer" && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {selectedDestination === "CUISINE" ? "Transférer vers Cuisine" : "Retourner au Stock"}
                </button>
              </form>
            </div>}

            {canSeeStock && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Package className="h-5 w-5" /></span><div><h2 className="font-semibold">Stock Magasin</h2><p className="text-sm text-slate-500">{data.balances.length} lot(s) disponibles</p></div></div></div>
              <div className="max-h-80 overflow-auto">
                {data.balances.length ? <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Produit / lot</th><th className="px-3 py-2">Entrée</th><th className="px-3 py-2 text-right">Disponible</th></tr></thead><tbody className="divide-y divide-slate-100">{data.balances.map((balance) => <tr key={balance.id}><td className="px-3 py-3"><p className="font-medium">{balance.batch.product.name}</p><p className="text-xs text-slate-500">Lot {balance.batch.batch_number}</p></td><td className="whitespace-nowrap px-3 py-3 text-slate-500">{new Date(balance.batch.entry_date).toLocaleDateString("fr-FR")}</td><td className="whitespace-nowrap px-3 py-3 text-right font-semibold">{qty(balance.quantity)} {balance.batch.product.unit.abbreviation || balance.batch.product.unit.name}</td></tr>)}</tbody></table>
                  : <div className="py-10 text-center text-sm text-slate-500">{loading ? "Chargement…" : "Aucun lot en Magasin."}</div>}
              </div>
            </div>}
          </section>}

          {(isAdmin || permissions.includes("STORE_VIEW") || canReceiveReturns) && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Clock3 className="h-5 w-5" /></span><div><h2 className="font-semibold">Retours Cuisine à contrôler</h2><p className="text-sm text-slate-500">Ils restent hors du stock Magasin jusqu’à validation de la réception.</p></div></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{data.returns.length} demande(s)</span></header>
            {data.returns.length ? <div className="divide-y divide-slate-100">{data.returns.map((request) => {
              const outstanding = subtractQuantities(request.quantity, request.received_quantity);
              const unit = request.product.unit.abbreviation || request.product.unit.name;
              return <article key={request.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0"><h3 className="font-semibold">{request.product.name} <span className="text-sm font-normal text-slate-500">· lot {request.batch.batch_number}</span></h3><p className="mt-1 text-sm text-slate-500">Demande {request.dispatch_line.dispatch.reference} · par {request.requester.fullName} · {new Date(request.requested_at).toLocaleString("fr-FR")}</p><p className="mt-1 text-sm text-amber-800">Demandé : {qty(request.quantity)} {unit} · Déjà réceptionné : {qty(request.received_quantity)} {unit} · Reliquat : {qty(outstanding)} {unit}</p>{request.reason && <p className="mt-1 text-xs text-slate-500">{request.reason}</p>}</div>
                {canReceiveReturns && <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor={`receipt-${request.id}`}>Quantité réceptionnée</label><input id={`receipt-${request.id}`} type="number" min="0.000001" max={outstanding} step="any" placeholder={qty(outstanding)} value={receiptQuantities[request.id] ?? ""} onChange={(event) => setReceiptQuantities((current) => ({ ...current, [request.id]: event.target.value }))} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button type="button" disabled={busy === request.id || !isPositiveQuantity(receiptQuantities[request.id] ?? "")} onClick={() => void receiveReturn(request)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{busy === request.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Réceptionner</button><button type="button" disabled={busy === request.id} onClick={() => void rejectReturn(request)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Refuser reliquat</button></div>}
              </article>;
            })}</div> : <p className="p-8 text-center text-sm text-slate-500">{loading ? "Chargement des demandes…" : "Aucun retour Cuisine en attente."}</p>}
          </section>}

          {canSeeHistory && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-4 sm:px-6"><h2 className="font-semibold">Historique des mouvements Magasin</h2><p className="text-sm text-slate-500">Transferts avec quantité et lot d’origine.</p></header>
            {data.movements.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Produit / lot</th><th className="px-5 py-3">Trajet</th><th className="px-5 py-3 text-right">Quantité</th><th className="px-5 py-3">Référence / agent</th></tr></thead><tbody className="divide-y divide-slate-100">{data.movements.map((movement) => <tr key={movement.id}><td className="whitespace-nowrap px-5 py-3 text-slate-500">{new Date(movement.created_at).toLocaleString("fr-FR")}</td><td className="px-5 py-3"><p className="font-medium">{movement.product.name}</p><p className="text-xs text-slate-500">Lot {movement.batch.batch_number} · entrée {new Date(movement.batch.entry_date).toLocaleDateString("fr-FR")}</p></td><td className="px-5 py-3">{locationLabel(movement.from_location)} → {locationLabel(movement.to_location)}</td><td className="px-5 py-3 text-right font-semibold">{qty(movement.quantity)} {movement.product.unit.abbreviation || movement.product.unit.name}</td><td className="px-5 py-3 text-slate-500">{movement.reference_number || "—"}<p className="text-xs">{movement.actor.fullName}</p></td></tr>)}</tbody></table></div> : <p className="p-8 text-center text-sm text-slate-500">{loading ? "Chargement des mouvements…" : "Aucun mouvement enregistré."}</p>}
          </section>}
        </div>
      </main>
    </SidebarLayout>
  );
}
