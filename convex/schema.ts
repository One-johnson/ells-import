import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const addressFields = v.object({
  name: v.string(),
  line1: v.string(),
  line2: v.optional(v.string()),
  city: v.string(),
  state: v.optional(v.string()),
  postalCode: v.string(),
  country: v.string(),
  phone: v.optional(v.string()),
});

export const userRole = v.union(
  v.literal("admin"),
  v.literal("customer"),
);

export const productStatus = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("archived"),
);

export const orderStatus = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("paid"),
  v.literal("shipped"),
  v.literal("delivered"),
  v.literal("cancelled"),
  v.literal("refunded"),
);

export const conversationType = v.union(
  v.literal("support"),
  v.literal("direct"),
);

export const conversationStatus = v.union(
  v.literal("open"),
  v.literal("closed"),
);

export const notificationType = v.union(
  v.literal("order"),
  v.literal("promo"),
  v.literal("system"),
  v.literal("message"),
  v.literal("other"),
);

export const paymentStatus = v.union(
  v.literal("pending"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("refunded"),
);

export const paymentMethod = v.union(
  v.literal("checkout"),
  v.literal("manual"),
  v.literal("whatsapp"),
  v.literal("paystack"),
  v.literal("other"),
);

export default defineSchema({
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.optional(v.string()),
    /** Legacy / external URL; prefer `profileImageId` for uploads */
    image: v.optional(v.string()),
    profileImageId: v.optional(v.id("_storage")),
    role: userRole,
    emailVerified: v.optional(v.boolean()),
    lastSeenAt: v.optional(v.number()),
    /** Human-facing 6-digit reference (unique among users). */
    publicCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_public_code", ["publicCode"]),

  sessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    parentId: v.optional(v.id("categories")),
    sortOrder: v.number(),
    publicCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_parent", ["parentId"])
    .index("by_public_code", ["publicCode"]),

  products: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    sku: v.optional(v.string()),
    priceCents: v.number(),
    /** Amount paid to acquire one unit; selling price is `priceCents`. */
    costPriceCents: v.optional(v.number()),
    compareAtCents: v.optional(v.number()),
    currency: v.string(),
    imageIds: v.optional(v.array(v.id("_storage"))),
    status: productStatus,
    stock: v.number(),
    /** Baseline stock for progress bar (reset on restock). */
    initialStock: v.optional(v.number()),
    /** Denormalized helper for fast storefront filtering. */
    inStock: v.optional(v.boolean()),
    categoryId: v.optional(v.id("categories")),
    publicCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_category", ["categoryId"])
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_status_and_priceCents_and_createdAt", ["status", "priceCents", "createdAt"])
    .index("by_status_and_inStock_and_createdAt", ["status", "inStock", "createdAt"])
    .index(
      "by_status_and_inStock_and_priceCents_and_createdAt",
      ["status", "inStock", "priceCents", "createdAt"],
    )
    .index("by_category_and_status_and_createdAt", ["categoryId", "status", "createdAt"])
    .index(
      "by_category_and_status_and_priceCents_and_createdAt",
      ["categoryId", "status", "priceCents", "createdAt"],
    )
    .index(
      "by_category_and_status_and_inStock_and_createdAt",
      ["categoryId", "status", "inStock", "createdAt"],
    )
    .index(
      "by_category_and_status_and_inStock_and_priceCents_and_createdAt",
      ["categoryId", "status", "inStock", "priceCents", "createdAt"],
    )
    .index("by_public_code", ["publicCode"]),

  orders: defineTable({
    userId: v.id("users"),
    status: orderStatus,
    subtotalCents: v.number(),
    taxCents: v.number(),
    shippingCents: v.number(),
    totalCents: v.number(),
    currency: v.string(),
    shippingAddress: v.optional(addressFields),
    billingAddress: v.optional(addressFields),
    externalPaymentId: v.optional(v.string()),
    notes: v.optional(v.string()),
    publicCode: v.optional(v.string()),
    /** Unique 6-digit invoice number; assigned when order is paid/shipped/delivered (approved). */
    invoiceNumber: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_status", ["status"])
    .index("by_public_code", ["publicCode"])
    .index("by_invoice_number", ["invoiceNumber"]),

  payments: defineTable({
    publicCode: v.string(),
    orderId: v.id("orders"),
    userId: v.id("users"),
    amountCents: v.number(),
    currency: v.string(),
    status: paymentStatus,
    method: paymentMethod,
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_public_code", ["publicCode"])
    .index("by_order", ["orderId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    productName: v.string(),
    unitPriceCents: v.number(),
    /** Snapshot of product cost at time of order (per unit). */
    unitCostCents: v.optional(v.number()),
    quantity: v.number(),
    imageUrl: v.optional(v.string()),
  }).index("by_order", ["orderId"]),

  carts: defineTable({
    userId: v.id("users"),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  cartItems: defineTable({
    cartId: v.id("carts"),
    productId: v.id("products"),
    quantity: v.number(),
  })
    .index("by_cart", ["cartId"])
    .index("by_cart_product", ["cartId", "productId"]),

  reviews: defineTable({
    productId: v.id("products"),
    userId: v.id("users"),
    orderId: v.optional(v.id("orders")),
    rating: v.number(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_user", ["userId"])
    .index("by_user_product", ["userId", "productId"]),

  wishlistItems: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_product", ["userId", "productId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: notificationType,
    title: v.string(),
    body: v.optional(v.string()),
    dataJson: v.optional(v.string()),
    read: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"]),

  userSettings: defineTable({
    userId: v.id("users"),
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_user_key", ["userId", "key"]),

  appSettings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  conversations: defineTable({
    type: conversationType,
    status: conversationStatus,
    customerId: v.id("users"),
    subject: v.string(),
    assignedAdminId: v.optional(v.id("users")),
    lastMessageAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_customer", ["customerId"])
    .index("by_assigned", ["assignedAdminId"])
    .index("by_status", ["status"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(),
    read: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_time", ["conversationId", "createdAt"]),

  /**
   * Public, shareable invoice links (token-based).
   * These are intended for customer sharing without requiring login.
   */
  invoiceShares: defineTable({
    token: v.string(),
    orderId: v.id("orders"),
    customerId: v.id("users"),
    createdByAdminId: v.id("users"),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_order", ["orderId"])
    .index("by_customer", ["customerId"]),
});
