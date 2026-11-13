import { Decimal } from "@prisma/client/runtime/library";

export interface FifoCandidate {
  id: number;
  entry_date: Date;
  quantity: Decimal.Value;
}

export interface FifoAllocation<T extends FifoCandidate> {
  batch: T;
  quantity: Decimal;
}

export function allocateFifo<T extends FifoCandidate>(
  candidates: readonly T[],
  requested: Decimal.Value,
): FifoAllocation<T>[] {
  const remaining = new Decimal(requested);
  if (!remaining.isFinite() || !remaining.gt(0)) throw new Error("INVALID_QUANTITY");

  const ordered = [...candidates].sort((a, b) =>
    a.entry_date.getTime() - b.entry_date.getTime() || a.id - b.id,
  );
  const total = ordered.reduce(
    (sum, candidate) => sum.plus(candidate.quantity),
    new Decimal(0),
  );
  if (total.lt(remaining)) throw new Error("INSUFFICIENT_STOCK");

  let outstanding = remaining;
  const allocations: FifoAllocation<T>[] = [];
  for (const batch of ordered) {
    if (!outstanding.gt(0)) break;
    const available = new Decimal(batch.quantity);
    if (!available.gt(0)) continue;
    const quantity = Decimal.min(available, outstanding);
    allocations.push({ batch, quantity });
    outstanding = outstanding.minus(quantity);
  }
  if (!outstanding.isZero()) throw new Error("INSUFFICIENT_STOCK");
  return allocations;
}
