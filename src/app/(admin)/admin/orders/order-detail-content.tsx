"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy, Trash2, Phone, MessageCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOrderStatusBadgeVariant, getPaymentStatusBadgeVariant } from "@/lib/order-status-badges";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

const PAYMENT_STATUSES = [
  "pending",
  "sent",
  "confirmed",
  "failed",
  "expired",
  "refunded",
] as const;

type Props = { orderId: Id<"orders">; onDeleted?: () => void };

export function AdminOrderDetailContent({ orderId, onDeleted }: Props) {
  const { sessionToken } = useAuth();
  const order = useQuery(
    api.orders.get,
    sessionToken ? { sessionToken, orderId } : "skip"
  );
  const paymentsResult = useQuery(
    api.payments.list,
    sessionToken ? { sessionToken, orderId } : "skip"
  );
  const customer = useQuery(
    api.users.get,
    sessionToken && order?.userId
      ? { sessionToken, userId: order.userId }
      : "skip"
  );

  const updateOrder = useMutation(api.orders.update);
  const updatePayment = useMutation(api.payments.update);
  const createNotification = useMutation(api.notifications.create);
  const removeOrder = useMutation(api.orders.remove);

  const payment = paymentsResult?.items?.[0];
  const [orderUpdating, setOrderUpdating] = useState(false);
  const [paymentUpdating, setPaymentUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleOrderStatusChange(newStatus: string) {
    if (!sessionToken) return;
    setOrderUpdating(true);
    try {
      await updateOrder({
        sessionToken,
        orderId,
        status: newStatus as (typeof ORDER_STATUSES)[number],
      });
      toast.success("Order status updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update order.");
    } finally {
      setOrderUpdating(false);
    }
  }

  async function handlePaymentStatusChange(newStatus: string) {
    if (!sessionToken || !payment) return;
    setPaymentUpdating(true);
    try {
      await updatePayment({
        sessionToken,
        paymentId: payment._id,
        status: newStatus as (typeof PAYMENT_STATUSES)[number],
      });
      if (newStatus === "confirmed" && order) {
        const orderRef = order.orderNumber ?? String(order._id).slice(-8);
        await createNotification({
          sessionToken,
          userId: order.userId,
          type: "payment",
          title: "Payment received",
          body: `Your payment for Order #${orderRef} has been confirmed.`,
          link: `/orders/${orderId}`,
        });
        toast.success("Payment confirmed and customer notified.");
      } else {
        toast.success("Payment status updated.");
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to update payment."
      );
    } finally {
      setPaymentUpdating(false);
    }
  }

  if (order === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        Order not found.
      </div>
    );
  }

  const orderRef = order.orderNumber ?? String(order._id).slice(-8);

  async function copyOrderRef() {
    try {
      await navigator.clipboard.writeText(orderRef);
      toast.success("Order number copied!");
    } catch {
      toast.error("Could not copy");
    }
  }

  async function handleDeleteOrder() {
    if (!sessionToken) return;
    if (!confirm("Delete this order? This will also remove the linked payment.")) return;
    setDeleting(true);
    try {
      await removeOrder({ sessionToken, orderId });
      toast.success("Order deleted.");
      onDeleted?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete order.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Order #{orderRef}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground" onClick={copyOrderRef}>
              <Copy className="size-3.5" />
              Copy order number
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-destructive hover:text-destructive" onClick={handleDeleteOrder} disabled={deleting}>
              <Trash2 className="size-3.5" />
              Delete order
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(order.createdAt).toLocaleDateString("en-GB", {
              dateStyle: "long",
            })}
            {order.orderType && (
              <> · <span className="capitalize">{order.orderType}</span></>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getOrderStatusBadgeVariant(order.status)} className="capitalize">
            {order.status.replace("_", " ")}
          </Badge>
          <span className="text-sm text-muted-foreground">Order status</span>
          <Select
            value={order.status}
            onValueChange={handleOrderStatusChange}
            disabled={orderUpdating}
          >
            <SelectTrigger className="w-[140px]">
              {orderUpdating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SelectValue />
              )}
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(customer || order.shippingAddress?.phone || order.shippingAddress?.whatsappNumber || order.shippingAddress?.email) && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-medium text-foreground">Customer</h3>
          {customer && (
            <p className="mt-1 text-sm text-foreground">{customer.name}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-4">
            {(order.shippingAddress?.phone ?? customer?.phone) && (
              <a
                href={`tel:${String(order.shippingAddress?.phone ?? customer?.phone).replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Phone className="size-4 shrink-0" />
                {order.shippingAddress?.phone ?? customer?.phone}
              </a>
            )}
            {(order.shippingAddress?.whatsappNumber ?? order.shippingAddress?.phone ?? customer?.phone) && (
              <a
                href={`https://wa.me/${String(order.shippingAddress?.whatsappNumber ?? order.shippingAddress?.phone ?? customer?.phone ?? "")
                  .replace(/\D/g, "")
                  .replace(/^0/, "233")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <MessageCircle className="size-4 shrink-0" />
                {order.shippingAddress?.whatsappNumber ?? order.shippingAddress?.phone ?? customer?.phone ?? ""}
              </a>
            )}
            {(order.shippingAddress?.email ?? customer?.email) && (
              <a
                href={`mailto:${order.shippingAddress?.email ?? customer?.email}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Mail className="size-4 shrink-0" />
                {order.shippingAddress?.email ?? customer?.email}
              </a>
            )}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <h3 className="border-b border-border px-4 py-3 font-medium text-foreground">
          Items
        </h3>
        <ul className="divide-y divide-border">
          {order.items.map((item) => (
            <li
              key={`${item.productId}-${item.quantity}`}
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="font-medium text-foreground">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.quantity} × {formatCurrency(item.priceSnapshot / 100)}
                </p>
              </div>
              <p className="font-medium text-foreground">
                {formatCurrency((item.priceSnapshot * item.quantity) / 100)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="border-t border-border px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <dt>Subtotal</dt>
            <dd className="text-foreground">
              {formatCurrency(order.subtotal / 100)}
            </dd>
          </div>
          {order.shipping != null && order.shipping > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <dt>Shipping</dt>
              <dd className="text-foreground">
                {formatCurrency(order.shipping / 100)}
              </dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
            <dt>Total</dt>
            <dd>{formatCurrency(order.total / 100)}</dd>
          </div>
        </dl>
      </section>

      {order.shippingAddress && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-medium text-foreground">Shipping address</h3>
          <address className="mt-2 text-sm text-muted-foreground not-italic">
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 && (
              <>
                <br />
                {order.shippingAddress.line2}
              </>
            )}
            <br />
            {order.shippingAddress.city}
            {order.shippingAddress.state &&
              `, ${order.shippingAddress.state}`}{" "}
            {order.shippingAddress.postalCode}
            <br />
            {order.shippingAddress.country}
          </address>
        </section>
      )}

      {payment && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-foreground">Payment</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatCurrency(payment.amount / 100)} {payment.currency}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getPaymentStatusBadgeVariant(payment.status)} className="capitalize">
                {payment.status.replace("_", " ")}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Payment status
              </span>
              <Select
                value={payment.status}
                onValueChange={handlePaymentStatusChange}
                disabled={paymentUpdating}
              >
                <SelectTrigger className="w-[130px]">
                  {paymentUpdating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {payment.notes && (
            <p className="mt-2 text-sm text-muted-foreground">
              Notes: {payment.notes}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
