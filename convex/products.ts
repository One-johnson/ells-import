import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { allocatePublicCode } from "./lib/publicCode";
import { requireAdmin, resolveSession } from "./lib/sessionAuth";
import { productStatus } from "./schema";
import { paginationOptsValidator } from "convex/server";
import type { Doc, Id } from "./_generated/dataModel";

const productFields = {
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  sku: v.optional(v.string()),
  priceCents: v.number(),
  costPriceCents: v.optional(v.number()),
  compareAtCents: v.optional(v.number()),
  currency: v.string(),
  imageIds: v.optional(v.array(v.id("_storage"))),
  status: productStatus,
  stock: v.number(),
  initialStock: v.optional(v.number()),
  inStock: v.optional(v.boolean()),
  categoryId: v.optional(v.id("categories")),
} as const;

const productInput = v.object(productFields);

export const searchActive = query({
  args: {
    q: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { q, limit = 40 }) => {
    const term = q.trim().toLowerCase();
    if (!term) {
      return [];
    }
    const rows = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(500);
    const out = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term) ||
        (p.description?.toLowerCase().includes(term) ?? false) ||
        (p.sku?.toLowerCase().includes(term) ?? false) ||
        (p.publicCode?.includes(term) ?? false),
    );
    const sliced = out.slice(0, limit);
    return await Promise.all(
      sliced.map(async (p) => ({
        ...p,
        thumbnailUrl: p.imageIds?.[0]
          ? await ctx.storage.getUrl(p.imageIds[0])
          : null,
      })),
    );
  },
});

export const getManyForCart = query({
  args: { productIds: v.array(v.id("products")) },
  handler: async (ctx, { productIds }) => {
    const unique = Array.from(new Set(productIds)).slice(0, 200);
    const docs = await Promise.all(unique.map((id) => ctx.db.get(id)));
    return await Promise.all(
      docs
        .filter((p): p is NonNullable<typeof p> => p != null)
        .map(async (p) => ({
          _id: p._id,
          name: p.name,
          slug: p.slug,
          priceCents: p.priceCents,
          currency: p.currency,
          stock: p.stock,
          status: p.status,
          thumbnailUrl: p.imageIds?.[0] ? await ctx.storage.getUrl(p.imageIds[0]) : null,
        })),
    );
  },
});

export const listActive = query({
  args: {
    limit: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, { limit = 50, categoryId }) => {
    if (categoryId !== undefined) {
      const rows = await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
        .order("desc")
        .take(500);
      const filtered = rows
        .filter((p) => p.status === "active")
        .slice(0, limit);
      return await Promise.all(
        filtered.map(async (p) => ({
          ...p,
          thumbnailUrl: p.imageIds?.[0]
            ? await ctx.storage.getUrl(p.imageIds[0])
            : null,
        })),
      );
    }
    const rows = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(limit);
    return await Promise.all(
      rows.map(async (p) => ({
        ...p,
        thumbnailUrl: p.imageIds?.[0]
          ? await ctx.storage.getUrl(p.imageIds[0])
          : null,
      })),
    );
  },
});

/** Home “Explore the catalog”: up to `perCategory` in-stock active products per category (newest first per category), plus uncategorized. */
export const listActiveExploreCatalog = query({
  args: {
    perCategory: v.optional(v.number()),
    maxCategories: v.optional(v.number()),
  },
  handler: async (ctx, { perCategory = 2, maxCategories }) => {
    const cap = Math.min(Math.max(1, Math.floor(perCategory)), 6);
    const cats = await ctx.db.query("categories").collect();
    cats.sort((a, b) => a.name.localeCompare(b.name));
    const catSlice =
      maxCategories !== undefined
        ? cats.slice(0, Math.max(0, Math.floor(maxCategories)))
        : cats;

    const seen = new Set<string>();
    const picked: Doc<"products">[] = [];

    for (const c of catSlice) {
      const rows = await ctx.db
        .query("products")
        .withIndex("by_category_and_status_and_createdAt", (q) =>
          q.eq("categoryId", c._id).eq("status", "active"),
        )
        .order("desc")
        .take(64);
      let n = 0;
      for (const p of rows) {
        if (p.stock <= 0 || seen.has(p._id)) {
          continue;
        }
        seen.add(p._id);
        picked.push(p);
        n++;
        if (n >= cap) {
          break;
        }
      }
    }

    const uncategorized = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(150);
    let u = 0;
    for (const p of uncategorized) {
      if (p.categoryId !== undefined || p.stock <= 0 || seen.has(p._id)) {
        continue;
      }
      seen.add(p._id);
      picked.push(p);
      u++;
      if (u >= cap) {
        break;
      }
    }

    return await Promise.all(
      picked.map(async (p) => ({
        ...p,
        thumbnailUrl: p.imageIds?.[0] ? await ctx.storage.getUrl(p.imageIds[0]) : null,
      })),
    );
  },
});

