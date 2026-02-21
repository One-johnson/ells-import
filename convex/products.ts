import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { productStatus } from "./schema";

function generateSixDigitId(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const STORE_VISIBLE_STATUSES = [
  "available",
  "new",
  "low_stock",
  "pre_order",
  "sold_out",
  "active",
] as const;

/** Create product (admin only). Notifies all customers with a "New product" notification. */
export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    price: v.number(),
    compareAtPrice: v.optional(v.number()),
    images: v.array(v.string()),
    status: productStatus,
    stock: v.number(),
    sku: v.optional(v.string()),
    categoryIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken ?? null);
    const { sessionToken: _, ...data } = args;
    const now = Date.now();
    let productId = generateSixDigitId();
    for (let i = 0; i < 20; i++) {
      const existing = await ctx.db.query("products").withIndex("by_productId", (q) => q.eq("productId", productId)).first();
      if (!existing) break;
      productId = generateSixDigitId();
    }
    const id = await ctx.db.insert("products", {
      ...data,
      productId,
      createdAt: now,
      updatedAt: now,
    });

    // Notify all customers about the new product
    const customers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "customer"))
      .collect();
    for (const u of customers) {
      await ctx.db.insert("notifications", {
        userId: u._id,
        type: "promo",
        title: "New product",
        body: data.name,
        read: false,
        link: "/shop",
        metadata: { productId: id },
        createdAt: now,
      });
    }

    return id;
  },
});

/** List products (public or by status filter). */
export const list = query({
  args: {
    status: v.optional(productStatus),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { status, limit = 50, cursor }) => {
    const base = status
      ? ctx.db.query("products").withIndex("by_status_created", (q) => q.eq("status", status))
      : ctx.db.query("products").order("desc");
    const result = cursor
      ? await base.paginate({ numItems: limit, cursor })
      : await base.take(limit);
    const items = Array.isArray(result) ? result : result.page;
    const nextCursor = Array.isArray(result) ? null : result.continueCursor;
    return { items, nextCursor };
  },
});

/** List products visible on the store (excludes draft/archived). Optional category filter. */
export const listForStore = query({
  args: {
    limit: v.optional(v.number()),
    categoryId: v.optional(v.string()),
  },
  handler: async (ctx, { limit = 48, categoryId }) => {
    const all = await ctx.db
      .query("products")
      .order("desc")
      .take(limit * 5);
    const filtered = all.filter(
      (p) =>
        STORE_VISIBLE_STATUSES.includes(p.status as (typeof STORE_VISIBLE_STATUSES)[number]) &&
        (!categoryId || (p.categoryIds && p.categoryIds.includes(categoryId)))
    );
    const items = filtered.slice(0, limit);
    return { items };
  },
});

/** Get product by id. */
export const get = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => ctx.db.get(productId),
});

/** Get multiple products by ids (e.g. for cart/wishlist). Returns only existing products. */
export const getByIds = query({
  args: { productIds: v.array(v.id("products")) },
  handler: async (ctx, { productIds }) => {
    const uniq = [...new Set(productIds)];
    const products = await Promise.all(uniq.map((id) => ctx.db.get(id)));
    return products.filter((p): p is NonNullable<typeof p> => p != null);
  },
});

/** Get product by slug. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) =>
    ctx.db.query("products").withIndex("by_slug", (q) => q.eq("slug", slug)).unique(),
});

/** Generate upload URL for product images (admin only). */
export const generateUploadUrl = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken ?? null);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Get URL for an uploaded image (by storage ID). */
export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => ctx.storage.getUrl(storageId),
});

/** Resolve storage ID to URL (for use after upload). */
export const resolveImageUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => ctx.storage.getUrl(storageId),
});

/** Update product (admin only). */
export const update = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    productId: v.id("products"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    compareAtPrice: v.optional(v.number()),
    images: v.optional(v.array(v.string())),
    status: v.optional(productStatus),
    stock: v.optional(v.number()),
    sku: v.optional(v.string()),
    categoryIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken ?? null);
    const { sessionToken: _, productId, ...patch } = args;
    const clean: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) clean[k] = v;
    await ctx.db.patch(args.productId, clean as any);
    return args.productId;
  },
});

/** Delete product (admin only). */
export const remove = mutation({
  args: { sessionToken: v.optional(v.string()), productId: v.id("products") },
  handler: async (ctx, { sessionToken, productId }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    await ctx.db.delete(productId);
    return productId;
  },
});

/** Bulk create products (admin only). */
export const bulkCreate = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    products: v.array(
      v.object({
        name: v.string(),
        slug: v.string(),
        description: v.string(),
        price: v.number(),
        compareAtPrice: v.optional(v.number()),
        images: v.array(v.string()),
        status: productStatus,
        stock: v.number(),
        sku: v.optional(v.string()),
        categoryIds: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, { sessionToken, products }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    const now = Date.now();
    const ids: Id<"products">[] = [];
    const usedIds = new Set<string>();
    for (const p of products) {
      let productId = generateSixDigitId();
      for (let i = 0; i < 20; i++) {
        if (usedIds.has(productId)) {
          productId = generateSixDigitId();
          continue;
        }
        const existing = await ctx.db.query("products").withIndex("by_productId", (q) => q.eq("productId", productId)).first();
        if (!existing) break;
        usedIds.add(productId);
        productId = generateSixDigitId();
      }
      usedIds.add(productId);
      ids.push(
        await ctx.db.insert("products", {
          ...p,
          productId,
          createdAt: now,
          updatedAt: now,
        })
      );
    }
    return ids;
  },
});

/** Bulk update products (admin only). */
export const bulkUpdate = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    updates: v.array(
      v.object({
        productId: v.id("products"),
        name: v.optional(v.string()),
        slug: v.optional(v.string()),
        description: v.optional(v.string()),
        price: v.optional(v.number()),
        compareAtPrice: v.optional(v.number()),
        images: v.optional(v.array(v.string())),
        status: v.optional(productStatus),
        stock: v.optional(v.number()),
        sku: v.optional(v.string()),
        categoryIds: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, { sessionToken, updates }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    const now = Date.now();
    for (const u of updates) {
      const { productId, ...patch } = u;
      const clean: Record<string, unknown> = { updatedAt: now };
      for (const [k, v] of Object.entries(patch)) if (v !== undefined) clean[k] = v;
      await ctx.db.patch(productId, clean as any);
    }
    return updates.length;
  },
});

/** Bulk delete products (admin only). */
export const bulkDelete = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, { sessionToken, productIds }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    for (const id of productIds) await ctx.db.delete(id);
    return productIds.length;
  },
});

/** Bulk update product status (admin only). Use status "archived" for soft delete. */
export const bulkUpdateStatus = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    productIds: v.array(v.id("products")),
    status: productStatus,
  },
  handler: async (ctx, { sessionToken, productIds, status }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    const now = Date.now();
    for (const id of productIds) {
      await ctx.db.patch(id, { status, updatedAt: now });
    }
    return productIds.length;
  },
});
