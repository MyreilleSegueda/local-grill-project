export function formatNumberWithCurrency(num: number, currency = "XOF") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency,
  }).format(num);
}

export function extractFirstLetter(word: string): string {
  return word.charAt(0).toUpperCase();
}

export function formatInitials(fullName: string, maxInitials = 2): string {
  if (!fullName?.trim()) {
    return "";
  }

  const words = fullName.trim().split(/\s+/);
  const initialsToTake = Math.min(words.length, maxInitials);

  return words.slice(0, initialsToTake).map(extractFirstLetter).join("");
}
