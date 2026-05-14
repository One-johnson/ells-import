import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { parseNonNegativeCents } from "./lib/appSettings";
import { DEFAULT_PAYMENT_INSTRUCTIONS, DEFAULT_WHATSAPP_NUMBER_DIGITS } from "./lib/storefrontDefaults";
import { getHeroSlidesFromJsonValue, mergeHeroSlidesWithProducts, type HeroProductCandidate } from "./lib/heroSlides";
import { requireAdmin, requireAuthed, resolveSession } from "./lib/sessionAuth";

export const getUser = query({
  args: { sessionToken: v.optional(v.string()), key: v.string() },
  handler: async (ctx, { sessionToken, key }) => {
    const a = await resolveSession(ctx, sessionToken);
    if (a === null) {
      return null;
    }
    return await ctx.db
      .query("userSettings")
      .withIndex("by_user_key", (q) => q.eq("userId", a.userId).eq("key", key))
      .unique();
  },
});

export const listUser = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const a = await requireAuthed(ctx, sessionToken);
    return await ctx.db
      .query("userSettings")
      .withIndex("by_user_key", (q) => q.eq("userId", a.userId))
      .collect();
  },
});

export const setUser = mutation({
  args: { sessionToken: v.string(), key: v.string(), value: v.string() },
  handler: async (ctx, { sessionToken, key, value }) => {
    const { userId } = await requireAuthed(ctx, sessionToken);
    const now = Date.now();
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("key", key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("userSettings", { userId, key, value, updatedAt: now });
  },
});

export const updateUser = mutation({
  args: {
    sessionToken: v.string(),
    settingId: v.id("userSettings"),
    value: v.string(),
  },
  handler: async (ctx, { sessionToken, settingId, value }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const row = await ctx.db.get(settingId);
    if (row === null || row.userId !== a.userId) {
      throw new Error("Forbidden");
    }
    await ctx.db.patch(settingId, { value, updatedAt: Date.now() });
  },
});

export const removeUser = mutation({
  args: { sessionToken: v.string(), settingId: v.id("userSettings") },
  handler: async (ctx, { sessionToken, settingId }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const row = await ctx.db.get(settingId);
    if (row === null || row.userId !== a.userId) {
      throw new Error("Forbidden");
    }
    await ctx.db.delete(settingId);
  },
});

export const bulkRemoveUser = mutation({
  args: { sessionToken: v.string(), settingIds: v.array(v.id("userSettings")) },
  handler: async (ctx, { sessionToken, settingIds }) => {
    const a = await requireAuthed(ctx, sessionToken);
    for (const id of settingIds) {
      const row = await ctx.db.get(id);
      if (row && row.userId === a.userId) {
        await ctx.db.delete(id);
      }
    }
    return { removed: settingIds.length };
  },
});

export const getApp = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
  },
});

const STOREFRONT_SETTING_KEYS = [
  "store_name",
  "store_tagline",
  "support_email",
  "announcement_text",
] as const;

/**
 * Public snapshot for the storefront: one query for name, tagline, support, announcement.
 * Keys are optional in DB; missing keys return null and the UI uses fallbacks.
 */
