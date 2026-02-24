"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { useStoreSettings } from "@/components/store-settings-provider";

const STORAGE_KEY = "checkout_success_order_id";

function formatAddressShort(addr: { line1: string; city: string; country: string; line2?: string; state?: string; postalCode?: string }): string {
  const parts = [addr.line1, addr.city, addr.country].filter(Boolean);
  return parts.join(", ");
}

function whatsappPayLink(
  adminWhatsApp: string,
  orderRef: string,
  totalFormatted?: string,
  orderType?: "delivery" | "pickup",
  shippingAddress?: { line1: string; city: string; country: string; line2?: string; state?: string; postalCode?: string }
) {
  const num = adminWhatsApp.replace(/\D/g, "").replace(/^0/, "233");
  let text = totalFormatted
    ? `Order #${orderRef} - I've paid ${totalFormatted} via MTN / Vodafone Cash / AirtelTigo.`
    : `Order #${orderRef} - I've paid. [Add amount and method when sending]`;
  if (orderType === "pickup") {
    text += " Pickup.";
  } else if (orderType === "delivery" && shippingAddress) {
    text += ` Delivery to: ${formatAddressShort(shippingAddress)}`;
  }
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderIdFromUrl = searchParams.get("orderId");
  const [storedOrderId, setStoredOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      setStoredOrderId(stored);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const orderIdParam = orderIdFromUrl ?? storedOrderId;
  const { sessionToken } = useAuth();
  const order = useQuery(
    api.orders.get,
    sessionToken && orderIdParam
      ? { sessionToken, orderId: orderIdParam as Id<"orders"> }
      : "skip"
  );

  if (!sessionToken) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Order confirmation</h1>
        <p className="mt-2 text-muted-foreground">Sign in to view your order.</p>
        <Button asChild className="mt-4">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!orderIdParam) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Order confirmation</h1>
        <p className="mt-2 text-muted-foreground">No order specified.</p>
        <Button asChild className="mt-4">
          <Link href="/orders">View orders</Link>
        </Button>
      </div>
    );
  }

  if (order === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-muted-foreground">Loading order details…</p>
      </div>
    );
  }

  const orderRef =
    order?.orderNumber ?? (order ? String(order._id) : String(orderIdParam)).slice(-8);
  const totalFormatted = order ? formatCurrency(order.total / 100) : null;
  const payLink = whatsappPayLink(
    settings.adminWhatsApp,
    orderRef,
    totalFormatted ?? undefined,
    order?.orderType,
    order?.shippingAddress
  );

  async function copyOrderRef() {
    try {
      await navigator.clipboard.writeText(orderRef);
      toast.success("Order reference copied!");
    } catch {
      toast.error("Could not copy");
    }
  }

  const paymentInstructionsBlock = (
    <div className="mt-6 rounded-xl border border-border bg-card p-4 text-left">
      <h2 className="font-medium text-foreground">Complete your payment</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Pay to <strong className="text-foreground">{settings.paymentPhone}</strong> ({settings.paymentName})
      </p>
      <ol className="mt-2 list-decimal list-inside space-y-1 text-sm text-muted-foreground">
        <li>
          Pay
          {totalFormatted ? (
            <> <strong className="text-foreground">{totalFormatted}</strong> via </>
          ) : (
            " via "
          )}
          <strong className="text-foreground">MTN Mobile Money</strong>,{" "}
          <strong className="text-foreground">Vodafone Cash (Telecel)</strong>, or{" "}
          <strong className="text-foreground">AirtelTigo Money</strong> (*170# or your MoMo app).
        </li>
        <li>
          Use <strong className="text-foreground">Order #{orderRef}</strong> as the reference.{" "}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground -ml-1"
            onClick={copyOrderRef}
          >
            <Copy className="size-3.5" />
            Copy
          </Button>
        </li>
        <li>After paying, tap the button below to notify us on WhatsApp.</li>
      </ol>
      <Button asChild className="mt-4 w-full sm:w-auto" size="lg">
        <a href={payLink} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="mr-2 size-4" />
          Notify us on WhatsApp after payment
        </a>
      </Button>
    </div>
  );

  if (order === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 text-center">
        <CheckCircle2 className="mx-auto size-16 text-emerald-600 dark:text-emerald-500" />
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Order placed</h1>
        <p className="mt-2 text-muted-foreground">
          Use the instructions below to complete payment and notify us.
        </p>
        <div className="mt-6 rounded-xl border border-border bg-card p-4 text-left">
          <p className="text-sm text-muted-foreground">Order reference</p>
          <p className="text-xl font-semibold text-foreground">Order #{orderRef}</p>
        </div>
        {paymentInstructionsBlock}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={`/orders/${orderIdParam}`}>View order</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/shop">Continue shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 text-center">
      <CheckCircle2 className="mx-auto size-16 text-emerald-600 dark:text-emerald-500" />
      <h1 className="mt-4 text-2xl font-semibold text-foreground">Order confirmed</h1>
      <p className="mt-2 text-muted-foreground">
        Thank you for your order. Complete payment below, then notify us on WhatsApp.
      </p>
      <div className="mt-6 rounded-xl border border-border bg-card p-4 text-left">
        <p className="text-sm text-muted-foreground">Order total</p>
        <p className="text-xl font-semibold text-foreground">{totalFormatted}</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {order.items.length} item{order.items.length !== 1 ? "s" : ""} · Order #{orderRef}
          <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-1 text-muted-foreground hover:text-foreground" onClick={copyOrderRef}>
            <Copy className="size-3" />
            Copy
          </Button>
        </p>
      </div>
      {paymentInstructionsBlock}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href={`/orders/${orderIdParam}`}>View order</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
