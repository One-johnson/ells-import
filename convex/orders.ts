import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { appSettingValue, parseNonNegativeCents } from "./lib/appSettings";
import { ensureInvoiceNumberForOrder } from "./lib/invoiceNumber";
import { allocatePublicCode } from "./lib/publicCode";
import { deletePaymentsForOrder, insertPayment } from "./lib/recordPayment";
import { notifyUserOrderStatusChanged } from "./lib/orderStatusNotification";
import { recalcOrderTotals } from "./lib/orderTotals";
import {
  completeItemPaymentsForOrder,
  hasCompletedShippingPayment,
} from "./lib/preorderPayments";
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
    const sortedPayments = [...payments].sort((a, b) => b.createdAt - a.createdAt);
    const latestPayment =
      sortedPayments.length === 0
        ? null
        : sortedPayments.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b));
    const activePayment =
      sortedPayments.find(
        (p) => p.status === "pending" && (p.kind ?? "full") !== "shipping",
      ) ??
      sortedPayments.find((p) => p.status === "pending" && p.kind === "shipping") ??
      latestPayment;

    const customerDoc = await ctx.db.get(order.userId);
    const customer = customerDoc
      ? {
          email: customerDoc.email,
          name: customerDoc.name,
          avatarUrl: await userAvatarUrl(ctx, customerDoc),
        }
      : null;

    return { order, items, latestPayment, activePayment, payments: sortedPayments, customer };
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
      kind: "full",
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
      if (
        (status === "shipped" || status === "delivered") &&
        previous.fulfillmentMode === "preorder"
      ) {
        if (
          previous.shippingInvoicedAt === undefined ||
          previous.shippingCents <= 0 ||
          !(await hasCompletedShippingPayment(ctx, id))
        ) {
          throw new Error(
            `Order ${previous.publicCode ?? id}: pre-orders require CBM shipping to be invoiced and paid before dispatch.`,
          );
        }
      }
      await ctx.db.patch(id, { status, updatedAt: now });
      if (status === "paid" && previous.fulfillmentMode === "preorder" && previous.preorderRoundId) {
        const round = await ctx.db.get(previous.preorderRoundId);
        const nextStage =
          round?.status === "open" ? ("awaiting_round_close" as const) : ("round_closed" as const);
        await ctx.db.patch(id, { preorderStage: nextStage, updatedAt: Date.now() });
      }
      await completeItemPaymentsForOrder(ctx, id, status);
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

    const deliveryFeeCents = parseNonNegativeCents(await appSettingValue(ctx, "delivery_fee_cents"));
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
    const notesTrimmed = orderNotes?.trim();
    const notes =
      notesTrimmed && notesTrimmed.length > 0
        ? notesTrimmed.length > 4000
          ? notesTrimmed.slice(0, 4000)
          : notesTrimmed
        : undefined;

    type Snap = { line: (typeof lines)[number]; product: Doc<"products"> };
    const inStockSnaps: Snap[] = [];
    const preorderSnaps: Snap[] = [];

    for (const line of lines) {
      const product = await ctx.db.get(line.productId);
      if (!product || product.status !== "active") {
        throw new Error(`Product no longer available: ${line.productId}`);
      }
      const mode = product.fulfillmentMode ?? "in_stock";
      if (mode === "preorder") {
        if (!product.preorderRoundId) {
          throw new Error(`Pre-order product missing round: ${product.name}`);
        }
        const round = await ctx.db.get(product.preorderRoundId);
        if (!round || round.status !== "open") {
          throw new Error(
            `Pre-order round closed for “${product.name}”. Remove it from your cart or finish checkout before the deadline next month.`,
          );
        }
        preorderSnaps.push({ line, product });
      } else {
        if (line.quantity > product.stock) {
          throw new Error(`Insufficient stock: ${product.name}`);
        }
        inStockSnaps.push({ line, product });
      }
    }

    if (preorderSnaps.length > 0) {
      const rid = preorderSnaps[0]!.product.preorderRoundId!;
      for (const s of preorderSnaps) {
        if (s.product.preorderRoundId !== rid) {
          throw new Error("Pre-order cart mixes different monthly rounds. Check out in-stock items separately, or split pre-orders by round.");
        }
      }
    }

    const orderIds: Id<"orders">[] = [];

    async function placeSubset(
      snaps: Snap[],
      args: {
        fulfillmentMode: "in_stock" | "preorder";
        shippingCents: number;
        preorderRoundId?: Id<"preorderRounds">;
        paymentKind: "full" | "items";
        paymentNote: string;
        notifyTitle: string;
        notifyBody: (code: string) => string;
        decrementStock: boolean;
      },
    ) {
      if (snaps.length === 0) {
        return;
      }
      let subtotalCents = 0;
      for (const { line, product } of snaps) {
        subtotalCents += line.quantity * product.priceCents;
      }
      const taxCents = 0;
      const totalCents = subtotalCents + taxCents + args.shippingCents;
      const currency = snaps[0]!.product.currency;
      const orderPublicCode = await allocatePublicCode(ctx, "orders");
      const orderId = await ctx.db.insert("orders", {
        userId,
        status: "pending",
        subtotalCents,
        taxCents,
        shippingCents: args.shippingCents,
        totalCents,
        currency,
        shippingAddress,
        billingAddress: billingAddress ?? shippingAddress,
        publicCode: orderPublicCode,
        notes,
        fulfillmentMode: args.fulfillmentMode,
        preorderRoundId: args.preorderRoundId,
        preorderStage: args.fulfillmentMode === "preorder" ? "awaiting_item_payment" : undefined,
        createdAt: now,
        updatedAt: now,
      });

      const payAmount = args.paymentKind === "items" ? subtotalCents : totalCents;
      await insertPayment(ctx, {
        orderId,
        userId,
        amountCents: payAmount,
        currency,
        status: "pending",
        method: "whatsapp",
        kind: args.paymentKind,
        note: args.paymentNote,
      });

      for (const { line, product } of snaps) {
        const cbm = product.cbmPerUnit ?? 0;
        const lineCbm = cbm > 0 ? cbm * line.quantity : undefined;
        await ctx.db.insert("orderItems", {
          orderId,
          productId: product._id,
          productName: product.name,
          unitPriceCents: product.priceCents,
          unitCostCents: product.costPriceCents ?? 0,
          quantity: line.quantity,
          lineCbm,
          imageUrl: product.imageIds?.[0]
            ? (await ctx.storage.getUrl(product.imageIds[0])) ?? undefined
            : undefined,
        });
        if (args.decrementStock) {
          await ctx.db.patch(product._id, {
            stock: product.stock - line.quantity,
            updatedAt: now,
          });
        }
      }

      for (const { line } of snaps) {
        await ctx.db.delete(line._id);
      }
      orderIds.push(orderId);

      await ctx.db.insert("notifications", {
        userId,
        type: "order",
        title: args.notifyTitle,
        body: args.notifyBody(orderPublicCode),
        dataJson: JSON.stringify({ orderId }),
        read: false,
        createdAt: now,
      });
    }

    await placeSubset(inStockSnaps, {
      fulfillmentMode: "in_stock",
      shippingCents: deliveryFeeCents,
      paymentKind: "full",
      paymentNote: "Awaiting payment — customer will confirm via WhatsApp",
      notifyTitle: "Order placed",
      notifyBody: (code) =>
        `Order #${code} · ${((deliveryFeeCents + inStockSnaps.reduce((t, { line, product }) => t + line.quantity * product.priceCents, 0)) / 100).toFixed(2)} ${inStockSnaps[0]!.product.currency}. Complete payment via WhatsApp.`,
      decrementStock: true,
    });

    const preorderRoundId = preorderSnaps[0]?.product.preorderRoundId;
    await placeSubset(preorderSnaps, {
      fulfillmentMode: "preorder",
      shippingCents: 0,
      preorderRoundId,
      paymentKind: "items",
      paymentNote:
        "Pre-order: pay product total now (shipping from China billed later by CBM after arrival). WhatsApp to confirm.",
      notifyTitle: "Pre-order placed",
      notifyBody: (code) =>
        `Pre-order #${code} — product payment only. Shipping will be invoiced (CBM) after arrival in Ghana. Pay via WhatsApp.`,
      decrementStock: false,
    });

    await ctx.db.patch(cart._id, { updatedAt: now });

    return { orderIds };
  },
});