export const storefrontSettings = query({
  args: {},
  handler: async (ctx) => {
    const getVal = async (key: (typeof STOREFRONT_SETTING_KEYS)[number]) => {
      const row = await ctx.db
        .query("appSettings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      return row?.value?.trim() || null;
    };
    const getValAny = async (key: string) => {
      const row = await ctx.db
        .query("appSettings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      return row?.value?.trim() || null;
    };
    const channelRaw = (await getValAny("checkout_payment_channel")) ?? "whatsapp";
    const checkoutPaymentChannel =
      channelRaw.toLowerCase() === "paystack" ? ("paystack" as const) : ("whatsapp" as const);
    const deliveryFeeRaw = await getValAny("delivery_fee_cents");
    const preorderShipRaw = await getValAny("preorder_shipping_cents_per_cbm");
    const whatsappFromDb = await getValAny("whatsapp_number");
    const instructionsFromDb = await getValAny("payment_instructions");
    return {
      storeName: await getVal("store_name"),
      storeTagline: await getVal("store_tagline"),
      supportEmail: await getVal("support_email"),
      announcementText: await getVal("announcement_text"),
      whatsappNumber: whatsappFromDb ?? DEFAULT_WHATSAPP_NUMBER_DIGITS,
      paymentInstructions: instructionsFromDb ?? DEFAULT_PAYMENT_INSTRUCTIONS,
      checkoutPaymentChannel,
      deliveryFeeCents: parseNonNegativeCents(deliveryFeeRaw),
      preorderShippingCentsPerCbm: parseNonNegativeCents(preorderShipRaw),
    };
  },
});

/** Public hero carousel: configured slides plus active products with images (newest first). */
export const heroSlides = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "hero_slides_json"))
      .unique();
    const base = getHeroSlidesFromJsonValue(row?.value);

    const catSlugRow = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "hero_category_slug"))
      .unique();
    const catSlug = catSlugRow?.value?.trim();
    let categoryId: Id<"categories"> | undefined;
    if (catSlug) {
      const cat = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", catSlug))
        .unique();
      categoryId = cat?._id;
    }

    let productRows;
    if (categoryId !== undefined) {
      productRows = await ctx.db
        .query("products")
        .withIndex("by_category_and_status_and_createdAt", (q) =>
          q.eq("categoryId", categoryId).eq("status", "active"),
        )
        .order("asc")
        .take(64);
    } else {
      productRows = await ctx.db
        .query("products")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", "active"))
        .order("asc")
        .take(48);
    }

    const candidates: HeroProductCandidate[] = [];
    for (const p of productRows) {
      const thumb = p.imageIds?.[0] ? await ctx.storage.getUrl(p.imageIds[0]) : null;
      if (thumb) {
        candidates.push({
          name: p.name,
          slug: p.slug,
          description: p.description,
          priceCents: p.priceCents,
          currency: p.currency,
          thumbnailUrl: thumb,
        });
      }
    }

    return mergeHeroSlidesWithProducts(base, candidates);
  },
});

export const listApp = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    return await ctx.db.query("appSettings").collect();
  },
});

export const setApp = mutation({
  args: { sessionToken: v.string(), key: v.string(), value: v.string() },
  handler: async (ctx, { sessionToken, key, value }) => {
    await requireAdmin(ctx, sessionToken);
    const now = Date.now();
    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("appSettings", { key, value, updatedAt: now });
  },
});

export const updateApp = mutation({
  args: {
    sessionToken: v.string(),
    settingId: v.id("appSettings"),
    value: v.string(),
  },
  handler: async (ctx, { sessionToken, settingId, value }) => {
    await requireAdmin(ctx, sessionToken);
    await ctx.db.patch(settingId, { value, updatedAt: Date.now() });
  },
});

export const removeApp = mutation({
  args: { sessionToken: v.string(), settingId: v.id("appSettings") },
  handler: async (ctx, { sessionToken, settingId }) => {
    await requireAdmin(ctx, sessionToken);
    await ctx.db.delete(settingId);
  },
});

export const bulkRemoveApp = mutation({
  args: { sessionToken: v.string(), settingIds: v.array(v.id("appSettings")) },
  handler: async (ctx, { sessionToken, settingIds }) => {
    await requireAdmin(ctx, sessionToken);
    for (const id of settingIds) {
      await ctx.db.delete(id);
    }
    return { removed: settingIds.length };
  },
});

export const bulkSetApp = mutation({
  args: {
    sessionToken: v.string(),
    entries: v.array(v.object({ key: v.string(), value: v.string() })),
  },
  handler: async (ctx, { sessionToken, entries }) => {
    await requireAdmin(ctx, sessionToken);
    const now = Date.now();
    for (const { key, value } of entries) {
      const ex = await ctx.db
        .query("appSettings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (ex) {
        await ctx.db.patch(ex._id, { value, updatedAt: now });
      } else {
        await ctx.db.insert("appSettings", { key, value, updatedAt: now });
      }
    }
    return { written: entries.length };
  },
});
