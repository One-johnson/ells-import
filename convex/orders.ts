import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, requireAdmin } from "./lib/auth";
import { orderStatus, orderItem, orderType } from "./schema";

const shippingAddressValidator = v.optional(
  v.object({
    line1: v.string(),
    line2: v.optional(v.string()),
    city: v.string(),
    state: v.optional(v.string()),
    postalCode: v.string(),
    country: v.string(),
    phone: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    email: v.optional(v.string()),
  })
);

function generateOrderNumber(): string {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

/** Create order from cart items (customer). */
export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    items: v.array(orderItem),
    subtotal: v.number(),
    shipping: v.optional(v.number()),
    tax: v.optional(v.number()),
    total: v.number(),
    orderType: v.optional(orderType),
    shippingAddress: shippingAddressValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken ?? null);
    const now = Date.now();
    let orderNumber = generateOrderNumber();
    for (let i = 0; i < 20; i++) {
      const existing = await ctx.db
        .query("orders")
        .withIndex("by_orderNumber", (q) => q.eq("orderNumber", orderNumber))
        .first();
      if (!existing) break;
      orderNumber = generateOrderNumber();
    }
    return await ctx.db.insert("orders", {
      userId: user._id,
      orderNumber,
      orderType: args.orderType,
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

    if (user.role === "admin" && items.length > 0) {
      const enriched: (typeof items[0] & { customer: { name: string; image?: string } | null })[] = [];
      for (const o of items) {
        const customerDoc = await ctx.db.get(o.userId);
        const customer = customerDoc
          ? { name: customerDoc.name, image: customerDoc.image }
          : null;
        enriched.push({ ...o, customer });
      }
      return { items: enriched, nextCursor };
    }

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

/** Update order (admin: status, orderType, etc.). */
export const update = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    orderId: v.id("orders"),
    status: v.optional(orderStatus),
    orderType: v.optional(orderType),
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

/** Delete order (admin only). Also deletes linked payment(s). */
export const remove = mutation({
  args: { sessionToken: v.optional(v.string()), orderId: v.id("orders") },
  handler: async (ctx, { sessionToken, orderId }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    for (const p of payments) await ctx.db.delete(p._id);
    await ctx.db.delete(orderId);
    return orderId;
  },
});

/** Bulk delete orders (admin only). */
export const bulkRemove = mutation({
  args: { sessionToken: v.optional(v.string()), orderIds: v.array(v.id("orders")) },
  handler: async (ctx, { sessionToken, orderIds }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    for (const orderId of orderIds) {
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_order", (q) => q.eq("orderId", orderId))
        .collect();
      for (const p of payments) await ctx.db.delete(p._id);
      await ctx.db.delete(orderId);
    }
    return orderIds.length;
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
