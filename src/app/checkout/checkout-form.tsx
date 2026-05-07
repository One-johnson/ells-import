"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle } from "lucide-react";

import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";

import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CartPageSkeleton } from "@/components/storefront/cart-page-skeleton";
import { useAuth } from "@/providers/auth-provider";
import { formatPrice } from "@/lib/formatPrice";
import { readPaystackPublicKey } from "@/lib/paystack-config";
import { toast } from "sonner";

export function CheckoutForm() {
  const { isLoading, isAuthenticated, sessionToken } = useAuth();
  const router = useRouter();
  const storefront = useQuery(api.settings.storefrontSettings);
  const cart = useQuery(api.cart.getMine, sessionToken ? { sessionToken } : { sessionToken: undefined });
  const checkout = useMutation(api.orders.checkoutFromCart);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("GH");
  const [phone, setPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const paystackKeyPresent = readPaystackPublicKey() !== undefined;

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/checkout")}`);
    }
  }, [isLoading, isAuthenticated, router]);

  const subtotal = useMemo(() => {
    if (!cart?.items.length) {
      return { cents: 0, currency: "GHS" };
    }
    let t = 0;
    for (const line of cart.items) {
      if (!line.product) {
        continue;
      }
      t += line.product.priceCents * line.quantity;
    }
    return { cents: t, currency: cart.items[0]?.product?.currency ?? "GHS" };
  }, [cart?.items]);

  const deliveryFeeCents = storefront?.deliveryFeeCents ?? 0;
  const totalCents = subtotal.cents + deliveryFeeCents;
  const currency = subtotal.currency;

  const paystackMode = storefront?.checkoutPaymentChannel === "paystack";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionToken) {
      return;
    }
    if (paystackMode) {
      return;
    }
    setPending(true);
    try {
      const orderId = await checkout({
        sessionToken,
        shippingAddress: {
          name: name.trim(),
          line1: line1.trim(),
          line2: line2.trim() || undefined,
          city: city.trim(),
          state: state.trim() || undefined,
          postalCode: postalCode.trim(),
          country: country.trim(),
          phone: phone.trim() || undefined,
        },
        orderNotes: orderNotes.trim() || undefined,
      });
      toast.success("Order created", {
        description: "Open your order and send the WhatsApp message to pay.",
      });
      router.push(`/account/orders/${orderId}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setPending(false);
    }
  }

  if (isLoading || !isAuthenticated || !sessionToken) {
    return <CartPageSkeleton />;
  }

  if (cart === undefined || storefront === undefined) {
    return <CartPageSkeleton />;
  }

  if (cart.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your cart is empty</CardTitle>
          <CardDescription>Add something from the shop before checking out.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/shop">Browse the shop</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="space-y-6">
        <div>
          <h2 className="text-foreground text-sm font-semibold tracking-wide uppercase">Step 1 · Delivery</h2>
          <p className="text-muted-foreground mt-1 text-sm">Where we should send your order.</p>
        </div>

        {paystackMode ? (
          <div className="border-destructive/30 bg-destructive/5 flex gap-3 rounded-lg border px-4 py-3 text-sm">
            <AlertCircle className="text-destructive mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="text-foreground font-medium">Paystack is not wired up yet</p>
              <p className="text-muted-foreground">
                Checkout is blocked while <span className="font-mono">checkout_payment_channel</span> is set to{" "}
                <span className="font-mono">paystack</span>. In Admin → Store settings, set it to{" "}
                <span className="font-mono">whatsapp</span> until Paystack is implemented.
              </p>
              {!paystackKeyPresent ? (
                <p className="text-muted-foreground text-xs">
                  When you add Paystack, set <span className="font-mono">NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY</span> in this
                  app and the secret in Convex.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <form className="space-y-6" onSubmit={(e) => void onSubmit(e)}>
          <Card>

            <CardContent className="space-y-4 pt-6">
              <fieldset className="space-y-3">
                <legend className="sr-only">Shipping address</legend>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="ship-name">
                    Full name
                  </label>
                  <Input
                    id="ship-name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="ship-line1">
                    Address line 1
                  </label>
                  <Input
                    id="ship-line1"
                    name="line1"
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    required
                    autoComplete="address-line1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="ship-line2">
                    Address line 2
                  </label>
                  <Input
                    id="ship-line2"
                    name="line2"
                    value={line2}
                    onChange={(e) => setLine2(e.target.value)}
                    autoComplete="address-line2"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="ship-city">
                      City
                    </label>
                    <Input
                      id="ship-city"
                      name="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      autoComplete="address-level2"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="ship-state">
                      State / region
                    </label>
                    <Input
                      id="ship-state"
                      name="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      autoComplete="address-level1"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="ship-postal">
                      Postal code
                    </label>
                    <Input
                      id="ship-postal"
                      name="postalCode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      required
                      autoComplete="postal-code"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="ship-country">
                      Country (ISO)
                    </label>
                    <Input
                      id="ship-country"
                      name="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value.toUpperCase())}
                      required
                      maxLength={2}
                      className="uppercase"
                      autoComplete="country"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="ship-phone">
                    Phone <span className="text-muted-foreground font-normal">(recommended for delivery)</span>
                  </label>
                  <Input
                    id="ship-phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              </fieldset>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-foreground text-sm font-semibold tracking-wide uppercase">Step 2 · Notes</h2>
            <p className="text-muted-foreground mt-1 text-sm">Optional message for the seller (delivery timing, gate code, etc.).</p>
          </div>

          <Card>

            <CardContent className="pt-6">
              <Textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Anything we should know?"
                className="resize-y min-h-[100px]"
              />
            </CardContent>
          </Card>

          <div>
            <h2 className="text-foreground text-sm font-semibold tracking-wide uppercase">Step 3 · Payment</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Pay by Mobile Money or transfer, then confirm on WhatsApp. We’ll mark your order paid after we verify
              payment.
            </p>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <WhatsAppIcon className="size-5 shrink-0" />
                <CardTitle className="text-base">WhatsApp confirmation</CardTitle>
              </div>
              <CardDescription>
                After you place the order, open the order page and tap <strong>Pay on WhatsApp</strong> with a
                pre-filled message. Set the store WhatsApp number in Admin → Store settings (
                <span className="font-mono">whatsapp_number</span>).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {storefront.paymentInstructions ? (
                <div className="bg-background space-y-1 rounded-md border px-3 py-2">
                  <p className="text-foreground font-medium">Payment details</p>
                  <p className="text-muted-foreground whitespace-pre-line">{storefront.paymentInstructions}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Add <span className="font-mono">payment_instructions</span> in store settings (MoMo number, account
                  name, reference format).
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Paystack: keep <span className="font-mono">checkout_payment_channel</span> on{" "}
                <span className="font-mono">whatsapp</span> until the gateway is integrated; then switch to{" "}
                <span className="font-mono">paystack</span>.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || paystackMode}>
              {pending ? "Creating order…" : "Place order"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/cart">Back to cart</Link>
            </Button>
          </div>
        </form>
      </div>

      <aside className="lg:sticky lg:top-20">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-base">Summary</CardTitle>
            <CardDescription>{cart.items.length} line{cart.items.length === 1 ? "" : "s"}</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[min(60vh,28rem)] space-y-3 overflow-y-auto pt-4">
            <ul className="space-y-3 text-sm">
              {cart.items.map((line) => {
                const p = line.product;
                if (!p) {
                  return null;
                }
                return (
                  <li key={line._id} className="flex justify-between gap-3">
                    <span className="text-muted-foreground min-w-0">
                      <span className="text-foreground font-medium">{p.name}</span>
                      <span className="text-foreground/80"> ×{line.quantity}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatPrice(p.priceCents * line.quantity, p.currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
          <div className="bg-muted/20 space-y-2 border-t px-6 py-4 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatPrice(subtotal.cents, currency)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Delivery</span>
              <span className="tabular-nums">
                {deliveryFeeCents > 0 ? formatPrice(deliveryFeeCents, currency) : "—"}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">Tax not included yet.</p>
            <div className="flex justify-between gap-2 border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(totalCents, currency)}</span>
            </div>
          </div>
        </Card>
      </aside>
    </div>
  );
}
