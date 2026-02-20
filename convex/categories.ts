import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/** Create category (admin only). */
export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken ?? null);
    const { sessionToken: _, ...data } = args;
    const now = Date.now();
    return await ctx.db.insert("categories", {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** List categories (public). Ordered by createdAt desc; use sortOrder on the client if needed. */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { limit = 100, cursor }) => {
    const base = ctx.db
      .query("categories")
      .withIndex("by_created")
      .order("desc");
    const result = cursor
      ? await base.paginate({ numItems: limit, cursor })
      : await base.take(limit);
    const items = Array.isArray(result) ? result : result.page;
    const nextCursor = Array.isArray(result) ? null : result.continueCursor;
    return { items, nextCursor };
  },
});

/** Get category by id. */
export const get = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, { categoryId }) => ctx.db.get(categoryId),
});

/** Get category by slug. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) =>
    ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique(),
});

/** Update category (admin only). */
export const update = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken ?? null);
    const { sessionToken: _, categoryId, ...patch } = args;
    const clean: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, val] of Object.entries(patch)) if (val !== undefined) clean[k] = val;
    await ctx.db.patch(categoryId, clean as any);
    return categoryId;
  },
});

/** Delete category (admin only). */
export const remove = mutation({
  args: { sessionToken: v.optional(v.string()), categoryId: v.id("categories") },
  handler: async (ctx, { sessionToken, categoryId }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    await ctx.db.delete(categoryId);
    return categoryId;
  },
});
