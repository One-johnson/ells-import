import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function recalcOrderTotals(
  ctx: MutationCtx,
  orderId: Id<"orders">,
) {
  const order = await ctx.db.get(orderId);
  if (order === null) {
    return;
  }
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect();
  let subtotalCents = 0;
  for (const i of items) {
    subtotalCents += i.unitPriceCents * i.quantity;
  }
  const totalCents = subtotalCents + order.taxCents + order.shippingCents;
  await ctx.db.patch(orderId, {
    subtotalCents,
    totalCents,
    updatedAt: Date.now(),
  });
}