export const listBestSellers = query({
  args: {
    limit: v.optional(v.number()),
    lookbackDays: v.optional(v.number()),
    maxOrders: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 8, lookbackDays = 30, maxOrders = 200 }) => {
    const cap = Math.min(Math.max(1, limit), 24);
    const maxOrderCap = Math.min(Math.max(1, maxOrders), 500);
    const since = Date.now() - Math.max(1, Math.min(365, lookbackDays)) * 24 * 60 * 60 * 1000;

    const statuses = ["paid", "shipped", "delivered"] as const;
    const orderRows = (
      await Promise.all(
        statuses.map((s) =>
          ctx.db
            .query("orders")
            .withIndex("by_status", (q) => q.eq("status", s))
            .order("desc")
            .take(maxOrderCap),
        ),
      )
    )
      .flat()
      .filter((o) => o.createdAt >= since)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, maxOrderCap);

    const qtyByProductId = new Map<string, number>();
    for (const o of orderRows) {
      const lines = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", o._id))
        .collect();
      for (const line of lines) {
        qtyByProductId.set(line.productId, (qtyByProductId.get(line.productId) ?? 0) + line.quantity);
      }
    }

    const topIds = Array.from(qtyByProductId.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, cap)
      .map(([id]) => id as Id<"products">);

    const docs = await Promise.all(topIds.map((id) => ctx.db.get(id)));
    const active = docs.filter((p): p is NonNullable<typeof p> => Boolean(p && p.status === "active"));

    return await Promise.all(
      active.map(async (p) => ({
        ...p,
        thumbnailUrl: p.imageIds?.[0] ? await ctx.storage.getUrl(p.imageIds[0]) : null,
      })),
    );
  },
});

export const listTrending = query({
  args: {
    limit: v.optional(v.number()),
    lookbackDays: v.optional(v.number()),
    maxOrders: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 8, lookbackDays = 7, maxOrders = 200 }) => {
    const cap = Math.min(Math.max(1, limit), 24);
    const maxOrderCap = Math.min(Math.max(1, maxOrders), 500);
    const since = Date.now() - Math.max(1, Math.min(365, lookbackDays)) * 24 * 60 * 60 * 1000;

    const statuses = ["paid", "shipped", "delivered"] as const;
    const orderRows = (
      await Promise.all(
        statuses.map((s) =>
          ctx.db
            .query("orders")
            .withIndex("by_status", (q) => q.eq("status", s))
            .order("desc")
            .take(maxOrderCap),
        ),
      )
    )
      .flat()
      .filter((o) => o.createdAt >= since)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, maxOrderCap);

    const qtyByProductId = new Map<Id<"products">, number>();
    for (const o of orderRows) {
      const lines = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", o._id))
        .collect();
      for (const line of lines) {
        qtyByProductId.set(line.productId, (qtyByProductId.get(line.productId) ?? 0) + line.quantity);
      }
    }

    const topIds = Array.from(qtyByProductId.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, cap)
      .map(([id]) => id);

    const docs = await Promise.all(topIds.map((id) => ctx.db.get(id)));
    const active = docs.filter((p): p is NonNullable<typeof p> => Boolean(p && p.status === "active"));

    return await Promise.all(
      active.map(async (p) => ({
        ...p,
        thumbnailUrl: p.imageIds?.[0] ? await ctx.storage.getUrl(p.imageIds[0]) : null,
      })),
    );
  },
});

const storefrontSort = v.union(
  v.literal("newest"),
  v.literal("price_asc"),
  v.literal("price_desc"),
);

