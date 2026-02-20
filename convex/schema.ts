import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * E-commerce schema with session-based auth (no JWT).
 * Pass sessionToken to queries/mutations; auth resolves via sessions table.
 */

// ─── Users (admin + customer) ─────────────────────────────────────────────
export const userRole = v.union(v.literal("admin"), v.literal("customer"));

export const users = defineTable({
  email: v.string(),
  name: v.string(),
  role: userRole,
  passwordHash: v.string(),
  image: v.optional(v.string()),
  phone: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_email", ["email"])
  .index("by_role", ["role"]);

// ─── Sessions (custom session-based auth) ─────────────────────────────────
export const sessions = defineTable({
  userId: v.id("users"),
  sessionId: v.string(),
  expiresAt: v.number(),
  userAgent: v.optional(v.string()),
  ip: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_session", ["sessionId"])
  .index("by_expires", ["expiresAt"]);

// ─── Categories ───────────────────────────────────────────────────────────
export const categories = defineTable({
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  image: v.optional(v.string()),
  sortOrder: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_slug", ["slug"])
  .index("by_sort", ["sortOrder"])
  .index("by_created", ["createdAt"]);

// ─── Products ─────────────────────────────────────────────────────────────
export const productStatus = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("archived"),
  v.literal("out_of_stock")
);

export const products = defineTable({
  name: v.string(),
  slug: v.string(),
  description: v.string(),
  price: v.number(),
  compareAtPrice: v.optional(v.number()),
  images: v.array(v.string()),
  status: productStatus,
  stock: v.number(),
  sku: v.optional(v.string()),
  categoryIds: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_slug", ["slug"])
  .index("by_status", ["status"])
  .index("by_status_created", ["status", "createdAt"])
  .index("by_sku", ["sku"]);

// ─── Carts ────────────────────────────────────────────────────────────────
export const cartItem = v.object({
  productId: v.id("products"),
  quantity: v.number(),
  priceSnapshot: v.number(),
});

export const carts = defineTable({
  userId: v.id("users"),
  items: v.array(cartItem),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"]);

// ─── Wishlists ────────────────────────────────────────────────────────────
export const wishlists = defineTable({
  userId: v.id("users"),
  productIds: v.array(v.id("products")),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"]);

// ─── Orders ───────────────────────────────────────────────────────────────
export const orderStatus = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("processing"),
  v.literal("shipped"),
  v.literal("delivered"),
  v.literal("cancelled"),
  v.literal("refunded")
);

export const orderItem = v.object({
  productId: v.id("products"),
  quantity: v.number(),
  priceSnapshot: v.number(),
  name: v.string(),
});

export const orders = defineTable({
  userId: v.id("users"),
  items: v.array(orderItem),
  subtotal: v.number(),
  shipping: v.optional(v.number()),
  tax: v.optional(v.number()),
  total: v.number(),
  status: orderStatus,
  paymentId: v.optional(v.id("payments")),
  shippingAddress: v.optional(
    v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(),
    })
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_created", ["userId", "createdAt"])
  .index("by_status", ["status"])
  .index("by_status_created", ["status", "createdAt"])
  .index("by_payment", ["paymentId"]);

// ─── Payments (WhatsApp-based) ────────────────────────────────────────────
export const paymentStatus = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("confirmed"),
  v.literal("failed"),
  v.literal("expired"),
  v.literal("refunded")
);

export const payments = defineTable({
  orderId: v.id("orders"),
  amount: v.number(),
  currency: v.string(),
  status: paymentStatus,
  whatsappThreadId: v.optional(v.string()),
  whatsappMessageId: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_order", ["orderId"])
  .index("by_status", ["status"])
  .index("by_status_created", ["status", "createdAt"]);

// ─── Reviews ──────────────────────────────────────────────────────────────
export const reviewStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected")
);

export const reviews = defineTable({
  userId: v.id("users"),
  productId: v.id("products"),
  orderId: v.optional(v.id("orders")),
  rating: v.number(),
  title: v.optional(v.string()),
  body: v.string(),
  status: reviewStatus,
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_product", ["productId"])
  .index("by_product_status_created", ["productId", "status", "createdAt"])
  .index("by_user", ["userId"])
  .index("by_status", ["status"]);

// ─── Notifications ───────────────────────────────────────────────────────
export const notificationType = v.union(
  v.literal("order"),
  v.literal("payment"),
  v.literal("review"),
  v.literal("promo"),
  v.literal("system")
);

export const notifications = defineTable({
  userId: v.id("users"),
  type: notificationType,
  title: v.string(),
  body: v.optional(v.string()),
  read: v.boolean(),
  link: v.optional(v.string()),
  metadata: v.optional(v.record(v.string(), v.any())),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_read_created", ["userId", "read", "createdAt"])
  .index("by_user_created", ["userId", "createdAt"]);

// ─── Schema export ────────────────────────────────────────────────────────
export default defineSchema({
  users,
  sessions,
  categories,
  products,
  carts,
  wishlists,
  orders,
  payments,
  reviews,
  notifications,
});
