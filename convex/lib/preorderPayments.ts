import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export function paymentKindOf(p: Doc<"payments">): "full" | "items" | "shipping" {
  return p.kind ?? "full";
}

export async function hasCompletedShippingPayment(
  ctx: MutationCtx,
  orderId: Id<"orders">,
): Promise<boolean> {
  for (const p of await ctx.db
    .query("payments")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect()) {
    if (paymentKindOf(p) === "shipping" && p.status === "completed") {
      return true;
    }
  }
  return false;
}

export async function hasPendingShippingPayment(
  ctx: MutationCtx,
  orderId: Id<"orders">,
): Promise<boolean> {
  for (const p of await ctx.db
    .query("payments")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect()) {
    if (paymentKindOf(p) === "shipping" && p.status === "pending") {
      return true;
    }
  }
  return false;
}

/** Marks pending item/full payments completed when order reaches paid-ish status. Never completes shipping here. */
export async function completeItemPaymentsForOrder(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  status: Doc<"orders">["status"],
) {
  const shouldComplete =
    status === "paid" || status === "processing" || status === "shipped" || status === "delivered";
  if (!shouldComplete) {
    return;
  }
  for (const p of await ctx.db
    .query("payments")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect()) {
    if (p.status !== "pending") {
      continue;
    }
    const k = paymentKindOf(p);
    if (k === "shipping") {
      continue;
    }
    await ctx.db.patch(p._id, { status: "completed" });
  }
}
