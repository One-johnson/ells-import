import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

/** Get current user's wishlist. */
export const get = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    return await ctx.db
      .query("wishlists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
  },
});

/** Add product to wishlist. */
export const add = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    productId: v.id("products"),
  },
  handler: async (ctx, { sessionToken, productId }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    let wishlist = await ctx.db
      .query("wishlists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const now = Date.now();
    if (!wishlist) {
      return await ctx.db.insert("wishlists", {
        userId: user._id,
        productIds: [productId],
        updatedAt: now,
      });
    }
    if (wishlist.productIds.includes(productId)) return wishlist._id;
    await ctx.db.patch(wishlist._id, {
      productIds: [...wishlist.productIds, productId],
      updatedAt: now,
    });
    return wishlist._id;
  },
});

/** Remove product from wishlist. */
export const remove = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    productId: v.id("products"),
  },
  handler: async (ctx, { sessionToken, productId }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const wishlist = await ctx.db
      .query("wishlists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!wishlist) return null;
    const productIds = wishlist.productIds.filter((id) => id !== productId);
    await ctx.db.patch(wishlist._id, { productIds, updatedAt: Date.now() });
    return wishlist._id;
  },
});

/** Set full wishlist (replace). */
export const set = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, { sessionToken, productIds }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const existing = await ctx.db
      .query("wishlists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { productIds, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("wishlists", { userId: user._id, productIds, updatedAt: now });
  },
});
