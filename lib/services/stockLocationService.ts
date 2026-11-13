import { Prisma, StockLocation } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

type Transaction = Prisma.TransactionClient;
type TransferLocation = Exclude<StockLocation, "GENERAL">;

export async function changeLocationBalance(
  tx: Transaction,
  batchId: number,
  location: TransferLocation,
  quantity: Decimal,
) {
  if (quantity.isZero()) return;

  if (quantity.gt(0)) {
    await tx.stock_location_balances.upsert({
      where: { batch_id_location: { batch_id: batchId, location } },
      create: { batch_id: batchId, location, quantity },
      update: { quantity: { increment: quantity }, updated_at: new Date() },
    });
    return;
  }

  const decrement = quantity.abs();
  const updated = await tx.stock_location_balances.updateMany({
    where: {
      batch_id: batchId,
      location,
      quantity: { gte: decrement },
    },
    data: { quantity: { decrement }, updated_at: new Date() },
  });
  if (updated.count !== 1) throw new Error("INSUFFICIENT_LOCATION_STOCK");
}

export async function recordLocationMovement(
  tx: Transaction,
  data: {
    product_id: number;
    batch_id: number;
    from_location: StockLocation;
    to_location: StockLocation;
    quantity: Decimal;
    user_id: number;
    reason?: string | null;
    reference_number?: string | null;
    return_request_id?: number;
  },
) {
  if (data.from_location === data.to_location || !data.quantity.gt(0)) {
    throw new Error("INVALID_LOCATION_MOVEMENT");
  }
  return tx.stock_location_movements.create({ data });
}
