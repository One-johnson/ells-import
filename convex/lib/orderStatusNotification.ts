import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const STATUS_LABEL: Record<Doc<"orders">["status"], string> = {
  pending: "Pending",
  processing: "Processing",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** Notifies the customer when an admin changes their order status. */
export async function notifyUserOrderStatusChanged(
  ctx: MutationCtx,
  previousOrder: Doc<"orders">,
  newStatus: Doc<"orders">["status"],
) {
  if (previousOrder.status === newStatus) {
    return;
  }
  const now = Date.now();
  const statusLabel = STATUS_LABEL[newStatus] ?? newStatus;
  const ref = previousOrder.publicCode ? `#${previousOrder.publicCode}` : "";
  await ctx.db.insert("notifications", {
    userId: previousOrder.userId,
    type: "order",
    title: "Order status updated",
    body: ref ? `Order ${ref} is now ${statusLabel}.` : `Your order is now ${statusLabel}.`,
    dataJson: JSON.stringify({ orderId: previousOrder._id }),
    read: false,
    createdAt: now,
  });
}
