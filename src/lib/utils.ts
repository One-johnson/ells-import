import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format amount in Ghana Cedis (GHS). Pass value in cedis (or pesewas / 100 if stored in pesewas). */
export function formatCurrency(amountInCedis: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(amountInCedis)
}
