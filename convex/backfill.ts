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