export const listActivePaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sort: v.optional(storefrontSort),
    categoryId: v.optional(v.id("categories")),
    inStockOnly: v.optional(v.boolean()),
    minPriceCents: v.optional(v.number()),
    maxPriceCents: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { paginationOpts, sort = "newest", categoryId, inStockOnly, minPriceCents, maxPriceCents },
  ) => {
    const status = "active" as const;
    const inStock = inStockOnly ? true : undefined;
    const min = minPriceCents !== undefined ? Math.max(0, Math.floor(minPriceCents)) : undefined;
    const max = maxPriceCents !== undefined ? Math.max(0, Math.floor(maxPriceCents)) : undefined;

    const base =
      categoryId !== undefined
        ? sort === "newest"
          ? inStockOnly
            ? ctx.db
                .query("products")
                .withIndex("by_category_and_status_and_inStock_and_createdAt", (q) =>
                  q.eq("categoryId", categoryId).eq("status", status).eq("inStock", true),
                )
                .order("desc")
            : ctx.db
                .query("products")
                .withIndex("by_category_and_status_and_createdAt", (q) =>
                  q.eq("categoryId", categoryId).eq("status", status),
                )
                .order("desc")
          : inStockOnly
            ? ctx.db
                .query("products")
                .withIndex(
                  "by_category_and_status_and_inStock_and_priceCents_and_createdAt",
                  (q) =>
                    (max !== undefined
                      ? q
                          .eq("categoryId", categoryId)
                          .eq("status", status)
                          .eq("inStock", true)
                          .gte("priceCents", min ?? 0)
                          .lte("priceCents", max)
                      : q
                          .eq("categoryId", categoryId)
                          .eq("status", status)
                          .eq("inStock", true)
                          .gte("priceCents", min ?? 0)),
                )
                .order(sort === "price_desc" ? "desc" : "asc")
            : ctx.db
                .query("products")
                .withIndex("by_category_and_status_and_priceCents_and_createdAt", (q) =>
                  max !== undefined
                    ? q
                        .eq("categoryId", categoryId)
                        .eq("status", status)
                        .gte("priceCents", min ?? 0)
                        .lte("priceCents", max)
                    : q.eq("categoryId", categoryId).eq("status", status).gte("priceCents", min ?? 0),
                )
                .order(sort === "price_desc" ? "desc" : "asc")
        : sort === "newest"
          ? inStockOnly
            ? ctx.db
                .query("products")
                .withIndex("by_status_and_inStock_and_createdAt", (q) =>
                  q.eq("status", status).eq("inStock", true),
                )
                .order("desc")
            : ctx.db
                .query("products")
                .withIndex("by_status_and_createdAt", (q) => q.eq("status", status))
                .order("desc")
          : inStockOnly
            ? ctx.db
                .query("products")
                .withIndex("by_status_and_inStock_and_priceCents_and_createdAt", (q) =>
                  max !== undefined
                    ? q
                        .eq("status", status)
                        .eq("inStock", true)
                        .gte("priceCents", min ?? 0)
                        .lte("priceCents", max)
                    : q.eq("status", status).eq("inStock", true).gte("priceCents", min ?? 0),
                )
                .order(sort === "price_desc" ? "desc" : "asc")
            : ctx.db
                .query("products")
                .withIndex("by_status_and_priceCents_and_createdAt", (q) =>
                  max !== undefined
                    ? q.eq("status", status).gte("priceCents", min ?? 0).lte("priceCents", max)
                    : q.eq("status", status).gte("priceCents", min ?? 0),
                )
                .order(sort === "price_desc" ? "desc" : "asc");

    const page = await base.paginate(paginationOpts);
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (p) => ({
          ...p,
          inStock: p.inStock ?? p.stock > 0,
          thumbnailUrl: p.imageIds?.[0] ? await ctx.storage.getUrl(p.imageIds[0]) : null,
        })),
      ),
      sort,
      inStockOnly: inStockOnly ?? false,
      inStock,
      minPriceCents: min ?? null,
      maxPriceCents: max ?? null,
    };
  },
});