const preorderFulfillmentStage = v.union(
  v.literal("supplier_ordered"),
  v.literal("in_transit"),
  v.literal("arrived_gh"),
);

export const preorderSetFulfillmentStage = mutation({
  args: {
    sessionToken: v.string(),
    orderId: v.id("orders"),
    stage: preorderFulfillmentStage,
  },
  handler: async (ctx, { sessionToken, orderId, stage }) => {
    await requireAdmin(ctx, sessionToken);
    const order = await ctx.db.get(orderId);
    if (order === null || order.fulfillmentMode !== "preorder") {
      throw new Error("Not a pre-order");
    }
    const cur = order.preorderStage;
    const allowed: Partial<Record<NonNullable<typeof cur>, Record<string, boolean>>> = {
      awaiting_round_close: { supplier_ordered: true },
      round_closed: { supplier_ordered: true },
      supplier_ordered: { in_transit: true },
      in_transit: { arrived_gh: true },
    };
    if (!cur || !allowed[cur]?.[stage]) {
      throw new Error(`Cannot move pre-order from ${cur ?? "unknown"} to ${stage}`);
    }
    await ctx.db.patch(orderId, { preorderStage: stage, updatedAt: Date.now() });
  },
});

export const preorderInvoiceShipping = mutation({
  args: {
    sessionToken: v.string(),
    orderId: v.id("orders"),
    overrideShippingCents: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, orderId, overrideShippingCents }) => {
    await requireAdmin(ctx, sessionToken);
    const order = await ctx.db.get(orderId);
    if (order === null || order.fulfillmentMode !== "preorder") {
      throw new Error("Not a pre-order");
    }
    if (order.preorderStage !== "arrived_gh") {
      throw new Error("Set fulfillment to “Arrived in Ghana” before invoicing CBM shipping.");
    }
    const payRows = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    if (payRows.some((p) => p.kind === "shipping")) {
      throw new Error("Shipping payment row already exists.");
    }
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    let totalCbm = 0;
    for (const it of items) {
      totalCbm += it.lineCbm ?? 0;
    }
    const rateRaw = await appSettingValue(ctx, "preorder_shipping_cents_per_cbm");
    const rate = rateRaw ? parseNonNegativeCents(rateRaw) : 0;
    const shippingCents =
      overrideShippingCents !== undefined
        ? Math.max(0, Math.floor(overrideShippingCents))
        : Math.round(totalCbm * rate);
    if (shippingCents <= 0) {
      throw new Error(
        "Shipping fee is zero. Set app setting preorder_shipping_cents_per_cbm, ensure order lines have CBM, or pass overrideShippingCents.",
      );
    }
    const now = Date.now();
    await ctx.db.patch(orderId, {
      shippingCents,
      shippingInvoicedAt: now,
      preorderStage: "shipping_billed",
      updatedAt: now,
    });
    await recalcOrderTotals(ctx, orderId);
    const refreshed = (await ctx.db.get(orderId))!;
    await insertPayment(ctx, {
      orderId,
      userId: order.userId,
      amountCents: shippingCents,
      currency: refreshed.currency,
      status: "pending",
      method: "whatsapp",
      kind: "shipping",
      note: "Pre-order shipping (CBM) — pay before dispatch",
    });
    await ctx.db.insert("notifications", {
      userId: order.userId,
      type: "order",
      title: "Shipping fee to pay",
      body: refreshed.publicCode
        ? `Pre-order #${refreshed.publicCode}: shipping ${(shippingCents / 100).toFixed(2)} ${refreshed.currency} (CBM).`
        : `Your pre-order shipping ${(shippingCents / 100).toFixed(2)} ${refreshed.currency} is due.`,
      dataJson: JSON.stringify({ orderId }),
      read: false,
      createdAt: now,
    });
  },
});

