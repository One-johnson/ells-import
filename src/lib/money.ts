import { DEFAULT_STORE_CURRENCY } from "@/lib/currency";

export function formatCents(cents: number, currency: string) {
  const code = currency || DEFAULT_STORE_CURRENCY;
  try {
    return new Intl.NumberFormat("en-GH", { style: "currency", currency: code }).format(
      cents / 100,
    );
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`;
  }
}

export function parseMoneyToCents(input: string): number | null {
  const t = input.trim();
  if (t === "") {
    return null;
  }
  const n = Number.parseFloat(t.replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) {
    return null;
  }
  return Math.round(n * 100);
}
