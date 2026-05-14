import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireAuthed, resolveSession } from "./lib/sessionAuth";

export const getMine = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    const a = await resolveSession(ctx, sessionToken);
    if (a === null) {
      return { cart: null as null, items: [] as const };
    }
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .unique();
    if (!cart) {
      return { cart: null as null, items: [] as const };
    }
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .collect();
    const withProduct = await Promise.all(
      items.map(async (line) => {
        const product = await ctx.db.get(line.productId);
        const thumbnailUrl = product?.imageIds?.[0]
          ? await ctx.storage.getUrl(product.imageIds[0])
          : null;
        return { ...line, product, thumbnailUrl };
      }),
    );
    return { cart, items: withProduct };
  },
});

export const getByUser = query({
  args: { sessionToken: v.string(), userId: v.id("users") },
  handler: async (ctx, { sessionToken, userId }) => {
    await requireAdmin(ctx, sessionToken);
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!cart) {
      return { cart: null, items: [] as const };
    }
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .collect();
    return { cart, items };
  },
});

export const ensureMyCart = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const { userId } = await requireAuthed(ctx, sessionToken);
    const existing = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      return existing._id;
    }
    return await ctx.db.insert("carts", {
      userId,
      updatedAt: Date.now(),
    });
  },
});

export const removeCart = mutation({
  args: { sessionToken: v.string(), cartId: v.id("carts") },
  handler: async (ctx, { sessionToken, cartId }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const cart = await ctx.db.get(cartId);
    if (cart === null) {
      return;
    }
    if (cart.userId !== a.userId && a.user.role !== "admin") {
      throw new Error("Forbidden");
    }
    for (const line of await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cartId))
      .collect()) {
      await ctx.db.delete(line._id);
    }
    await ctx.db.delete(cartId);
  },
});

export const addItem = mutation({
  args: {
    sessionToken: v.string(),
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, { sessionToken, productId, quantity }) => {
    if (quantity < 1) {
      throw new Error("Invalid quantity");
    }
    const { userId } = await requireAuthed(ctx, sessionToken);
    const product = await ctx.db.get(productId);
    if (!product || product.status !== "active") {
      throw new Error("Product unavailable");
    }
    const mode = product.fulfillmentMode ?? "in_stock";
    if (mode === "preorder") {
      if (!product.preorderRoundId) {
        throw new Error("Pre-order product is misconfigured.");
      }
      const round = await ctx.db.get(product.preorderRoundId);
      if (!round || round.status !== "open") {
        throw new Error("This pre-order round is closed; remove the item from your cart.");
      }
    } else if (product.stock < quantity) {
      throw new Error("Not enough stock");
    }
    let cart = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const now = Date.now();
    if (!cart) {
      const cartId = await ctx.db.insert("carts", { userId, updatedAt: now });
      cart = (await ctx.db.get(cartId))!;
    } else {
      await ctx.db.patch(cart._id, { updatedAt: now });
    }
    const existing = await ctx.db
      .query("cartItems")
      .withIndex("by_cart_product", (q) =>
        q.eq("cartId", cart!._id).eq("productId", productId),
      )
      .unique();
    if (existing) {
      const nextQty = existing.quantity + quantity;
      const mode = product.fulfillmentMode ?? "in_stock";
      if (mode === "preorder") {
        if (!product.preorderRoundId) {
          throw new Error("Pre-order product is misconfigured.");
        }
        const round = await ctx.db.get(product.preorderRoundId);
        if (!round || round.status !== "open") {
          throw new Error("This pre-order round is closed.");
        }
      } else if (product.stock < nextQty) {
        throw new Error("Not enough stock");
      }
      await ctx.db.patch(existing._id, { quantity: nextQty });
      return cart!._id;
    }
    await ctx.db.insert("cartItems", {
      cartId: cart!._id,
      productId,
      quantity,
    });
    return cart!._id;
  },
});

export const setLineQuantity = mutation({
  args: {
    sessionToken: v.string(),
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, { sessionToken, productId, quantity }) => {
    const { userId } = await requireAuthed(ctx, sessionToken);
    if (quantity < 1) {
      throw new Error("Use removeItem to clear a line");
    }
    const product = await ctx.db.get(productId);
    if (product === null) {
      throw new Error("Product not found");
    }
    const mode = product.fulfillmentMode ?? "in_stock";
    if (mode === "preorder") {
      if (!product.preorderRoundId) {
        throw new Error("Pre-order product is misconfigured.");
      }
      const round = await ctx.db.get(product.preorderRoundId);
      if (!round || round.status !== "open") {
        throw new Error("This pre-order round is closed.");
      }
    } else if (product.stock < quantity) {
      throw new Error("Not enough stock");
    }
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!cart) {
      throw new Error("Cart not found");
    }
    const line = await ctx.db
      .query("cartItems")
      .withIndex("by_cart_product", (q) =>
        q.eq("cartId", cart._id).eq("productId", productId),
      )
      .unique();
    if (!line) {
      throw new Error("Line not in cart");
    }
    await ctx.db.patch(line._id, { quantity });
    await ctx.db.patch(cart._id, { updatedAt: Date.now() });
  },
});

