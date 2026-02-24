"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";

const ADMIN_WHATSAPP = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER ?? "233553301044";
const PAYMENT_PHONE = process.env.NEXT_PUBLIC_PAYMENT_PHONE ?? "0553301044";
const PAYMENT_NAME = process.env.NEXT_PUBLIC_PAYMENT_NAME ?? "Prince Johnson";

function formatAddressShort(addr: { line1: string; city: string; country: string }) {
  return [addr.line1, addr.city, addr.country].join(", ");
}

function whatsappPayLink(
  orderRef: string,
  totalFormatted: string,
  orderType?: "delivery" | "pickup",
  shippingAddress?: { line1: string; city: string; country: string }
) {
  let text = `Order #${orderRef} - I've paid ${totalFormatted} via MTN / Vodafone Cash / AirtelTigo.`;
  if (orderType === "pickup") text += " Pickup.";
  else if (orderType === "delivery" && shippingAddress) text += ` Delivery to: ${formatAddressShort(shippingAddress)}`;
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const { sessionToken } = useAuth();
  const order = useQuery(
    api.orders.get,
    sessionToken && orderId
      ? { sessionToken, orderId: orderId as Id<"orders"> }
      : "skip"
  );
  const payments = useQuery(
    api.payments.list,
    sessionToken && orderId ? { sessionToken, orderId: orderId as Id<"orders"> } : "skip"
  );

  const isLoggedIn = !!sessionToken;

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Order</h1>
        <p className="mt-2 text-muted-foreground">Sign in to view this order.</p>
        <Button asChild className="mt-4">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (order === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Order not found</h1>
        <p className="mt-2 text-muted-foreground">This order may not exist or you don&apos;t have access.</p>
        <Button asChild className="mt-4">
          <Link href="/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  const payment = payments?.items?.[0];
  const orderRef = order.orderNumber ?? String(order._id).slice(-8);

  async function copyOrderRef() {
    try {
      await navigator.clipboard.writeText(orderRef);
      toast.success("Order reference copied!");
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to orders
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Order #{orderRef}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-muted-foreground hover:text-foreground" onClick={copyOrderRef}>
              <Copy className="size-3.5" />
              Copy reference
            </Button>
          </p>
        </div>
        <Badge variant="secondary" className="capitalize">
          {order.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="mt-8 space-y-6">
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <h2 className="border-b border-border px-4 py-3 font-medium text-foreground sm:px-6">
            Items
          </h2>
          <ul className="divide-y divide-border">
            {order.items.map((item) => (
              <li
                key={`${item.productId}-${item.quantity}`}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6"
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
          <dl className="border-t border-border px-4 py-3 sm:px-6 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd className="text-foreground">{formatCurrency(order.subtotal / 100)}</dd>
            </div>
            {order.shipping != null && order.shipping > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>Shipping</dt>
                <dd className="text-foreground">{formatCurrency(order.shipping / 100)}</dd>
              </div>
            )}
            {order.tax != null && order.tax > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>Tax</dt>
                <dd className="text-foreground">{formatCurrency(order.tax / 100)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
              <dt>Total</dt>
              <dd>{formatCurrency(order.total / 100)}</dd>
            </div>
          </dl>
        </section>

        {order.shippingAddress && (
          <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="font-medium text-foreground">Shipping address</h2>
            <address className="mt-2 text-sm text-muted-foreground not-italic">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 && (
                <br />
              )}
              {order.shippingAddress.line2}
              <br />
              {order.shippingAddress.city}
              {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
              {" "}
              {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country}
            </address>
          </section>
        )}

        {payment && (
          <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="font-medium text-foreground">Payment</h2>
            <p className="mt-1 text-sm text-muted-foreground capitalize">
              Status: {payment.status.replace("_", " ")}
            </p>
            {payment.status === "pending" && (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Pay <strong className="text-foreground">{formatCurrency(order.total / 100)}</strong> to <strong className="text-foreground">{PAYMENT_PHONE}</strong> ({PAYMENT_NAME}) via MTN Mobile Money, Vodafone Cash (Telecel), or AirtelTigo Money. Use <strong className="text-foreground">Order #{orderRef}</strong> as reference.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={copyOrderRef}>
                    <Copy className="mr-2 size-3.5" />
                    Copy reference
                  </Button>
                  <Button asChild size="sm">
                    <a href={whatsappPayLink(orderRef, formatCurrency(order.total / 100), order.orderType, order.shippingAddress)} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 size-4" />
                      Notify us on WhatsApp after payment
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
