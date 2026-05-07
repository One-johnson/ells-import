import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireAdmin } from "./lib/sessionAuth";
import { paymentMethod, paymentStatus } from "./schema";

export const list = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
    status: v.optional(paymentStatus),
  },
  handler: async (ctx, { sessionToken, limit = 500, status }) => {
    await requireAdmin(ctx, sessionToken);
    const rows =
      status !== undefined
        ? (await ctx.db
            .query("payments")
            .withIndex("by_status", (q) => q.eq("status", status))
            .collect())
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit)
        : await ctx.db.query("payments").order("desc").take(limit);
    const sliced = rows;

    const out: {
      payment: Doc<"payments">;
      orderPublicCode: string | undefined;
      customerEmail: string;
    }[] = [];

    for (const payment of sliced) {
      const order = await ctx.db.get(payment.orderId);
      const user = await ctx.db.get(payment.userId);
      out.push({
        payment,
        orderPublicCode: order?.publicCode,
        customerEmail: user?.email ?? "—",
      });
    }
    return out;
  },
});
