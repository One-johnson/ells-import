import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { allocatePublicCode } from "./lib/publicCode";
import { requireAdmin } from "./lib/sessionAuth";

const categoryFields = {
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  imageId: v.optional(v.id("_storage")),
  parentId: v.optional(v.id("categories")),
  sortOrder: v.number(),
} as const;

const categoryInput = v.object(categoryFields);

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

export const list = query({
  args: { parentId: v.optional(v.id("categories")) },
  handler: async (ctx, { parentId }) => {
    const all = await ctx.db.query("categories").collect();
    const filtered = all.filter((c) => {
      if (parentId === undefined) {
        return c.parentId === undefined;
      }
      return c.parentId === parentId;
    });
    return filtered.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
  },
});

export const listWithThumbnails = query({
  args: { parentId: v.optional(v.id("categories")), limit: v.optional(v.number()) },
  handler: async (ctx, { parentId, limit }) => {
    const all = await ctx.db.query("categories").collect();
    const filtered = all
      .filter((c) => {
        if (parentId === undefined) {
          return c.parentId === undefined;
        }
        return c.parentId === parentId;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .slice(0, Math.max(1, Math.min(200, limit ?? 32)));

    return await Promise.all(
      filtered.map(async (c) => ({
        ...c,
        thumbnailUrl: c.imageId ? await ctx.storage.getUrl(c.imageId) : null,
      })),
    );
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("categories").collect();
    const sorted = all.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
    return await Promise.all(
      sorted.map(async (c) => ({
        ...c,
        thumbnailUrl: c.imageId ? await ctx.storage.getUrl(c.imageId) : null,
      })),
    );
  },
});

export const get = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, { categoryId }) => {
    return await ctx.db.get(categoryId);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(slug)))
      .unique();
  },
});

export const create = mutation({
  args: { sessionToken: v.string(), ...categoryFields },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const { sessionToken, parentId, name, slug, description, imageId, sortOrder } = args;
    void sessionToken;
    if (parentId !== undefined) {
      const p = await ctx.db.get(parentId);
      if (p === null) {
        throw new Error("Parent category not found");
      }
    }
    const normalizedSlug = normalizeSlug(slug);
    const dupe = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", normalizedSlug))
      .unique();
    if (dupe) {
      throw new Error("Slug already in use");
    }
    const now = Date.now();
    const publicCode = await allocatePublicCode(ctx, "categories");
    return await ctx.db.insert("categories", {
      name,
      slug: normalizedSlug,
      description,
      imageId,
      parentId,
      sortOrder,
      publicCode,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    imageId: v.optional(v.union(v.id("_storage"), v.null())),
    parentId: v.optional(v.union(v.id("categories"), v.null())),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, categoryId, parentId, imageId, ...rest }) => {
    await requireAdmin(ctx, sessionToken);
    if (parentId !== undefined && parentId !== null) {
      if (parentId === categoryId) {
        throw new Error("Category cannot be its own parent");
      }
      const p = await ctx.db.get(parentId);
      if (p === null) {
        throw new Error("Parent not found");
      }
    }
    const prev = await ctx.db.get(categoryId);
    if (prev === null) {
      throw new Error("Category not found");
    }
    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now };
    for (const [k, val] of Object.entries(rest)) {
      if (val === undefined) {
        continue;
      }
      if (k === "slug") {
        const ns = normalizeSlug(String(val));
        const dupe = await ctx.db
          .query("categories")
          .withIndex("by_slug", (q) => q.eq("slug", ns))
          .unique();
        if (dupe && dupe._id !== categoryId) {
          throw new Error("Slug already in use");
        }
        patch[k] = ns;
        continue;
      }
      patch[k] = val;
    }
    if (parentId !== undefined) {
      patch.parentId = parentId === null ? undefined : parentId;
    }
    if (imageId !== undefined) {
      const nextId = imageId === null ? undefined : imageId;
      if (prev.imageId && prev.imageId !== nextId) {
        await ctx.storage.delete(prev.imageId);
      }
      patch.imageId = nextId;
    }
    await ctx.db.patch(categoryId, patch);
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), categoryId: v.id("categories") },
  handler: async (ctx, { sessionToken, categoryId }) => {
    await requireAdmin(ctx, sessionToken);
    const doc = await ctx.db.get(categoryId);
    if (doc?.imageId) {
      await ctx.storage.delete(doc.imageId);
    }
    const children = await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parentId", categoryId))
      .first();
    if (children !== null) {
      throw new Error("Remove or reassign subcategories first");
    }
    for (const p of await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
      .collect()) {
      await ctx.db.patch(p._id, {
        categoryId: undefined,
        updatedAt: Date.now(),
      });
    }
    await ctx.db.delete(categoryId);
  },
});

