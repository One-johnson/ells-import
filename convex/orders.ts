import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { appSettingValue, parseNonNegativeCents } from "./lib/appSettings";
import { ensureInvoiceNumberForOrder } from "./lib/invoiceNumber";
import { allocatePublicCode } from "./lib/publicCode";
import { deletePaymentsForOrder, insertPayment } from "./lib/recordPayment";
import { notifyUserOrderStatusChanged } from "./lib/orderStatusNotification";
import { recalcOrderTotals } from "./lib/orderTotals";
import { requireAdmin, requireAuthed, resolveSession } from "./lib/sessionAuth";
import { userAvatarUrl } from "./lib/userAvatar";
import { orderStatus } from "./schema";

const address = v.object({
  name: v.string(),
  line1: v.string(),
  line2: v.optional(v.string()),
  city: v.string(),
  state: v.optional(v.string()),
  postalCode: v.string(),
  country: v.string(),
  phone: v.optional(v.string()),
});

export const myOrders = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit = 30 }) => {
    const a = await requireAuthed(ctx, sessionToken);
    return await ctx.db
      .query("orders")
      .withIndex("by_user_created", (q) => q.eq("userId", a.userId))
      .order("desc")
      .take(limit);
  },
});

export const list = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(orderStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, status, limit = 200 }) => {
    await requireAdmin(ctx, sessionToken);
    if (status !== undefined) {
      return await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(limit);
    }
    return await ctx.db.query("orders").order("desc").take(limit);
  },
});

export const listWithCustomers = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(orderStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, status, limit = 200 }) => {
    await requireAdmin(ctx, sessionToken);
    const rows =
      status !== undefined
        ? await ctx.db
            .query("orders")
            .withIndex("by_status", (q) => q.eq("status", status))
            .order("desc")
            .take(limit)
        : await ctx.db.query("orders").order("desc").take(limit);
    const out: {
      order: Doc<"orders">;
      customerEmail: string;
      customerName: string | undefined;
      customerAvatarUrl: string | null;
    }[] = [];
    for (const order of rows) {
      const u = await ctx.db.get(order.userId);
      const customerAvatarUrl = u ? await userAvatarUrl(ctx, u) : null;
      out.push({
        order,
        customerEmail: u?.email ?? "—",
        customerName: u?.name,
        customerAvatarUrl,
      });
    }
    return out;
  },
});

export const listForUser = query({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, userId, limit = 50 }) => {
    await requireAdmin(ctx, sessionToken);
    return await ctx.db
      .query("orders")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

export const get = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    return await ctx.db.get(orderId);
  },
});

export const getWithItems = query({
  args: {
    orderId: v.id("orders"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, sessionToken }) => {
    const a = await resolveSession(ctx, sessionToken);
    const order = await ctx.db.get(orderId);
    if (!order) {
      return null;
    }
    if (a === null) {
      return null;
    }
    if (a.userId !== order.userId && a.user.role !== "admin") {
      throw new Error("Forbidden");
    }
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    const latestPayment =
      payments.length === 0
        ? null
        : payments.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b));

    const customerDoc = await ctx.db.get(order.userId);
    const customer = customerDoc
      ? {
          email: customerDoc.email,
          name: customerDoc.name,
          avatarUrl: await userAvatarUrl(ctx, customerDoc),
        }
      : null;

    return { order, items, latestPayment, customer };
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    status: orderStatus,
    subtotalCents: v.number(),
    taxCents: v.number(),
    shippingCents: v.number(),
    totalCents: v.number(),
    currency: v.string(),
    shippingAddress: v.optional(address),
    billingAddress: v.optional(address),
    externalPaymentId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...fields }) => {
    await requireAdmin(ctx, sessionToken);
    const now = Date.now();
    const publicCode = await allocatePublicCode(ctx, "orders");
    const orderId = await ctx.db.insert("orders", {
      ...fields,
      publicCode,
      createdAt: now,
      updatedAt: now,
    });
    await ensureInvoiceNumberForOrder(ctx, orderId);
    const payDone =
      fields.status === "paid" ||
      fields.status === "shipped" ||
      fields.status === "delivered";
    await insertPayment(ctx, {
      orderId,
      userId: fields.userId,
      amountCents: fields.totalCents,
      currency: fields.currency,
      status: payDone ? "completed" : "pending",
      method: "manual",
    });
    return orderId;
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    orderId: v.id("orders"),
    status: v.optional(orderStatus),
    subtotalCents: v.optional(v.number()),
    taxCents: v.optional(v.number()),
    shippingCents: v.optional(v.number()),
    totalCents: v.optional(v.number()),
    shippingAddress: v.optional(address),
    billingAddress: v.optional(address),
    externalPaymentId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, orderId, ...rest }) => {
    await requireAdmin(ctx, sessionToken);
    const previous = await ctx.db.get(orderId);
    if (previous === null) {
      throw new Error("Order not found");
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, val] of Object.entries(rest)) {
      if (val !== undefined) {
        patch[k] = val;
      }
    }
    await ctx.db.patch(orderId, patch);
    await ensureInvoiceNumberForOrder(ctx, orderId);
    const nextStatus = rest.status;
    if (nextStatus !== undefined && nextStatus !== previous.status) {
      await notifyUserOrderStatusChanged(ctx, previous, nextStatus);
    }
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), orderId: v.id("orders") },
  handler: async (ctx, { sessionToken, orderId }) => {
    await requireAdmin(ctx, sessionToken);
    for (const line of await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect()) {
      await ctx.db.delete(line._id);
    }
    await deletePaymentsForOrder(ctx, orderId);
    await ctx.db.delete(orderId);
  },
});

