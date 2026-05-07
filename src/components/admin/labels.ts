import type { Doc } from "@convex/_generated/dataModel";

const NOTIFICATION_TYPE: Record<Doc<"notifications">["type"], string> = {
  order: "Order",
  promo: "Promo",
  system: "System",
  message: "Message",
  other: "Other",
};

const CONV_TYPE: Record<Doc<"conversations">["type"], string> = {
  support: "Support",
  direct: "Direct",
};

const CONV_STATUS: Record<Doc<"conversations">["status"], string> = {
  open: "Open",
  closed: "Closed",
};

export function notificationTypeLabel(t: Doc<"notifications">["type"]) {
  return NOTIFICATION_TYPE[t] ?? t;
}

export function conversationTypeLabel(t: Doc<"conversations">["type"]) {
  return CONV_TYPE[t] ?? t;
}

export function conversationStatusLabel(s: Doc<"conversations">["status"]) {
  return CONV_STATUS[s] ?? s;
}

const PRODUCT_STATUS: Record<Doc<"products">["status"], string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

const ORDER_STATUS: Record<Doc<"orders">["status"], string> = {
  pending: "Pending",
  processing: "Processing",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function productStatusLabel(s: Doc<"products">["status"]) {
  return PRODUCT_STATUS[s] ?? s;
}

export function orderStatusLabel(s: Doc<"orders">["status"]) {
  return ORDER_STATUS[s] ?? s;
}

const PAYMENT_STATUS: Record<Doc<"payments">["status"], string> = {
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
  refunded: "Refunded",
};

const PAYMENT_METHOD: Record<Doc<"payments">["method"], string> = {
  checkout: "Checkout",
  manual: "Manual",
  whatsapp: "WhatsApp",
  paystack: "Paystack",
  other: "Other",
};

export function paymentStatusLabel(s: Doc<"payments">["status"]) {
  return PAYMENT_STATUS[s] ?? s;
}

export function paymentMethodLabel(m: Doc<"payments">["method"]) {
  return PAYMENT_METHOD[m] ?? m;
}