export const bulkCreate = mutation({
  args: { sessionToken: v.string(), items: v.array(categoryInput) },
  handler: async (ctx, { sessionToken, items }) => {
    await requireAdmin(ctx, sessionToken);
    const now = Date.now();
    const ids: import("./_generated/dataModel").Id<"categories">[] = [];
    for (const item of items) {
      const normalizedSlug = normalizeSlug(item.slug);
      const dupe = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", normalizedSlug))
        .unique();
      if (dupe) {
        throw new Error(`Duplicate slug: ${normalizedSlug}`);
      }
      if (item.parentId !== undefined) {
        const p = await ctx.db.get(item.parentId);
        if (p === null) {
          throw new Error("Parent not found");
        }
      }
      const publicCode = await allocatePublicCode(ctx, "categories");
      ids.push(
        await ctx.db.insert("categories", {
          ...item,
          slug: normalizedSlug,
          publicCode,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    return ids;
  },
});

export const bulkUpdateSort = mutation({
  args: {
    sessionToken: v.string(),
    updates: v.array(
      v.object({ categoryId: v.id("categories"), sortOrder: v.number() }),
    ),
  },
  handler: async (ctx, { sessionToken, updates }) => {
    await requireAdmin(ctx, sessionToken);
    const t = Date.now();
    for (const u of updates) {
      await ctx.db.patch(u.categoryId, { sortOrder: u.sortOrder, updatedAt: t });
    }
    return { updated: updates.length };
  },
});

export const bulkSetParent = mutation({
  args: {
    sessionToken: v.string(),
    categoryIds: v.array(v.id("categories")),
    parentId: v.union(v.id("categories"), v.null()),
  },
  handler: async (ctx, { sessionToken, categoryIds, parentId }) => {
    await requireAdmin(ctx, sessionToken);
    if (parentId !== null) {
      const p = await ctx.db.get(parentId);
      if (p === null) {
        throw new Error("Parent not found");
      }
    }
    for (const id of categoryIds) {
      if (parentId !== null && id === parentId) {
        throw new Error("A category cannot be its own parent");
      }
    }
    const now = Date.now();
    const pid = parentId === null ? undefined : parentId;
    for (const id of categoryIds) {
      await ctx.db.patch(id, { parentId: pid, updatedAt: now });
    }
    return { updated: categoryIds.length };
  },
});

export const bulkRemove = mutation({
  args: { sessionToken: v.string(), categoryIds: v.array(v.id("categories")) },
  handler: async (ctx, { sessionToken, categoryIds }) => {
    await requireAdmin(ctx, sessionToken);
    for (const id of categoryIds) {
      const child = await ctx.db
        .query("categories")
        .withIndex("by_parent", (q) => q.eq("parentId", id))
        .first();
      if (child !== null) {
        throw new Error(
          `Category ${id} has subcategories; remove them first or use one-by-one remove`,
        );
      }
    }
    const now = Date.now();
    for (const id of categoryIds) {
      const cat = await ctx.db.get(id);
      for (const p of await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("categoryId", id))
        .collect()) {
        await ctx.db.patch(p._id, { categoryId: undefined, updatedAt: now });
      }
      if (cat?.imageId) {
        await ctx.storage.delete(cat.imageId);
      }
      await ctx.db.delete(id);
    }
    return { removed: categoryIds.length };
  },
});