export const preorderMarkShippingPaid = mutation({
  args: { sessionToken: v.string(), orderId: v.id("orders") },
  handler: async (ctx, { sessionToken, orderId }) => {
    await requireAdmin(ctx, sessionToken);
    const order = await ctx.db.get(orderId);
    if (order === null || order.fulfillmentMode !== "preorder") {
      throw new Error("Not a pre-order");
    }
    const pending = (
      await ctx.db
        .query("payments")
        .withIndex("by_order", (q) => q.eq("orderId", orderId))
        .collect()
    ).find((p) => p.kind === "shipping" && p.status === "pending");
    if (!pending) {
      throw new Error("No pending shipping payment.");
    }
    const now = Date.now();
    await ctx.db.patch(pending._id, { status: "completed" });
    await ctx.db.patch(orderId, {
      shippingPaidAt: now,
      preorderStage: "shipping_paid",
      updatedAt: now,
    });
    await ctx.db.insert("notifications", {
      userId: order.userId,
      type: "order",
      title: "Shipping payment received",
      body: order.publicCode
        ? `Pre-order #${order.publicCode}: we received your shipping payment. We’ll dispatch soon.`
        : "We received your pre-order shipping payment.",
      dataJson: JSON.stringify({ orderId }),
      read: false,
      createdAt: now,
    });
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
    if (
      (status === "shipped" || status === "delivered") &&
      previous.fulfillmentMode === "preorder"
    ) {
      if (
        previous.shippingInvoicedAt === undefined ||
        previous.shippingCents <= 0 ||
        !(await hasCompletedShippingPayment(ctx, orderId))
      ) {
        throw new Error(
          "Pre-order: invoice CBM shipping and confirm shipping payment before dispatch.",
        );
      }
    }
    await ctx.db.patch(orderId, { status, updatedAt: Date.now() });
    if (status === "paid" && previous.fulfillmentMode === "preorder" && previous.preorderRoundId) {
      const round = await ctx.db.get(previous.preorderRoundId);
      const nextStage =
        round?.status === "open" ? ("awaiting_round_close" as const) : ("round_closed" as const);
      await ctx.db.patch(orderId, { preorderStage: nextStage, updatedAt: Date.now() });
    }
    await completeItemPaymentsForOrder(ctx, orderId, status);
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
