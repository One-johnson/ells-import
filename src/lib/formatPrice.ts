import { DEFAULT_STORE_CURRENCY } from "@/lib/currency";

export function formatPrice(priceCents: number, currency: string): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: currency || DEFAULT_STORE_CURRENCY,
  }).format(priceCents / 100);
}
