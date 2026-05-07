import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireAuthed, resolveSession } from "./lib/sessionAuth";

export const get = query({
  args: { wishlistId: v.id("wishlistItems") },
  handler: async (ctx, { wishlistId }) => {
    return await ctx.db.get(wishlistId);
  },
});

export const listMine = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    const a = await resolveSession(ctx, sessionToken);
    if (a === null) {
      return [];
    }
    const rows = await ctx.db
      .query("wishlistItems")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .collect();
    return await Promise.all(
      rows.map(async (w) => {
        const product = await ctx.db.get(w.productId);
        const thumbnailUrl =
          product?.imageIds?.[0] != null
            ? ((await ctx.storage.getUrl(product.imageIds[0])) ?? null)
            : null;
        return {
          ...w,
          product,
          thumbnailUrl,
        };
      }),
    );
  },
});

export const list = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit = 500 }) => {
    await requireAdmin(ctx, sessionToken);
    return await ctx.db.query("wishlistItems").take(limit);
  },
});

export const add = mutation({
  args: { sessionToken: v.string(), productId: v.id("products") },
  handler: async (ctx, { sessionToken, productId }) => {
    const { userId } = await requireAuthed(ctx, sessionToken);
    const existing = await ctx.db
      .query("wishlistItems")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", userId).eq("productId", productId),
      )
      .unique();
    if (existing) {
      return existing._id;
    }
    return await ctx.db.insert("wishlistItems", {
      userId,
      productId,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), productId: v.id("products") },
  handler: async (ctx, { sessionToken, productId }) => {
    const { userId } = await requireAuthed(ctx, sessionToken);
    const existing = await ctx.db
      .query("wishlistItems")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", userId).eq("productId", productId),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const removeById = mutation({
  args: { sessionToken: v.string(), wishlistId: v.id("wishlistItems") },
  handler: async (ctx, { sessionToken, wishlistId }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const row = await ctx.db.get(wishlistId);
    if (row === null) {
      return;
    }
    if (row.userId !== a.userId && a.user.role !== "admin") {
      throw new Error("Forbidden");
    }
    await ctx.db.delete(wishlistId);
  },
});

export const bulkAdd = mutation({
  args: {
    sessionToken: v.string(),
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, { sessionToken, productIds }) => {
    const { userId } = await requireAuthed(ctx, sessionToken);
    const now = Date.now();
    for (const productId of productIds) {
      const existing = await ctx.db
        .query("wishlistItems")
        .withIndex("by_user_product", (q) =>
          q.eq("userId", userId).eq("productId", productId),
        )
        .unique();
      if (!existing) {
        await ctx.db.insert("wishlistItems", { userId, productId, createdAt: now });
      }
    }
    return { ok: true as const };
  },
});

export const bulkRemove = mutation({
  args: {
    sessionToken: v.string(),
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, { sessionToken, productIds }) => {
    const { userId } = await requireAuthed(ctx, sessionToken);
    for (const productId of productIds) {
      const existing = await ctx.db
        .query("wishlistItems")
        .withIndex("by_user_product", (q) =>
          q.eq("userId", userId).eq("productId", productId),
        )
        .unique();
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }
    return { removed: productIds.length };
  },
});
