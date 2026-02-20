import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, requireAdmin } from "./lib/auth";
import { orderStatus, orderItem } from "./schema";

const shippingAddressValidator = v.optional(
  v.object({
    line1: v.string(),
    line2: v.optional(v.string()),
    city: v.string(),
    state: v.optional(v.string()),
    postalCode: v.string(),
    country: v.string(),
  })
);

/** Create order from cart items (customer). */
export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    items: v.array(orderItem),
    subtotal: v.number(),
    shipping: v.optional(v.number()),
    tax: v.optional(v.number()),
    total: v.number(),
    shippingAddress: shippingAddressValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken ?? null);
    const now = Date.now();
    return await ctx.db.insert("orders", {
      userId: user._id,
      items: args.items,
      subtotal: args.subtotal,
      shipping: args.shipping,
      tax: args.tax,
      total: args.total,
      status: "pending",
      shippingAddress: args.shippingAddress,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** List orders: own for customer, all for admin. */
export const list = query({
  args: {
    sessionToken: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    status: v.optional(orderStatus),
  },
  handler: async (ctx, { sessionToken, limit = 50, cursor, status }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    let base;
    if (user.role === "admin") {
      base = status
        ? ctx.db.query("orders").withIndex("by_status_created", (q) => q.eq("status", status))
        : ctx.db.query("orders").order("desc");
    } else {
      base = ctx.db.query("orders").withIndex("by_user_created", (q) => q.eq("userId", user._id));
    }
    const result = cursor ? await base.paginate({ numItems: limit, cursor }) : await base.take(limit);
    let items = Array.isArray(result) ? result : result.page;
    if (user.role !== "admin" && status) items = items.filter((o) => o.status === status);
    const nextCursor = Array.isArray(result) ? null : result.continueCursor;
    return { items, nextCursor };
  },
});

/** Get order by id (owner or admin). */
export const get = query({
  args: { sessionToken: v.optional(v.string()), orderId: v.id("orders") },
  handler: async (ctx, { sessionToken, orderId }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const order = await ctx.db.get(orderId);
    if (!order) return null;
    if (order.userId !== user._id && user.role !== "admin") throw new Error("Forbidden");
    return order;
  },
});

/** Update order (admin: status, etc.). */
export const update = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    orderId: v.id("orders"),
    status: v.optional(orderStatus),
    paymentId: v.optional(v.id("payments")),
    shippingAddress: shippingAddressValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken ?? null);
    const { sessionToken: _, orderId, ...patch } = args;
    const clean: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) clean[k] = v;
    await ctx.db.patch(args.orderId, clean as any);
    return args.orderId;
  },
});

/** Delete order (admin only). */
export const remove = mutation({
  args: { sessionToken: v.optional(v.string()), orderId: v.id("orders") },
  handler: async (ctx, { sessionToken, orderId }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    await ctx.db.delete(orderId);
    return orderId;
  },
});

/** Bulk update order status (admin only). */
export const bulkUpdateStatus = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    orderIds: v.array(v.id("orders")),
    status: orderStatus,
  },
  handler: async (ctx, { sessionToken, orderIds, status }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    const now = Date.now();
    for (const id of orderIds) await ctx.db.patch(id, { status, updatedAt: now });
    return orderIds.length;
  },
});
