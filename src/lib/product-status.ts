/** Store-facing product status labels and badge variants (shared with admin styling). */
export const PRODUCT_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "success" | "info" | "warning" | "accent" | "muted" }
> = {
  available: { label: "Available", variant: "success" },
  new: { label: "New", variant: "info" },
  low_stock: { label: "Low Stock", variant: "warning" },
  pre_order: { label: "Pre-Order", variant: "accent" },
  sold_out: { label: "Sold Out", variant: "muted" },
  archived: { label: "Archived", variant: "muted" },
  // Legacy
  draft: { label: "Draft", variant: "muted" },
  active: { label: "Active", variant: "success" },
  out_of_stock: { label: "Out of Stock", variant: "muted" },
};

export function getStatusConfig(status: string) {
  return PRODUCT_STATUS_CONFIG[status] ?? { label: status.replace(/_/g, " "), variant: "muted" as const };
}
