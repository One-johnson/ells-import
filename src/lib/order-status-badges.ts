import type { BadgeProps } from "@/components/ui/badge";

const orderStatusVariant: Record<string, BadgeProps["variant"]> = {
  pending: "warning",
  confirmed: "success",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "destructive",
  refunded: "muted",
};

const paymentStatusVariant: Record<string, BadgeProps["variant"]> = {
  pending: "warning",
  sent: "info",
  confirmed: "success",
  failed: "destructive",
  expired: "muted",
  refunded: "muted",
};

export function getOrderStatusBadgeVariant(status: string): BadgeProps["variant"] {
  return orderStatusVariant[status] ?? "secondary";
}

export function getPaymentStatusBadgeVariant(status: string): BadgeProps["variant"] {
  return paymentStatusVariant[status] ?? "secondary";
}
