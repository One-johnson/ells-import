import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireAuthed } from "./lib/sessionAuth";

export const get = query({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, { reviewId }) => {
    return await ctx.db.get(reviewId);
  },
});

export const listByProduct = query({
  args: { productId: v.id("products"), limit: v.optional(v.number()) },
  handler: async (ctx, { productId, limit = 50 }) => {
    return await ctx.db
      .query("reviews")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .order("desc")
      .take(limit);
  },
});

export const listMine = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit = 100 }) => {
    const a = await requireAuthed(ctx, sessionToken);
    return await ctx.db
      .query("reviews")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .order("desc")
      .take(limit);
  },
});

export const list = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit = 200 }) => {
    await requireAdmin(ctx, sessionToken);
    return await ctx.db.query("reviews").order("desc").take(limit);
  },
});

export const adminListWithDetails = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit = 200 }) => {
    await requireAdmin(ctx, sessionToken);
    const reviews: Doc<"reviews">[] = await ctx.db
      .query("reviews")
      .order("desc")
      .take(limit);
    const out: {
      review: Doc<"reviews">;
      productName: string;
      productSlug: string;
      reviewerEmail: string;
      reviewerName: string | undefined;
    }[] = [];
    for (const r of reviews) {
      const product = await ctx.db.get(r.productId);
      const user = await ctx.db.get(r.userId);
      out.push({
        review: r,
        productName: product?.name ?? "—",
        productSlug: product?.slug ?? "—",
        reviewerEmail: user?.email ?? "—",
        reviewerName: user?.name,
      });
    }
    return out;
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    productId: v.id("products"),
    rating: v.number(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    orderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be 1–5");
    }
    const a = await requireAuthed(ctx, args.sessionToken);
    const dup = await ctx.db
      .query("reviews")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", a.userId).eq("productId", args.productId),
      )
      .unique();
    if (dup) {
      throw new Error("You already reviewed this product");
    }
    const now = Date.now();
    const title = args.title?.trim();
    const body = args.body?.trim();
    return await ctx.db.insert("reviews", {
      productId: args.productId,
      userId: a.userId,
      rating: args.rating,
      orderId: args.orderId,
      ...(title ? { title } : {}),
      ...(body ? { body } : {}),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    reviewId: v.id("reviews"),
    rating: v.optional(v.number()),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, reviewId, rating, title, body }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const r = await ctx.db.get(reviewId);
    if (r === null) {
      throw new Error("Not found");
    }
    if (r.userId !== a.userId && a.user.role !== "admin") {
      throw new Error("Forbidden");
    }
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw new Error("Invalid rating");
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (rating !== undefined) {
      patch.rating = rating;
    }
    if (title !== undefined) {
      patch.title = title.length > 0 ? title : undefined;
    }
    if (body !== undefined) {
      patch.body = body.length > 0 ? body : undefined;
    }
    await ctx.db.patch(reviewId, patch);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), reviewId: v.id("reviews") },
  handler: async (ctx, { sessionToken, reviewId }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const r = await ctx.db.get(reviewId);
    if (r === null) {
      return;
    }
    if (r.userId !== a.userId && a.user.role !== "admin") {
      throw new Error("Forbidden");
    }
    await ctx.db.delete(reviewId);
  },
});

export const bulkRemove = mutation({
  args: { sessionToken: v.string(), reviewIds: v.array(v.id("reviews")) },
  handler: async (ctx, { sessionToken, reviewIds }) => {
    await requireAdmin(ctx, sessionToken);
    for (const id of reviewIds) {
      await ctx.db.delete(id);
    }
    return { removed: reviewIds.length };
  },
});
