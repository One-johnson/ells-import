"use client";

import Link from "next/link";

import type { Doc } from "@convex/_generated/dataModel";
import type { PublicUser } from "@convex/lib/publicUser";
import { orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/components/admin/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buildOrderWhatsAppMessage } from "@/lib/order-whatsapp-message";
import { publicRef } from "@/lib/public-ref";
import { userDisplayInitials } from "@/lib/user-initials";
import { digitsOnlyForWaMe, whatsappMeUrl } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/formatPrice";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";

type Ship = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
};

export type AccountOrderDetailData = {
  order: Doc<"orders">;
  items: Doc<"orderItems">[];
  latestPayment: Doc<"payments"> | null;
  activePayment?: Doc<"payments"> | null;
  payments?: Doc<"payments">[];
  customer: {
    email: string;
    name?: string | null;
    avatarUrl: string | null;
  } | null;
};

export type AccountOrderStorefrontSettings = {
  whatsappNumber?: string | null;
  storeName?: string | null;
} | null | undefined;

type AccountOrderDetailViewProps = {
  data: AccountOrderDetailData;
  storefront: AccountOrderStorefrontSettings;
  user: PublicUser | null;
  /** When true, hides the page title and footer links (inline / collapsible). */
  embedded?: boolean;
};

export function AccountOrderDetailView({
  data,
  storefront,
  user,
  embedded = false,
}: AccountOrderDetailViewProps) {
  const { order, items, latestPayment, customer } = data;
  const payments = data.payments ?? [];
  const activePayment = data.activePayment ?? null;
  const pay = activePayment ?? latestPayment;
  const ship = order.shippingAddress as Ship | undefined;
  const displayEmail = customer?.email ?? user?.email ?? "";
  const displayName = customer?.name ?? user?.name;

  const waDigits = digitsOnlyForWaMe(storefront?.whatsappNumber ?? null);
  const customerName = ship?.name ?? displayName ?? displayEmail ?? "";
  const whatsappHref =
    waDigits && order.publicCode && pay
      ? whatsappMeUrl(
          waDigits,
          buildOrderWhatsAppMessage({
            orderPublicCode: order.publicCode,
            totalCents: pay.amountCents,
            currency: pay.currency,
            customerName,
            storeName: storefront?.storeName,
            amountLabel:
              pay.kind === "shipping"
                ? "Shipping (CBM)"
                : pay.kind === "items"
                  ? "Product total"
                  : undefined,
          }),
        )
      : null;

  const showPayOnWhatsApp = Boolean(whatsappHref) && pay?.status === "pending";
  const canDownloadInvoicePdf =
    Boolean(order.invoiceNumber) &&
    (order.status === "paid" || order.status === "shipped" || order.status === "delivered") &&
    (pay?.status === "completed" || latestPayment?.status === "completed");

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                {customer?.avatarUrl ? <AvatarImage src={customer.avatarUrl} alt="" /> : null}
                <AvatarFallback className="text-sm">
                  {userDisplayInitials(displayName, displayEmail || "?")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1">
                <p className="text-foreground truncate font-medium">{displayName || displayEmail}</p>
                {displayName ? (
                  <p className="text-muted-foreground truncate text-sm">{displayEmail}</p>
                ) : null}
                <p className="text-foreground text-xl font-semibold">
                  Order {order.publicCode ? `#${publicRef(order.publicCode)}` : ""}
                </p>
                <p className="text-muted-foreground text-sm">
                  {new Date(order.createdAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })} ·{" "}
                  {orderStatusLabel(order.status)}
                </p>
                {order.invoiceNumber ? (
                  <p className="text-muted-foreground text-sm tabular-nums">
                    Invoice #{publicRef(order.invoiceNumber)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="print:hidden">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild disabled={!canDownloadInvoicePdf}>
                <Link href={`/account/orders/${order._id}/invoice`}>Invoice PDF</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-10 shrink-0">
              {customer?.avatarUrl ? <AvatarImage src={customer.avatarUrl} alt="" /> : null}
              <AvatarFallback className="text-xs">
                {userDisplayInitials(displayName, displayEmail || "?")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <p className="text-foreground truncate text-sm font-medium">{displayName || displayEmail}</p>
              {order.invoiceNumber ? (
                <p className="text-foreground text-sm font-medium tabular-nums">
                  Invoice #{publicRef(order.invoiceNumber)}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Invoice # is assigned when payment is confirmed (Paid or beyond).
                </p>
              )}
            </div>
          </div>
          <div className="print:hidden flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-fit shrink-0"
              asChild
              disabled={!canDownloadInvoicePdf}
            >
              <Link href={`/account/orders/${order._id}/invoice`}>Invoice PDF</Link>
            </Button>
          </div>
        </div>
      )}

      {order.fulfillmentMode === "preorder" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pre-order (China → Ghana)</CardTitle>
            <CardDescription>
              You paid the product price at checkout. Shipping is calculated from total CBM after goods arrive in
              Ghana, then invoiced separately. Rounds close at the end of the 28th (UTC) each month.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-1 text-xs">
            <p>
              <span className="text-foreground font-medium">Current stage:</span>{" "}
              {(order.preorderStage ?? "awaiting_item_payment").replace(/_/g, " ")}
            </p>
            {order.shippingInvoicedAt ? (
              <p>
                Shipping invoiced {new Date(order.shippingInvoicedAt).toLocaleDateString()} ·{" "}
                {order.shippingPaidAt
                  ? `Paid ${new Date(order.shippingPaidAt).toLocaleDateString()}`
                  : "Shipping payment pending"}
              </p>
            ) : (
              <p>Shipping fee has not been invoiced yet.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {pay ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment</CardTitle>
            <CardDescription>
              {pay.status === "pending"
                ? "We’re waiting to confirm your payment."
                : `Status: ${paymentStatusLabel(pay.status)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-foreground font-semibold tabular-nums">
              {formatPrice(pay.amountCents, pay.currency)} ·{" "}
              <span className="text-muted-foreground font-normal">{paymentMethodLabel(pay.method)}</span>
              {pay.kind === "shipping" ? (
                <span className="text-muted-foreground block text-xs font-normal">Shipping (CBM)</span>
              ) : pay.kind === "items" ? (
                <span className="text-muted-foreground block text-xs font-normal">Product total</span>
              ) : null}
            </p>
            {showPayOnWhatsApp ? (
              <Button type="button" asChild className="w-full sm:w-auto">
                <a
                  href={whatsappHref!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <WhatsAppIcon branded={false} className="size-4 shrink-0 text-primary-foreground" />
                  Pay on WhatsApp
                </a>
              </Button>
            ) : null}
            {!waDigits && pay.status === "pending" ? (
              <p className="text-muted-foreground text-xs">
                Ask the store admin to set <span className="font-mono">whatsapp_number</span> in Store settings so this
                link appears.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {payments.length > 1 ? (
        <div className="text-muted-foreground space-y-1 text-xs">
          <p className="text-foreground font-medium">All payments</p>
          <ul className="list-inside list-disc">
            {payments.map((p) => (
              <li key={p._id}>
                {paymentStatusLabel(p.status)} · {formatPrice(p.amountCents, p.currency)}
                {p.kind === "shipping" ? " (shipping)" : p.kind === "items" ? " (products)" : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="bg-muted/30 rounded-lg border px-4 py-3 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{formatPrice(order.subtotalCents, order.currency)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">
            {order.fulfillmentMode === "preorder" ? "Shipping (after arrival)" : "Delivery"}
          </span>
          <span className="tabular-nums">
            {order.shippingCents > 0
              ? formatPrice(order.shippingCents, order.currency)
              : order.fulfillmentMode === "preorder"
                ? "Invoiced later (CBM)"
                : "—"}
          </span>
        </div>
        <div className="mt-2 flex justify-between gap-2 border-t pt-2 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatPrice(order.totalCents, order.currency)}</span>
        </div>
      </div>

      {order.notes ? (
        <div className="space-y-1 text-sm">
          <h2 className="text-foreground font-medium">Your notes</h2>
          <p className="text-muted-foreground whitespace-pre-line">{order.notes}</p>
        </div>
      ) : null}

      {ship ? (
        <div className="space-y-1 text-sm">
          <h2 className="text-foreground font-medium">Ship to</h2>
          <p className="whitespace-pre-line">
            {ship.name}
            {"\n"}
            {ship.line1}
            {ship.line2 ? `\n${ship.line2}` : ""}
            {"\n"}
            {ship.city}
            {ship.state ? `, ${ship.state}` : ""} {ship.postalCode}
            {"\n"}
            {ship.country}
            {ship.phone ? `\n${ship.phone}` : ""}
          </p>
        </div>
      ) : null}

      <div>
        <h2 className="text-foreground text-sm font-medium">Items</h2>
        <ul className="divide-y rounded-lg border mt-2" role="list">
          {items.map((row) => (
            <li key={row._id} className="flex gap-3 px-3 py-3 first:pt-3 last:pb-3">
              {row.imageUrl ? (
                // Order snapshots use arbitrary remote URLs; next/image would need remotePatterns per host.
                // eslint-disable-next-line @next/next/no-img-element -- dynamic storefront/storage URLs
                <img
                  src={row.imageUrl}
                  alt=""
                  className="bg-muted/30 h-16 w-16 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="bg-muted h-16 w-16 shrink-0 rounded-md" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-foreground font-medium">{row.productName}</p>
                <p className="text-muted-foreground text-sm">Qty {row.quantity}</p>
              </div>
              <p className="text-foreground shrink-0 text-sm font-medium tabular-nums">
                {formatPrice(row.unitPriceCents * row.quantity, order.currency)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {!embedded ? (
        <div className="text-muted-foreground flex flex-wrap gap-3 text-sm">
          <Link href="/account/orders" className="text-foreground font-medium underline-offset-4 hover:underline">
            All orders
          </Link>
          <Link href="/shop" className="text-foreground font-medium underline-offset-4 hover:underline">
            Shop
          </Link>
        </div>
      ) : null}
    </div>
  );
}
