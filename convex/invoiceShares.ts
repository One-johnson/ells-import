import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireAdmin } from "./lib/sessionAuth";

function isInvoiceEligible(order: Doc<"orders">, latestPayment: Doc<"payments"> | null) {
  const statusOk = order.status === "paid" || order.status === "shipped" || order.status === "delivered";
  return Boolean(order.invoiceNumber) && statusOk && latestPayment?.status === "completed";
}

function base64Url(bytes: Uint8Array) {
  // Convert to base64 and make it URL-safe.
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]!);
  }
  const b64 = globalThis.btoa(s);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(byteLength = 24) {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function latestPaymentForOrder(
  ctx: Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">,
  orderId: Id<"orders">,
) {
  const payments: Doc<"payments">[] = await ctx.db
    .query("payments")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect();
  return payments.length === 0 ? null : payments.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b));
}

/**
 * Admin-only: creates a customer-shareable invoice link.
 * This revokes any previously active tokens for the same order (best-effort).
 */
export const createForOrder = mutation({
  args: { sessionToken: v.string(), orderId: v.id("orders") },
  handler: async (ctx, { sessionToken, orderId }) => {
    const a = await requireAdmin(ctx, sessionToken);
    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    const latestPayment = await latestPaymentForOrder(ctx, orderId);
    if (!isInvoiceEligible(order, latestPayment)) {
      throw new Error("Invoice is not available for sharing yet.");
    }

    // Revoke existing active tokens for this order (bounded).
    const now = Date.now();
    const existing = await ctx.db
      .query("invoiceShares")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .order("desc")
      .take(50);
    for (const row of existing) {
      if (row.revokedAt === undefined && row.expiresAt > now) {
        await ctx.db.patch(row._id, { revokedAt: now });
      }
    }

    const token = randomToken(24);
    const expiresAt = now + 1000 * 60 * 60 * 24 * 30; // 30 days
    await ctx.db.insert("invoiceShares", {
      token,
      orderId,
      customerId: order.userId,
      createdByAdminId: a.userId,
      expiresAt,
      createdAt: now,
    });
    return { token, expiresAt };
  },
});

/**
 * Public: resolves a token to invoice data (or null if invalid/expired/revoked).
 */
export const getInvoiceByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const row = await ctx.db
      .query("invoiceShares")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!row) {
      return null;
    }
    const now = Date.now();
    if (row.revokedAt !== undefined || row.expiresAt <= now) {
      return null;
    }

    const order = await ctx.db.get(row.orderId);
    if (!order) {
      return null;
    }
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", row.orderId))
      .collect();
    const latestPayment = await latestPaymentForOrder(ctx, row.orderId);

    // Enforce eligibility at read time too (prevents sharing drafts or unpaid orders).
    if (!isInvoiceEligible(order, latestPayment)) {
      return null;
    }

    return {
      order,
      items,
      latestPayment,
      share: { expiresAt: row.expiresAt },
    };
  },
});