async function completePendingPaymentsForOrder(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  status: Doc<"orders">["status"],
) {
  const shouldComplete =
    status === "paid" || status === "shipped" || status === "delivered";
  if (!shouldComplete) {
    return;
  }
  for (const p of await ctx.db
    .query("payments")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect()) {
    if (p.status === "pending") {
      await ctx.db.patch(p._id, { status: "completed" });
    }
  }
}

export const bulkSetStatus = mutation({
  args: {
    sessionToken: v.string(),
    orderIds: v.array(v.id("orders")),
    status: orderStatus,
  },
  handler: async (ctx, { sessionToken, orderIds, status }) => {
    await requireAdmin(ctx, sessionToken);
    const now = Date.now();
    for (const id of orderIds) {
      const previous = await ctx.db.get(id);
      if (previous === null) {
        continue;
      }
      await ctx.db.patch(id, { status, updatedAt: now });
      await completePendingPaymentsForOrder(ctx, id, status);
      await notifyUserOrderStatusChanged(ctx, previous, status);
      await ensureInvoiceNumberForOrder(ctx, id);
    }
    return { updated: orderIds.length };
  },
});

export const bulkRemove = mutation({
  args: { sessionToken: v.string(), orderIds: v.array(v.id("orders")) },
  handler: async (ctx, { sessionToken, orderIds }) => {
    await requireAdmin(ctx, sessionToken);
    for (const orderId of orderIds) {
      for (const line of await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", orderId))
        .collect()) {
        await ctx.db.delete(line._id);
      }
      await deletePaymentsForOrder(ctx, orderId);
      await ctx.db.delete(orderId);
    }
    return { removed: orderIds.length };
  },
});

