type DecimalParts = { coefficient: string; scale: number };

function parseParts(value: string | number): DecimalParts {
  const raw = String(value).trim().replace(",", ".");
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(raw);
  if (!match) throw new Error("INVALID_QUANTITY");

  const fraction = match[3] ?? "";
  const digits = `${match[2]}${fraction}`.replace(/^0+(?=\d)/, "");
  const coefficient = match[1] === "-" && digits !== "0" ? `-${digits}` : digits;
  return { coefficient, scale: fraction.length };
}

function addIntegers(left: string, right: string): string {
  let carry = 0;
  let result = "";
  for (let i = left.length - 1, j = right.length - 1; i >= 0 || j >= 0 || carry; i--, j--) {
    const sum = (i >= 0 ? Number(left[i]) : 0) + (j >= 0 ? Number(right[j]) : 0) + carry;
    result = String(sum % 10) + result;
    carry = Math.floor(sum / 10);
  }
  return result.replace(/^0+(?=\d)/, "");
}

function subtractIntegers(left: string, right: string): string {
  let borrow = 0;
  let result = "";
  for (let i = left.length - 1, j = right.length - 1; i >= 0; i--, j--) {
    let digit = Number(left[i]) - borrow - (j >= 0 ? Number(right[j]) : 0);
    borrow = digit < 0 ? 1 : 0;
    if (borrow) digit += 10;
    result = String(digit) + result;
  }
  return result.replace(/^0+(?=\d)/, "");
}

function align(parts: DecimalParts, scale: number): string {
  return parts.coefficient.replace("-", "") + "0".repeat(scale - parts.scale);
}

function toDecimalString(coefficient: string, scale: number): string {
  const digits = coefficient.padStart(scale + 1, "0");
  if (scale === 0) return digits;

  const integer = digits.slice(0, -scale);
  const fraction = digits.slice(-scale).replace(/0+$/, "");
  return `${integer}${fraction ? `.${fraction}` : ""}`;
}

export function addQuantities(left: string, right: string): string {
  const a = parseParts(left);
  const b = parseParts(right);
  const scale = Math.max(a.scale, b.scale);
  const coefficient = addIntegers(align(a, scale), align(b, scale));
  return toDecimalString(coefficient, scale);
}

export function subtractQuantities(left: string, right: string): string {
  const a = parseParts(left);
  const b = parseParts(right);
  const scale = Math.max(a.scale, b.scale);
  const leftAligned = align(a, scale);
  const rightAligned = align(b, scale);
  const coefficient = leftAligned.length > rightAligned.length ||
    (leftAligned.length === rightAligned.length && leftAligned >= rightAligned)
    ? subtractIntegers(leftAligned, rightAligned)
    : "0";
  return toDecimalString(coefficient, scale);
}

export function isPositiveQuantity(value: string): boolean {
  try {
    const coefficient = parseParts(value).coefficient;
    return !coefficient.startsWith("-") && coefficient !== "0";
  } catch {
    return false;
  }
}

export function formatQuantity(value: string): string {
  const parts = parseParts(value);
  const formatted = toDecimalString(parts.coefficient, parts.scale);
  const [integer, fraction] = formatted.split(".");
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return `${groupedInteger}${fraction ? `,${fraction}` : ""}`;
}
