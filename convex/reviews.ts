import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, requireAdmin } from "./lib/auth";
import { reviewStatus } from "./schema";

/** Create review (customer). */
export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    productId: v.id("products"),
    orderId: v.optional(v.id("orders")),
    rating: v.number(),
    title: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken ?? null);
    if (args.rating < 1 || args.rating > 5) throw new Error("Rating must be 1-5");
    const now = Date.now();
    return await ctx.db.insert("reviews", {
      userId: user._id,
      productId: args.productId,
      orderId: args.orderId,
      rating: args.rating,
      title: args.title,
      body: args.body,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** List reviews by product (approved only for public). */
export const listByProduct = query({
  args: {
    productId: v.id("products"),
    status: v.optional(reviewStatus),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { productId, status = "approved", limit = 50, cursor }) => {
    const base = ctx.db
      .query("reviews")
      .withIndex("by_product_status_created", (q) =>
        q.eq("productId", productId).eq("status", status)
      );
    const result = cursor ? await base.paginate({ numItems: limit, cursor }) : await base.take(limit);
    const items = Array.isArray(result) ? result : result.page;
    const nextCursor = Array.isArray(result) ? null : result.continueCursor;
    return { items, nextCursor };
  },
});

/** List reviews by current user. */
export const listByUser = query({
  args: {
    sessionToken: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, limit = 50, cursor }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const base = ctx.db.query("reviews").withIndex("by_user", (q) => q.eq("userId", user._id));
    const result = cursor ? await base.paginate({ numItems: limit, cursor }) : await base.take(limit);
    const items = Array.isArray(result) ? result : result.page;
    const nextCursor = Array.isArray(result) ? null : result.continueCursor;
    return { items, nextCursor };
  },
});

/** Get review by id. */
export const get = query({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, { reviewId }) => ctx.db.get(reviewId),
});

/** Update review (author: body/rating; admin: status). */
export const update = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    reviewId: v.id("reviews"),
    rating: v.optional(v.number()),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    status: v.optional(reviewStatus),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken ?? null);
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error("Review not found");
    const isAdmin = user.role === "admin";
    if (review.userId !== user._id && !isAdmin) throw new Error("Forbidden");
    if (args.status !== undefined && !isAdmin) throw new Error("Forbidden");
    if (args.rating !== undefined && (args.rating < 1 || args.rating > 5)) throw new Error("Rating must be 1-5");
    const { sessionToken: _, reviewId, ...patch } = args;
    const clean: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) clean[k] = v;
    await ctx.db.patch(args.reviewId, clean as any);
    return args.reviewId;
  },
});

/** Delete review (author or admin). */
export const remove = mutation({
  args: { sessionToken: v.optional(v.string()), reviewId: v.id("reviews") },
  handler: async (ctx, { sessionToken, reviewId }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const review = await ctx.db.get(reviewId);
    if (!review) throw new Error("Review not found");
    if (review.userId !== user._id && user.role !== "admin") throw new Error("Forbidden");
    await ctx.db.delete(reviewId);
    return reviewId;
  },
});

/** Bulk update review status (admin only). */
export const bulkUpdateStatus = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    reviewIds: v.array(v.id("reviews")),
    status: reviewStatus,
  },
  handler: async (ctx, { sessionToken, reviewIds, status }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    const now = Date.now();
    for (const id of reviewIds) await ctx.db.patch(id, { status, updatedAt: now });
    return reviewIds.length;
  },
});