export const list = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(productStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, status, limit = 200 }) => {
    await requireAdmin(ctx, sessionToken);
    const rows =
      status !== undefined
        ? await ctx.db
            .query("products")
            .withIndex("by_status", (q) => q.eq("status", status))
            .take(limit)
        : await ctx.db.query("products").order("desc").take(limit);
    return await Promise.all(
      rows.map(async (p) => ({
        ...p,
        thumbnailUrl: p.imageIds?.[0]
          ? await ctx.storage.getUrl(p.imageIds[0])
          : null,
      })),
    );
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

/** Storefront: active product only, with image URLs. */
export const getActiveBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const p = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!p || p.status !== "active") {
      return null;
    }
    const rawUrls = await Promise.all(
      (p.imageIds ?? []).map((id) => ctx.storage.getUrl(id)),
    );
    const imageUrls = rawUrls.filter((u): u is string => u != null);
    return {
      ...p,
      thumbnailUrl: imageUrls[0] ?? null,
      imageUrls,
    };
  },
});

export const get = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    return await ctx.db.get(productId);
  },
});

export const create = mutation({
  args: { sessionToken: v.string(), ...productFields },
  handler: async (ctx, { sessionToken, ...args }) => {
    await requireAdmin(ctx, sessionToken);
    const now = Date.now();
    const publicCode = await allocatePublicCode(ctx, "products");
    const initialStock =
      args.initialStock !== undefined ? args.initialStock : Math.max(0, Math.floor(args.stock));
    return await ctx.db.insert("products", {
      ...args,
      costPriceCents: args.costPriceCents ?? 0,
      inStock: args.inStock ?? args.stock > 0,
      initialStock,
      publicCode,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    productId: v.id("products"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    sku: v.optional(v.string()),
    priceCents: v.optional(v.number()),
    costPriceCents: v.optional(v.number()),
    compareAtCents: v.optional(v.number()),
    currency: v.optional(v.string()),
    imageIds: v.optional(v.array(v.id("_storage"))),
    status: v.optional(productStatus),
    stock: v.optional(v.number()),
    initialStock: v.optional(v.number()),
    inStock: v.optional(v.boolean()),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
  },
  handler: async (ctx, { sessionToken, productId, ...rest }) => {
    await requireAdmin(ctx, sessionToken);
    const prev = await ctx.db.get(productId);
    if (prev === null) {
      throw new Error("Product not found");
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, val] of Object.entries(rest)) {
      if (val === undefined) {
        continue;
      }
      if (k === "categoryId" && val === null) {
        patch.categoryId = undefined;
        continue;
      }
      patch[k] = val;
    }
    if (rest.stock !== undefined && rest.initialStock === undefined) {
      const nextStock = Math.max(0, Math.floor(rest.stock));
      const prevInitial = typeof prev.initialStock === "number" ? prev.initialStock : prev.stock;
      // If stock increases above the baseline, treat it as a restock and reset the baseline.
      if (nextStock > prevInitial) {
        patch.initialStock = nextStock;
      }
    }
    if (rest.stock !== undefined && rest.inStock === undefined) {
      patch.inStock = rest.stock > 0;
    }
    if (rest.imageIds !== undefined) {
      const newIds = rest.imageIds ?? [];
      for (const id of prev.imageIds ?? []) {
        if (!newIds.includes(id)) {
          await ctx.storage.delete(id);
        }
      }
    }
    await ctx.db.patch(productId, patch);
  },
});

export const backfillInitialStock = mutation({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { sessionToken, limit = 200, cursor = null }) => {
    await requireAdmin(ctx, sessionToken);
    const cap = Math.min(Math.max(1, limit), 500);
    const page = await ctx.db.query("products").order("desc").paginate({ numItems: cap, cursor });
    let updated = 0;
    for (const p of page.page) {
      if (p.initialStock === undefined) {
        await ctx.db.patch(p._id, { initialStock: Math.max(0, Math.floor(p.stock)) });
        updated++;
      }
    }
    return { updated, continueCursor: page.continueCursor, isDone: page.isDone };
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), productId: v.id("products") },
  handler: async (ctx, { sessionToken, productId }) => {
    await requireAdmin(ctx, sessionToken);
    const doc = await ctx.db.get(productId);
    if (doc !== null) {
      for (const id of doc.imageIds ?? []) {
        await ctx.storage.delete(id);
      }
    }
    await ctx.db.delete(productId);
  },
});

