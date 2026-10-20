import { Decimal } from "@prisma/client/runtime/library";

export function isKitchenEventType(value: unknown): value is "SERVED" | "RETURNED" {
  return value === "SERVED" || value === "RETURNED";
}

export function kitchenRemaining(sent: Decimal.Value, served: Decimal.Value, returned: Decimal.Value) {
  return new Decimal(sent).minus(served).minus(returned);
}

export function kitchenOperationFits(
  sent: Decimal.Value,
  served: Decimal.Value,
  returned: Decimal.Value,
  requested: Decimal.Value,
) {
  const amount = new Decimal(requested);
  return amount.gt(0) && amount.lte(kitchenRemaining(sent, served, returned));
}

export function kitchenStatus(sent: Decimal.Value, served: Decimal.Value) {
  const sentAmount = new Decimal(sent);
  const servedAmount = new Decimal(served);
  if (servedAmount.gte(sentAmount)) return "ENTIREMENT_SERVI" as const;
  if (servedAmount.gt(0)) return "PARTIELLEMENT_SERVI" as const;
  return "EN_ATTENTE" as const;
}
