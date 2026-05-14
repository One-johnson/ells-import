import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { recalcOrderTotals } from "./lib/orderTotals";
import { requireAdmin, resolveSession } from "./lib/sessionAuth";

export const listByOrder = query({
  args: {
    orderId: v.id("orders"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, sessionToken }) => {
    const a = await resolveSession(ctx, sessionToken);
    const order = await ctx.db.get(orderId);
    if (!order) {
      return [];
    }
    if (a === null) {
      return [];
    }
    if (a.userId !== order.userId && a.user.role !== "admin") {
      throw new Error("Forbidden");
    }
    return await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
  },
});

export const get = query({
  args: { lineId: v.id("orderItems") },
  handler: async (ctx, { lineId }) => {
    return await ctx.db.get(lineId);
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    orderId: v.id("orders"),
    productId: v.id("products"),
    productName: v.string(),
    unitPriceCents: v.number(),
    unitCostCents: v.optional(v.number()),
    quantity: v.number(),
    imageUrl: v.optional(v.string()),
    lineCbm: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, ...row }) => {
    await requireAdmin(ctx, sessionToken);
    const id = await ctx.db.insert("orderItems", row);
    await recalcOrderTotals(ctx, row.orderId);
    return id;
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    lineId: v.id("orderItems"),
    productName: v.optional(v.string()),
    unitPriceCents: v.optional(v.number()),
    unitCostCents: v.optional(v.number()),
    quantity: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, lineId, ...rest }) => {
    await requireAdmin(ctx, sessionToken);
    const line = await ctx.db.get(lineId);
    if (line === null) {
      throw new Error("Line not found");
    }
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(rest)) {
      if (val !== undefined) {
        patch[k] = val;
      }
    }
    if (Object.keys(patch).length) {
      await ctx.db.patch(lineId, patch);
    }
    await recalcOrderTotals(ctx, line.orderId);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), lineId: v.id("orderItems") },
  handler: async (ctx, { sessionToken, lineId }) => {
    await requireAdmin(ctx, sessionToken);
    const line = await ctx.db.get(lineId);
    if (line === null) {
      return;
    }
    const orderId = line.orderId;
    await ctx.db.delete(lineId);
    await recalcOrderTotals(ctx, orderId);
  },
});

export const bulkCreate = mutation({
  args: {
    sessionToken: v.string(),
    orderId: v.id("orders"),
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        unitPriceCents: v.number(),
        unitCostCents: v.optional(v.number()),
        quantity: v.number(),
        imageUrl: v.optional(v.string()),
        lineCbm: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, { sessionToken, orderId, items }) => {
    await requireAdmin(ctx, sessionToken);
    for (const it of items) {
      await ctx.db.insert("orderItems", { orderId, ...it });
    }
    await recalcOrderTotals(ctx, orderId);
    return { inserted: items.length };
  },
});

export const bulkRemove = mutation({
  args: { sessionToken: v.string(), lineIds: v.array(v.id("orderItems")) },
  handler: async (ctx, { sessionToken, lineIds }) => {
    await requireAdmin(ctx, sessionToken);
    const orderIds = new Set<import("./_generated/dataModel").Id<"orders">>();
    for (const lineId of lineIds) {
      const line = await ctx.db.get(lineId);
      if (line) {
        orderIds.add(line.orderId);
        await ctx.db.delete(lineId);
      }
    }
    for (const orderId of orderIds) {
      await recalcOrderTotals(ctx, orderId);
    }
    return { removed: lineIds.length };
  },
});
