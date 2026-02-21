import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { cartItem } from "./schema";

/** Get current user's cart. */
export const get = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    return await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
  },
});

/** Set full cart items (replace). */
export const setItems = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    items: v.array(cartItem),
  },
  handler: async (ctx, { sessionToken, items }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const existing = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { items, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("carts", { userId: user._id, items, updatedAt: now });
  },
});

/** Add or update item in cart. */
export const addItem = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    productId: v.id("products"),
    quantity: v.number(),
    priceSnapshot: v.number(),
  },
  handler: async (ctx, { sessionToken, productId, quantity, priceSnapshot }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    let cart = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const now = Date.now();
    const newItem = { productId, quantity, priceSnapshot };
    if (!cart) {
      return await ctx.db.insert("carts", { userId: user._id, items: [newItem], updatedAt: now });
    }
    const idx = cart.items.findIndex((i) => i.productId === productId);
    const items = [...cart.items];
    if (idx >= 0) items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity, priceSnapshot };
    else items.push(newItem);
    await ctx.db.patch(cart._id, { items, updatedAt: now });
    return cart._id;
  },
});

/** Update item quantity (remove if quantity <= 0). */
export const updateItemQuantity = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    productId: v.id("products"),
    quantity: v.number(),
    priceSnapshot: v.number(),
  },
  handler: async (ctx, { sessionToken, productId, quantity, priceSnapshot }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!cart) return null;
    if (quantity <= 0) {
      const items = cart.items.filter((i) => i.productId !== productId);
      await ctx.db.patch(cart._id, { items, updatedAt: Date.now() });
      return cart._id;
    }
    const idx = cart.items.findIndex((i) => i.productId === productId);
    const items = [...cart.items];
    if (idx >= 0) items[idx] = { productId, quantity, priceSnapshot };
    else items.push({ productId, quantity, priceSnapshot });
    await ctx.db.patch(cart._id, { items, updatedAt: Date.now() });
    return cart._id;
  },
});

/** Remove item from cart. */
export const removeItem = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    productId: v.id("products"),
  },
  handler: async (ctx, { sessionToken, productId }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!cart) return null;
    const items = cart.items.filter((i) => i.productId !== productId);
    await ctx.db.patch(cart._id, { items, updatedAt: Date.now() });
    return cart._id;
  },
});

/** Clear cart. */
export const clear = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!cart) return null;
    await ctx.db.patch(cart._id, { items: [], updatedAt: Date.now() });
    return cart._id;
  },
});
