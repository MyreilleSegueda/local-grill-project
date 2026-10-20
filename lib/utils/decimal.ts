import { Prisma } from '@prisma/client';

export function toNumber(decimal: Prisma.Decimal | number): number {
  if (typeof decimal === 'number') return decimal;
  return Number(decimal.toString());
}
