import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { allocatePublicCode } from "./lib/publicCode";
import { requireAdmin } from "./lib/sessionAuth";

/**
 * One-time (or idempotent) backfill of `publicCode` for existing documents missing it.
 * Safe to run multiple times; only patches rows where `publicCode` is undefined.
 */
export const backfillPublicCodes = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    let patched = 0;

    const tables = [
      "users",
      "categories",
      "products",
      "orders",
    ] as const;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        if ("publicCode" in doc && doc.publicCode !== undefined) {
          continue;
        }
        const code = await allocatePublicCode(ctx, table);
        await ctx.db.patch(doc._id, { publicCode: code });
        patched += 1;
      }
    }

    return { patched };
  },
});

/**
 * One-time (or idempotent) backfill of `inStock` for products.
 * Safe to run multiple times; only patches rows where `inStock` is undefined.
 */
export const backfillProductInStock = mutation({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit = 2000 }) => {
    await requireAdmin(ctx, sessionToken);
    let patched = 0;
    const cap = Math.min(Math.max(1, limit), 10000);
    for await (const p of ctx.db.query("products")) {
      if (patched >= cap) {
        break;
      }
      if (p.inStock !== undefined) {
        continue;
      }
      await ctx.db.patch(p._id, { inStock: p.stock > 0 });
      patched += 1;
    }
    return { patched };
  },
});