export const updateLine = mutation({
  args: {
    sessionToken: v.string(),
    lineId: v.id("cartItems"),
    quantity: v.number(),
  },
  handler: async (ctx, { sessionToken, lineId, quantity }) => {
    const a = await requireAuthed(ctx, sessionToken);
    if (quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }
    const line = await ctx.db.get(lineId);
    if (line === null) {
      throw new Error("Not found");
    }
    const cart = await ctx.db.get(line.cartId);
    if (cart === null || (cart.userId !== a.userId && a.user.role !== "admin")) {
      throw new Error("Forbidden");
    }
    const product = await ctx.db.get(line.productId);
    if (product) {
      const mode = product.fulfillmentMode ?? "in_stock";
      if (mode === "preorder") {
        if (product.preorderRoundId) {
          const round = await ctx.db.get(product.preorderRoundId);
          if (!round || round.status !== "open") {
            throw new Error("This pre-order round is closed.");
          }
        }
      } else if (product.stock < quantity) {
        throw new Error("Not enough stock");
      }
    }
    await ctx.db.patch(lineId, { quantity });
    await ctx.db.patch(cart._id, { updatedAt: Date.now() });
  },
});

export const removeItem = mutation({
  args: { sessionToken: v.string(), productId: v.id("products") },
  handler: async (ctx, { sessionToken, productId }) => {
    const { userId } = await requireAuthed(ctx, sessionToken);
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!cart) {
      return;
    }
    const line = await ctx.db
      .query("cartItems")
      .withIndex("by_cart_product", (q) =>
        q.eq("cartId", cart._id).eq("productId", productId),
      )
      .unique();
    if (line) {
      await ctx.db.delete(line._id);
    }
    await ctx.db.patch(cart._id, { updatedAt: Date.now() });
  },
});

export const removeLine = mutation({
  args: { sessionToken: v.string(), lineId: v.id("cartItems") },
  handler: async (ctx, { sessionToken, lineId }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const line = await ctx.db.get(lineId);
    if (line === null) {
      return;
    }
    const cart = await ctx.db.get(line.cartId);
    if (cart === null || (cart.userId !== a.userId && a.user.role !== "admin")) {
      throw new Error("Forbidden");
    }
    await ctx.db.delete(lineId);
    await ctx.db.patch(cart._id, { updatedAt: Date.now() });
  },
});

export const clear = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const { userId } = await requireAuthed(ctx, sessionToken);
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!cart) {
      return;
    }
    for (const line of await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .collect()) {
      await ctx.db.delete(line._id);
    }
    await ctx.db.patch(cart._id, { updatedAt: Date.now() });
  },
});

export const bulkSetLines = mutation({
  args: {
    sessionToken: v.string(),
    lines: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
      }),
    ),
  },
  handler: async (ctx, { sessionToken, lines }) => {
    const { userId } = await requireAuthed(ctx, sessionToken);
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!cart) {
      throw new Error("No cart; call ensureMyCart first");
    }
    const now = Date.now();
    for (const ex of await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .collect()) {
      await ctx.db.delete(ex._id);
    }
    for (const { productId, quantity } of lines) {
      if (quantity < 1) {
        continue;
      }
      const p = await ctx.db.get(productId);
      if (!p || p.status !== "active" || p.fulfillmentMode === "preorder") {
        throw new Error("Invalid line");
      }
      if (p.stock < quantity) {
        throw new Error("Invalid line");
      }
      await ctx.db.insert("cartItems", { cartId: cart._id, productId, quantity });
    }
    await ctx.db.patch(cart._id, { updatedAt: now });
  },
});

export const mergeGuestLines = mutation({
  args: {
    sessionToken: v.string(),
    lines: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
      }),
    ),
  },
  handler: async (ctx, { sessionToken, lines }) => {
    const { userId } = await requireAuthed(ctx, sessionToken);
    const now = Date.now();
    let cart = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!cart) {
      const cartId = await ctx.db.insert("carts", { userId, updatedAt: now });
      cart = (await ctx.db.get(cartId))!;
    } else {
      await ctx.db.patch(cart._id, { updatedAt: now });
    }

    const sliced = lines.slice(0, 200);
    for (const { productId, quantity } of sliced) {
      const q = Math.floor(quantity);
      if (q < 1) {
        continue;
      }
      const p = await ctx.db.get(productId);
      if (!p || p.status !== "active") {
        continue;
      }
      const existing = await ctx.db
        .query("cartItems")
        .withIndex("by_cart_product", (qi) =>
          qi.eq("cartId", cart!._id).eq("productId", productId),
        )
        .unique();
      const nextQty = (existing?.quantity ?? 0) + q;
      const mode = p.fulfillmentMode ?? "in_stock";
      if (mode === "preorder") {
        if (!p.preorderRoundId) {
          continue;
        }
        const round = await ctx.db.get(p.preorderRoundId);
        if (!round || round.status !== "open") {
          continue;
        }
      } else if (p.stock < nextQty) {
        // Cap to available stock instead of failing the entire merge.
        if (existing) {
          await ctx.db.patch(existing._id, { quantity: p.stock });
        } else if (p.stock > 0) {
          await ctx.db.insert("cartItems", { cartId: cart!._id, productId, quantity: p.stock });
        }
        continue;
      }
      if (existing) {
        await ctx.db.patch(existing._id, { quantity: nextQty });
      } else {
        await ctx.db.insert("cartItems", { cartId: cart!._id, productId, quantity: q });
      }
    }
    return { cartId: cart._id };
  },
});
