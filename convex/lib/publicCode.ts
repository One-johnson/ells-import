import type { MutationCtx } from "../_generated/server";

/** Tables that store a unique 6-digit `publicCode` (100000–999999). */
export type CodedTable = "users" | "categories" | "products" | "orders" | "payments";

/**
 * Allocate a unique 6-digit numeric string for the given table (retries on collision).
 */
export async function allocatePublicCode(
  ctx: MutationCtx,
  table: CodedTable,
): Promise<string> {
  for (let attempt = 0; attempt < 64; attempt++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const hit = await queryByPublicCode(ctx, table, code);
    if (hit === null) {
      return code;
    }
  }
  throw new Error("Failed to allocate a unique public code");
}

async function queryByPublicCode(
  ctx: MutationCtx,
  table: CodedTable,
  code: string,
) {
  switch (table) {
    case "users":
      return await ctx.db
        .query("users")
        .withIndex("by_public_code", (q) => q.eq("publicCode", code))
        .first();
    case "categories":
      return await ctx.db
        .query("categories")
        .withIndex("by_public_code", (q) => q.eq("publicCode", code))
        .first();
    case "products":
      return await ctx.db
        .query("products")
        .withIndex("by_public_code", (q) => q.eq("publicCode", code))
        .first();
    case "orders":
      return await ctx.db
        .query("orders")
        .withIndex("by_public_code", (q) => q.eq("publicCode", code))
        .first();
    case "payments":
      return await ctx.db
        .query("payments")
        .withIndex("by_public_code", (q) => q.eq("publicCode", code))
        .first();
    default: {
      const _exhaustive: never = table;
      return _exhaustive;
    }
  }
}
