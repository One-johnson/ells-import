import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, requireAdmin } from "./lib/auth";
import { paymentStatus } from "./schema";

/** Create payment (admin or order owner). */
export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    orderId: v.id("orders"),
    amount: v.number(),
    currency: v.string(),
    status: paymentStatus,
    whatsappThreadId: v.optional(v.string()),
    whatsappMessageId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken ?? null);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.userId !== user._id && user.role !== "admin") throw new Error("Forbidden");
    const now = Date.now();
    const id = await ctx.db.insert("payments", {
      orderId: args.orderId,
      amount: args.amount,
      currency: args.currency,
      status: args.status,
      whatsappThreadId: args.whatsappThreadId,
      whatsappMessageId: args.whatsappMessageId,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(args.orderId, { paymentId: id, updatedAt: now });
    return id;
  },
});

/** List payments: by order (owner/admin) or all (admin). */
export const list = query({
  args: {
    sessionToken: v.optional(v.string()),
    orderId: v.optional(v.id("orders")),
    status: v.optional(paymentStatus),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, orderId, status, limit = 50, cursor }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    if (orderId) {
      const order = await ctx.db.get(orderId);
      if (!order || (order.userId !== user._id && user.role !== "admin")) throw new Error("Forbidden");
      const list = await ctx.db
        .query("payments")
        .withIndex("by_order", (q) => q.eq("orderId", orderId))
        .collect();
      return { items: list, nextCursor: null };
    }
    if (user.role !== "admin") throw new Error("Forbidden");
    const base = status
      ? ctx.db.query("payments").withIndex("by_status_created", (q) => q.eq("status", status))
      : ctx.db.query("payments").order("desc");
    const result = cursor ? await base.paginate({ numItems: limit, cursor }) : await base.take(limit);
    const items = Array.isArray(result) ? result : result.page;
    const nextCursor = Array.isArray(result) ? null : result.continueCursor;
    return { items, nextCursor };
  },
});

/** Get payment by id. */
export const get = query({
  args: { sessionToken: v.optional(v.string()), paymentId: v.id("payments") },
  handler: async (ctx, { sessionToken, paymentId }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const payment = await ctx.db.get(paymentId);
    if (!payment) return null;
    const order = await ctx.db.get(payment.orderId);
    if (!order || (order.userId !== user._id && user.role !== "admin")) throw new Error("Forbidden");
    return payment;
  },
});

/** Update payment (admin or order owner). */
export const update = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    paymentId: v.id("payments"),
    status: v.optional(paymentStatus),
    whatsappThreadId: v.optional(v.string()),
    whatsappMessageId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken ?? null);
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");
    const order = await ctx.db.get(payment.orderId);
    if (!order || (order.userId !== user._id && user.role !== "admin")) throw new Error("Forbidden");
    const { sessionToken: _, paymentId, ...patch } = args;
    const clean: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) clean[k] = v;
    await ctx.db.patch(args.paymentId, clean as any);
    return args.paymentId;
  },
});

/** Delete payment (admin only). */
export const remove = mutation({
  args: { sessionToken: v.optional(v.string()), paymentId: v.id("payments") },
  handler: async (ctx, { sessionToken, paymentId }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    await ctx.db.delete(paymentId);
    return paymentId;
  },
});

/** Bulk delete payments (admin only). */
export const bulkRemove = mutation({
  args: { sessionToken: v.optional(v.string()), paymentIds: v.array(v.id("payments")) },
  handler: async (ctx, { sessionToken, paymentIds }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    for (const id of paymentIds) await ctx.db.delete(id);
    return paymentIds.length;
  },
});

/** Bulk update payment status (admin only). */
export const bulkUpdateStatus = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    paymentIds: v.array(v.id("payments")),
    status: paymentStatus,
  },
  handler: async (ctx, { sessionToken, paymentIds, status }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    const now = Date.now();
    for (const id of paymentIds) await ctx.db.patch(id, { status, updatedAt: now });
    return paymentIds.length;
  },
});
