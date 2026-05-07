import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

function isInvoiceEligibleStatus(status: Doc<"orders">["status"]) {
  return status === "paid" || status === "shipped" || status === "delivered";
}

/**
 * Allocate a unique 6-digit numeric string (100000–999999) for `orders.invoiceNumber`.
 */
export async function allocateInvoiceNumber(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 64; attempt++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const hit = await ctx.db
      .query("orders")
      .withIndex("by_invoice_number", (q) => q.eq("invoiceNumber", code))
      .first();
    if (hit === null) {
      return code;
    }
  }
  throw new Error("Failed to allocate a unique invoice number");
}

/** Assigns `invoiceNumber` once the order is invoice-eligible (paid / shipped / delivered). */
export async function ensureInvoiceNumberForOrder(ctx: MutationCtx, orderId: Id<"orders">) {
  const order = await ctx.db.get(orderId);
  if (!order || order.invoiceNumber !== undefined) {
    return;
  }
  if (!isInvoiceEligibleStatus(order.status)) {
    return;
  }
  const invoiceNumber = await allocateInvoiceNumber(ctx);
  await ctx.db.patch(orderId, {
    invoiceNumber,
    updatedAt: Date.now(),
  });
}
