import { Decimal } from "@prisma/client/runtime/library";

export function parseStoreQuantity(value: unknown): Decimal | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;

  const normalized = String(value).trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const [integer, fraction = ""] = normalized.split(".");
  if (integer.replace(/^0+/, "").length > 35 || fraction.length > 30) return null;

  const quantity = new Decimal(normalized);
  if (!quantity.isFinite() || !quantity.gt(0) || quantity.decimalPlaces() > 30) return null;
  return quantity;
}
