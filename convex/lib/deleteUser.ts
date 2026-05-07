import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Remove sessions, cart, wishlist, userSettings, reviews, notifications for a user.
 * Call only when the user has no orders.
 */
export async function deleteUserDocuments(ctx: MutationCtx, userId: Id<"users">) {
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const s of sessions) {
    await ctx.db.delete(s._id);
  }
  const cart = await ctx.db
    .query("carts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (cart) {
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .collect();
    for (const i of items) {
      await ctx.db.delete(i._id);
    }
    await ctx.db.delete(cart._id);
  }
  for (const w of await ctx.db
    .query("wishlistItems")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()) {
    await ctx.db.delete(w._id);
  }
  for (const s of await ctx.db
    .query("userSettings")
    .withIndex("by_user_key", (q) => q.eq("userId", userId))
    .collect()) {
    await ctx.db.delete(s._id);
  }
  for (const r of await ctx.db
    .query("reviews")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()) {
    await ctx.db.delete(r._id);
  }
  for (const n of await ctx.db
    .query("notifications")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()) {
    await ctx.db.delete(n._id);
  }
  const user = await ctx.db.get(userId);
  if (user?.profileImageId) {
    await ctx.storage.delete(user.profileImageId);
  }
  await ctx.db.delete(userId);
}
