const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function under1000(n: number): string {
  if (n < 20) return ones[n];
  if (n < 100) {
    const rest = n % 10 ? `-${ones[n % 10]}` : "";
    return `${tens[Math.floor(n / 10)]}${rest}`.replace(/-$/, "");
  }
  const rest = n % 100 ? ` and ${under1000(n % 100)}` : "";
  return `${ones[Math.floor(n / 100)]} Hundred${rest}`;
}

/** Western numbering — USD and other currencies. */
export function integerToWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const billion = Math.floor(n / 1e9);
  const million = Math.floor((n % 1e9) / 1e6);
  const thousand = Math.floor((n % 1e6) / 1000);
  const rest = n % 1000;
  if (billion) parts.push(`${under1000(billion)} Billion`);
  if (million) parts.push(`${under1000(million)} Million`);
  if (thousand) parts.push(`${under1000(thousand)} Thousand`);
  if (rest) parts.push(under1000(rest));
  return parts.join(" ");
}

/** Pakistani / Indian style — Crore, Lac, Thousand. */
export function integerToWordsPKR(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  let remainder = n % 10_000_000;
  const lac = Math.floor(remainder / 100_000);
  remainder %= 100_000;
  const thousand = Math.floor(remainder / 1000);
  const rest = remainder % 1000;

  if (crore) parts.push(`${integerToWords(crore)} Crore`);
  if (lac) parts.push(`${integerToWords(lac)} Lac`);
  if (thousand) parts.push(`${integerToWords(thousand)} Thousand`);
  if (rest) parts.push(under1000(rest));

  return parts.join(" ");
}

function amountInWordsPKR(amount: number): string {
  const num = Math.round((Number(amount) || 0) * 100) / 100;
  const whole = Math.floor(num);
  const paisa = Math.round((num - whole) * 100);

  let words = integerToWordsPKR(whole);
  if (paisa > 0) {
    words += ` and ${integerToWords(paisa)} Paisa`;
  }
  return `${words} Rupees`;
}

/** Matches backend `amountInWords` for PO / PFI documents. */
export function amountInWords(
  amount: number,
  currency = "USD",
  options: { localPurchase?: boolean } = {}
): string {
  const normalized = String(currency || "USD").toUpperCase();
  const usePakistaniNumbering = Boolean(options.localPurchase) && normalized === "PKR";
  if (usePakistaniNumbering) return amountInWordsPKR(amount);

  const num = Math.round((Number(amount) || 0) * 100) / 100;
  const whole = Math.floor(num);
  const cents = Math.round((num - whole) * 100);
  let words = integerToWords(whole);
  if (cents > 0) words += ` and ${String(cents).padStart(2, "0")}/100`;
  const currencyLabel = normalized === "USD" ? "US Dollars" : normalized;
  return `${words} ${currencyLabel}`.trim();
}

/** Comma-separated amount — matches backend `formatPoAmount`. */
export function formatProcurementAmount(
  value: number,
  { min = 2, max = 2 }: { min?: number; max?: number } = {}
): string {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}
