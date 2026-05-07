import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { allocatePublicCode } from "./publicCode";

export async function insertPayment(
  ctx: MutationCtx,
  args: {
    orderId: Id<"orders">;
    userId: Id<"users">;
    amountCents: number;
    currency: string;
    status: "pending" | "completed" | "failed" | "refunded";
    method: "checkout" | "manual" | "whatsapp" | "paystack" | "other";
    note?: string;
  },
) {
  const publicCode = await allocatePublicCode(ctx, "payments");
  const now = Date.now();
  return await ctx.db.insert("payments", {
    publicCode,
    orderId: args.orderId,
    userId: args.userId,
    amountCents: args.amountCents,
    currency: args.currency,
    status: args.status,
    method: args.method,
    note: args.note,
    createdAt: now,
  });
}

export async function deletePaymentsForOrder(
  ctx: MutationCtx,
  orderId: Id<"orders">,
) {
  for (const p of await ctx.db
    .query("payments")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect()) {
    await ctx.db.delete(p._id);
  }
}
