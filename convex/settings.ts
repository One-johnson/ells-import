import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/** Get the single settings doc (admin only). Returns null if none exists. */
export const get = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    return await ctx.db.query("settings").first();
  },
});

/** Public settings for storefront (no auth). Returns null if no doc. */
export const getPublic = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("settings").first();
    if (!doc) return null;
    return {
      storeName: doc.storeName,
      paymentPhone: doc.paymentPhone,
      paymentName: doc.paymentName,
      adminWhatsApp: doc.adminWhatsApp,
      defaultCountry: doc.defaultCountry,
      currency: doc.currency,
      freeShippingThresholdPesewas: doc.freeShippingThresholdPesewas,
      shippingFlatRatePesewas: doc.shippingFlatRatePesewas,
      taxRatePercent: doc.taxRatePercent,
      maintenanceMode: doc.maintenanceMode,
    };
  },
});

/** Update settings (admin only). Creates doc if none exists. */
export const update = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    storeName: v.optional(v.string()),
    paymentPhone: v.optional(v.string()),
    paymentName: v.optional(v.string()),
    adminWhatsApp: v.optional(v.string()),
    defaultCountry: v.optional(v.string()),
    currency: v.optional(v.string()),
    freeShippingThresholdPesewas: v.optional(v.number()),
    shippingFlatRatePesewas: v.optional(v.number()),
    taxRatePercent: v.optional(v.number()),
    maintenanceMode: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken ?? null);
    const { sessionToken: _, ...patch } = args;
    const now = Date.now();
    const doc = await ctx.db.query("settings").first();
    const allowed = [
      "storeName", "paymentPhone", "paymentName", "adminWhatsApp",
      "defaultCountry", "currency", "freeShippingThresholdPesewas",
      "shippingFlatRatePesewas", "taxRatePercent", "maintenanceMode",
    ] as const;
    const updates: Record<string, unknown> = { updatedAt: now };
    for (const key of allowed) {
      if (patch[key] !== undefined) updates[key] = patch[key];
    }
    if (doc) {
      await ctx.db.patch(doc._id, updates);
      return doc._id;
    }
    await ctx.db.insert("settings", { ...updates } as { updatedAt: number });
    const inserted = await ctx.db.query("settings").first();
    return inserted!._id;
  },
});
