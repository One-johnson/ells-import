"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useStoreSettings } from "@/components/store-settings-provider";

export default function CheckoutPage() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const settings = useStoreSettings();
  const [placing, setPlacing] = useState(false);
  const navigatingToSuccessRef = useRef(false);
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [form, setForm] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: settings.defaultCountry,
    phone: "",
    whatsappNumber: "",
    email: "",
  });

  const cart = useQuery(api.carts.get, sessionToken ? { sessionToken } : "skip");
  const productIds = cart?.items?.map((i) => i.productId) ?? [];
  const products = useQuery(
    api.products.getByIds,
    productIds.length > 0 ? { productIds } : "skip"
  );
  const createOrder = useMutation(api.orders.create);
  const createPayment = useMutation(api.payments.create);
  const clearCart = useMutation(api.carts.clear);

  const productMap = new Map((products ?? []).map((p) => [p._id, p]));
  const isLoggedIn = !!sessionToken;
  const items = cart?.items ?? [];
  const hasItems = items.length > 0;

  const subtotalPesewas = items.reduce(
    (sum, i) => sum + i.priceSnapshot * i.quantity,
    0
  );
  const shippingPesewas =
    subtotalPesewas >= settings.freeShippingThresholdPesewas
      ? 0
      : settings.shippingFlatRatePesewas;
  const taxPesewas = Math.round(
    (subtotalPesewas * settings.taxRatePercent) / 100
  );
  const totalPesewas = subtotalPesewas + shippingPesewas + taxPesewas;

  useEffect(() => {
    if (navigatingToSuccessRef.current) return;
    if (isLoggedIn && !hasItems && cart !== undefined) {
      router.replace("/cart");
    }
  }, [isLoggedIn, hasItems, cart, router]);

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Checkout</h1>
        <p className="mt-2 text-muted-foreground">Sign in to checkout.</p>
        <Button asChild className="mt-4">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (cart === undefined || products === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!hasItems) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Checkout</h1>
        <p className="mt-2 text-muted-foreground">Your cart is empty.</p>
        <Button asChild className="mt-4">
          <Link href="/cart">View cart</Link>
        </Button>
      </div>
    );
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionToken || items.length === 0) return;
    const orderItems = items
      .map((item) => {
        const product = productMap.get(item.productId);
        if (!product) return null;
        return {
          productId: item.productId,
          quantity: item.quantity,
          priceSnapshot: item.priceSnapshot,
          name: product.name,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);

    if (orderItems.length !== items.length) {
      toast.error("Some items are no longer available. Please update your cart.");
      return;
    }

    if (orderType === "delivery" && (!form.line1.trim() || !form.city.trim() || !form.postalCode.trim() || !form.country.trim())) {
      toast.error("Please fill in required address fields for delivery (address, city, postal code, country).");
      return;
    }
    if (orderType === "delivery" && !form.phone.trim()) {
      toast.error("Please enter your phone number for delivery.");
      return;
    }

    setPlacing(true);
    try {
      const shippingAddress =
        orderType === "delivery" || (form.line1.trim() && form.city.trim() && form.postalCode.trim() && form.country.trim())
          ? {
              line1: form.line1.trim(),
              line2: form.line2.trim() || undefined,
              city: form.city.trim(),
              state: form.state.trim() || undefined,
              postalCode: form.postalCode.trim(),
              country: form.country.trim(),
              phone: form.phone.trim() || undefined,
              whatsappNumber: form.whatsappNumber.trim() || undefined,
              email: form.email.trim() || undefined,
            }
          : undefined;

      const orderId = await createOrder({
        sessionToken,
        items: orderItems,
        subtotal: subtotalPesewas,
        shipping: shippingPesewas,
        tax: taxPesewas,
        total: totalPesewas,
        orderType,
        shippingAddress,
      });
      await createPayment({
        sessionToken,
        orderId,
        amount: totalPesewas,
        currency: settings.currency,
        status: "pending",
      });
      const orderIdStr = String(orderId);
      navigatingToSuccessRef.current = true;
      if (typeof window !== "undefined") {
        sessionStorage.setItem("checkout_success_order_id", orderIdStr);
      }
      await clearCart({ sessionToken });
      toast.success("Order placed successfully.");
      router.replace(`/checkout/success?orderId=${encodeURIComponent(orderIdStr)}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to place order.";
      toast.error(message);
      setPlacing(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-6">
          <section>
            <h2 className="text-lg font-medium text-foreground">Order type</h2>
            <div className="mt-3 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="orderType"
                  checked={orderType === "delivery"}
                  onChange={() => setOrderType("delivery")}
                  className="size-4"
                />
                <span className="text-sm font-medium text-foreground">Delivery</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="orderType"
                  checked={orderType === "pickup"}
                  onChange={() => setOrderType("pickup")}
                  className="size-4"
                />
                <span className="text-sm font-medium text-foreground">Pickup</span>
              </label>
            </div>
          </section>
          <section>
            <h2 className="text-lg font-medium text-foreground">
              {orderType === "delivery" ? "Shipping address" : "Address (optional for pickup)"}
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="line1" className="text-sm font-medium text-foreground">
                  Address line 1 {orderType === "delivery" ? "*" : ""}
                </label>
                <input
                  id="line1"
                  required={orderType === "delivery"}
                  value={form.line1}
                  onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="line2" className="text-sm font-medium text-foreground">
                  Address line 2
                </label>
                <input
                  id="line2"
                  value={form.line2}
                  onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="city" className="text-sm font-medium text-foreground">
                  City {orderType === "delivery" ? "*" : ""}
                </label>
                <input
                  id="city"
                  required={orderType === "delivery"}
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="state" className="text-sm font-medium text-foreground">
                  State / Region
                </label>
                <input
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="postalCode" className="text-sm font-medium text-foreground">
                  Postal code {orderType === "delivery" ? "*" : ""}
                </label>
                <input
                  id="postalCode"
                  required={orderType === "delivery"}
                  value={form.postalCode}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="country" className="text-sm font-medium text-foreground">
                  Country {orderType === "delivery" ? "*" : ""}
                </label>
                <input
                  id="country"
                  required={orderType === "delivery"}
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="phone" className="text-sm font-medium text-foreground">
                  Phone {orderType === "delivery" ? "*" : ""}
                </label>
                <input
                  id="phone"
                  type="tel"
                  required={orderType === "delivery"}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. 0553301044"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="whatsappNumber" className="text-sm font-medium text-foreground">
                  WhatsApp number (optional)
                </label>
                <input
                  id="whatsappNumber"
                  type="tel"
                  value={form.whatsappNumber}
                  onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
                  placeholder="e.g. 0553301044"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email (optional)
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="shrink-0 lg:w-96">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold text-foreground">Order summary</h2>
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {items.map((item) => {
                const product = productMap.get(item.productId);
                if (!product) return null;
                return (
                  <li key={item.productId} className="flex gap-3 text-sm">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                      {product.images?.[0] ? (
                        <Image
                          src={product.images[0]}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ShoppingBag className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{product.name}</p>
                      <p className="text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.priceSnapshot / 100)}
                      </p>
                    </div>
                    <p className="shrink-0 font-medium text-foreground">
                      {formatCurrency((item.priceSnapshot * item.quantity) / 100)}
                    </p>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="font-medium text-foreground">{formatCurrency(subtotalPesewas / 100)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Shipping</dt>
                <dd className="font-medium text-foreground">
                  {shippingPesewas === 0 ? "Free" : formatCurrency(shippingPesewas / 100)}
                </dd>
              </div>
              {taxPesewas > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <dt>Tax</dt>
                  <dd className="font-medium text-foreground">{formatCurrency(taxPesewas / 100)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                <dt>Total</dt>
                <dd>{formatCurrency(totalPesewas / 100)}</dd>
              </div>
            </dl>
            <Button type="submit" className="mt-4 w-full" size="lg" disabled={placing}>
              {placing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Placing order…
                </>
              ) : (
                "Place order"
              )}
            </Button>
            <Button type="button" variant="outline" className="mt-2 w-full" asChild>
              <Link href="/cart">Back to cart</Link>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