export const checkoutFromCart = mutation({
  args: {
    sessionToken: v.string(),
    shippingAddress: address,
    billingAddress: v.optional(address),
    orderNotes: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, shippingAddress, billingAddress, orderNotes }) => {
    const { userId } = await requireAuthed(ctx, sessionToken);

    const channelRaw = (await appSettingValue(ctx, "checkout_payment_channel")) ?? "whatsapp";
    const checkoutChannel = channelRaw.toLowerCase() === "paystack" ? "paystack" : "whatsapp";
    if (checkoutChannel === "paystack") {
      throw new Error(
        "Card payment (Paystack) is not enabled yet. Set app setting checkout_payment_channel to whatsapp in Admin → Store settings, or contact the store.",
      );
    }

    const shippingCents = parseNonNegativeCents(await appSettingValue(ctx, "delivery_fee_cents"));
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!cart) {
      throw new Error("Cart is empty");
    }
    const lines = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .collect();
    if (lines.length === 0) {
      throw new Error("Cart is empty");
    }

    const now = Date.now();
    let subtotalCents = 0;
    const productSnapshots: {
      line: (typeof lines)[number];
      product: Doc<"products">;
    }[] = [];

    for (const line of lines) {
      const product = await ctx.db.get(line.productId);
      if (!product || product.status !== "active") {
        throw new Error(`Product no longer available: ${line.productId}`);
      }
      if (line.quantity > product.stock) {
        throw new Error(`Insufficient stock: ${product.name}`);
      }
      const lineTotal = line.quantity * product.priceCents;
      subtotalCents += lineTotal;
      productSnapshots.push({ line, product });
    }

    const taxCents = 0;
    const totalCents = subtotalCents + taxCents + shippingCents;
    const currency = productSnapshots[0]!.product.currency;

    const notesTrimmed = orderNotes?.trim();
    const notes =
      notesTrimmed && notesTrimmed.length > 0
        ? notesTrimmed.length > 4000
          ? notesTrimmed.slice(0, 4000)
          : notesTrimmed
        : undefined;

    const orderPublicCode = await allocatePublicCode(ctx, "orders");
    const orderId = await ctx.db.insert("orders", {
      userId,
      status: "pending",
      subtotalCents,
      taxCents,
      shippingCents,
      totalCents,
      currency,
      shippingAddress,
      billingAddress: billingAddress ?? shippingAddress,
      publicCode: orderPublicCode,
      notes,
      createdAt: now,
      updatedAt: now,
    });

    await insertPayment(ctx, {
      orderId,
      userId,
      amountCents: totalCents,
      currency,
      status: "pending",
      method: "whatsapp",
      note: "Awaiting payment — customer will confirm via WhatsApp",
    });

    for (const { line, product } of productSnapshots) {
      await ctx.db.insert("orderItems", {
        orderId,
        productId: product._id,
        productName: product.name,
        unitPriceCents: product.priceCents,
        unitCostCents: product.costPriceCents ?? 0,
        quantity: line.quantity,
        imageUrl: product.imageIds?.[0]
          ? (await ctx.storage.getUrl(product.imageIds[0])) ?? undefined
          : undefined,
      });
      await ctx.db.patch(product._id, {
        stock: product.stock - line.quantity,
        updatedAt: now,
      });
    }

    for (const line of lines) {
      await ctx.db.delete(line._id);
    }
    await ctx.db.patch(cart._id, { updatedAt: now });

    await ctx.db.insert("notifications", {
      userId,
      type: "order",
      title: "Order placed",
      body: `Order #${orderPublicCode} · ${(totalCents / 100).toFixed(2)} ${currency}. Complete payment via WhatsApp.`,
      dataJson: JSON.stringify({ orderId }),
      read: false,
      createdAt: now,
    });

    return orderId;
  },
});

export const setStatus = mutation({
  args: {
    sessionToken: v.string(),
    orderId: v.id("orders"),
    status: orderStatus,
  },
  handler: async (ctx, { sessionToken, orderId, status }) => {
    await requireAdmin(ctx, sessionToken);
    const previous = await ctx.db.get(orderId);
    if (previous === null) {
      throw new Error("Order not found");
    }
    await ctx.db.patch(orderId, { status, updatedAt: Date.now() });
    await completePendingPaymentsForOrder(ctx, orderId, status);
    await notifyUserOrderStatusChanged(ctx, previous, status);
    await ensureInvoiceNumberForOrder(ctx, orderId);
  },
});

export const recalcTotals = mutation({
  args: { sessionToken: v.string(), orderId: v.id("orders") },
  handler: async (ctx, { sessionToken, orderId }) => {
    await requireAdmin(ctx, sessionToken);
    await recalcOrderTotals(ctx, orderId);
  },
});

/** One-time / periodic backfill: assigns invoice numbers to paid/shipped/delivered orders that lack one. */
export const backfillInvoiceNumbers = mutation({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, limit = 150 }) => {
    await requireAdmin(ctx, sessionToken);
    let assigned = 0;
    const cap = Math.min(Math.max(1, limit), 500);
    const statuses = ["paid", "shipped", "delivered"] as const;
    outer: for (const status of statuses) {
      const rows = await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
      for (const o of rows) {
        if (assigned >= cap) {
          break outer;
        }
        if (o.invoiceNumber !== undefined) {
          continue;
        }
        await ensureInvoiceNumberForOrder(ctx, o._id);
        assigned++;
      }
    }
    return { assigned };
  },
});