export const bulkCreate = mutation({
  args: { sessionToken: v.string(), items: v.array(productInput) },
  handler: async (ctx, { sessionToken, items }) => {
    await requireAdmin(ctx, sessionToken);
    const now = Date.now();
    const ids: import("./_generated/dataModel").Id<"products">[] = [];
    for (const item of items) {
      const publicCode = await allocatePublicCode(ctx, "products");
      const initialStock =
        item.initialStock !== undefined ? item.initialStock : Math.max(0, Math.floor(item.stock));
      ids.push(
        await ctx.db.insert("products", {
          ...item,
          costPriceCents: item.costPriceCents ?? 0,
          inStock: item.inStock ?? item.stock > 0,
          initialStock,
          publicCode,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    return ids;
  },
});

export const bulkRemove = mutation({
  args: { sessionToken: v.string(), productIds: v.array(v.id("products")) },
  handler: async (ctx, { sessionToken, productIds }) => {
    await requireAdmin(ctx, sessionToken);
    for (const id of productIds) {
      const doc = await ctx.db.get(id);
      if (doc !== null) {
        for (const sid of doc.imageIds ?? []) {
          await ctx.storage.delete(sid);
        }
      }
      await ctx.db.delete(id);
    }
    return { removed: productIds.length };
  },
});

export const bulkUpdateStatus = mutation({
  args: {
    sessionToken: v.string(),
    productIds: v.array(v.id("products")),
    status: productStatus,
  },
  handler: async (ctx, { sessionToken, productIds, status }) => {
    await requireAdmin(ctx, sessionToken);
    const now = Date.now();
    for (const id of productIds) {
      await ctx.db.patch(id, { status, updatedAt: now });
    }
    return { updated: productIds.length };
  },
});

export const bulkSetCategory = mutation({
  args: {
    sessionToken: v.string(),
    productIds: v.array(v.id("products")),
    categoryId: v.union(v.id("categories"), v.null()),
  },
  handler: async (ctx, { sessionToken, productIds, categoryId }) => {
    await requireAdmin(ctx, sessionToken);
    if (categoryId !== null) {
      const cat = await ctx.db.get(categoryId);
      if (cat === null) {
        throw new Error("Category not found");
      }
    }
    const now = Date.now();
    const cid = categoryId === null ? undefined : categoryId;
    for (const id of productIds) {
      await ctx.db.patch(id, { categoryId: cid, updatedAt: now });
    }
    return { updated: productIds.length };
  },
});

/** Set price, stock, or currency for many products at once (only pass fields to change). */
export const bulkUpdateFields = mutation({
  args: {
    sessionToken: v.string(),
    productIds: v.array(v.id("products")),
    priceCents: v.optional(v.number()),
    costPriceCents: v.optional(v.number()),
    compareAtCents: v.optional(v.union(v.number(), v.null())),
    stock: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    await requireAdmin(ctx, a.sessionToken);
    const now = Date.now();
    for (const id of a.productIds) {
      const patch: Record<string, unknown> = { updatedAt: now };
      if (a.priceCents !== undefined) {
        patch.priceCents = a.priceCents;
      }
      if (a.costPriceCents !== undefined) {
        patch.costPriceCents = a.costPriceCents;
      }
      if (a.compareAtCents !== undefined) {
        patch.compareAtCents =
          a.compareAtCents === null ? undefined : a.compareAtCents;
      }
      if (a.stock !== undefined) {
        patch.stock = a.stock;
        patch.inStock = a.stock > 0;
      }
      if (a.currency !== undefined) {
        patch.currency = a.currency;
      }
      await ctx.db.patch(id, patch);
    }
    return { updated: a.productIds.length };
  },
});

export const isFavorite = query({
  args: {
    productId: v.id("products"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { productId, sessionToken }) => {
    const a = await resolveSession(ctx, sessionToken);
    if (a === null) {
      return false;
    }
    const row = await ctx.db
      .query("wishlistItems")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", a.userId).eq("productId", productId),
      )
      .unique();
    return row !== null;
  },
});

export const adminLowStockList = query({
  args: {
    sessionToken: v.string(),
    maxStock: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, maxStock = 10, limit = 200 }) => {
    await requireAdmin(ctx, sessionToken);
    const products = await ctx.db.query("products").collect();
    return products
      .filter((p) => p.status === "active" && p.stock > 0 && p.stock <= maxStock)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, limit)
      .map((p) => ({
        _id: p._id,
        name: p.name,
        stock: p.stock,
        publicCode: p.publicCode,
        sku: p.sku,
        priceCents: p.priceCents,
        currency: p.currency,
      }));
  },
});
