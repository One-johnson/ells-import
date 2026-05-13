"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Package } from "lucide-react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CartFloatingCheckout } from "@/components/storefront/cart-floating-checkout";
import { CartPageSkeleton } from "@/components/storefront/cart-page-skeleton";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { useAuth } from "@/providers/auth-provider";
import { useGuestCart } from "@/providers/guest-cart-provider";
import { formatPrice } from "@/lib/formatPrice";
import { setGuestCartItemQuantity } from "@/lib/guestCart";
import { toast } from "sonner";

function CartEmptyState() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col items-center px-6 py-14 text-center">
        <div className="bg-muted mb-5 flex size-14 items-center justify-center rounded-full">
          <Package className="text-muted-foreground size-7" aria-hidden />
        </div>
        <h2 className="text-foreground text-lg font-semibold tracking-tight">Your cart is empty</h2>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
          Browse the shop and add products here when you&apos;re ready to check out.
        </p>
        <Button className="mt-8" asChild>
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function CartContent() {
  const { isLoading, isAuthenticated, sessionToken } = useAuth();
  const guest = useGuestCart();
  const data = useQuery(api.cart.getMine, sessionToken ? { sessionToken } : { sessionToken: undefined });
  const guestProducts = useQuery(
    api.products.getManyForCart,
    guest.lines.length > 0
      ? { productIds: guest.lines.map((l) => l.productId as Id<"products">) }
      : { productIds: [] },
  );
  const setLineQty = useMutation(api.cart.setLineQuantity);
  const removeItem = useMutation(api.cart.removeItem);
  const [busy, setBusy] = useState<Id<"products"> | null>(null);

  const isGuestMode = !isAuthenticated || !sessionToken;

  const subtotalCents = useMemo(() => {
    if (isGuestMode) {
      if (!guestProducts || guest.lines.length === 0) {
        return 0;
      }
      const byId = new Map(guestProducts.map((p) => [p._id, p]));
      let t = 0;
      for (const line of guest.lines) {
        const p = byId.get(line.productId as Id<"products">);
        if (!p || p.status !== "active") continue;
        t += p.priceCents * line.quantity;
      }
      return t;
    }
    if (!data?.items.length) {
      return 0;
    }
    let t = 0;
    for (const line of data.items) {
      if (!line.product) {
        continue;
      }
      t += line.product.priceCents * line.quantity;
    }
    return t;
  }, [data, guest.lines, guestProducts, isGuestMode]);

  const currency = isGuestMode
    ? guestProducts?.[0]?.currency ?? "GHS"
    : data?.items[0]?.product?.currency ?? "GHS";

  const onQty = useCallback(
    async (productId: Id<"products">, quantity: number) => {
      if (!sessionToken) {
        return;
      }
      setBusy(productId);
      try {
        if (quantity < 1) {
          await removeItem({ sessionToken, productId });
        } else {
          await setLineQty({ sessionToken, productId, quantity });
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update cart");
      } finally {
        setBusy(null);
      }
    },
    [sessionToken, setLineQty, removeItem],
  );

  if (isLoading) {
    return <CartPageSkeleton />;
  }

  if (!isGuestMode && data === undefined) {
    return <CartPageSkeleton />;
  }

  if (isGuestMode) {
    const lines = guest.lines;
    if (lines.length === 0) {
      return <CartEmptyState />;
    }
    if (guestProducts === undefined) {
      return <CartPageSkeleton />;
    }
    const byId = new Map(guestProducts.map((p) => [p._id, p]));
    const visible = lines
      .map((l) => ({ line: l, product: byId.get(l.productId as Id<"products">) ?? null }))
      .filter((x) => x.product && x.product.status === "active");
    if (visible.length === 0) {
      return <CartEmptyState />;
    }
    const guestCurrency = visible[0]!.product!.currency;
    const itemCount = visible.length;
    return (
      <>
        <div className="space-y-4 pb-36 md:pb-0">
        <Card className="border-muted/80 bg-muted/20 shadow-sm">
          <CardContent className="px-4 py-3 text-sm">
            <p className="font-medium">You&apos;re shopping as a guest</p>
            <p className="text-muted-foreground mt-1">
              Sign in to save your cart and continue to checkout.
            </p>
          </CardContent>
        </Card>
        <p className="text-muted-foreground text-sm tabular-nums">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <ul className="divide-border divide-y" role="list">
              {visible.map(({ line, product }) => {
                const p = product!;
                return (
                  <li
                    key={line.productId}
                    className="flex flex-col gap-3 px-4 py-4 first:pt-4 last:pb-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
                      {p.thumbnailUrl ? (
                        <img
                          src={p.thumbnailUrl}
                          alt=""
                          className="bg-muted/30 h-20 w-20 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="bg-muted h-20 w-20 shrink-0 rounded-md" />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/products/${encodeURIComponent(p.slug)}`}
                          className="text-foreground font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        <p className="text-muted-foreground text-sm tabular-nums">
                          {formatPrice(p.priceCents, p.currency)} each
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                      <QuantityStepper
                        value={line.quantity}
                        min={0}
                        max={p.stock}
                        onChange={(n) => setGuestCartItemQuantity(line.productId, n)}
                      />
                      <p className="text-foreground w-24 text-right text-sm font-medium tabular-nums sm:w-28">
                        {formatPrice(p.priceCents * line.quantity, p.currency)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
        <Card className="hidden shadow-sm md:block">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg font-semibold">
              Subtotal: <span className="tabular-nums">{formatPrice(subtotalCents, guestCurrency)}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/shop">Keep shopping</Link>
              </Button>
              <Button asChild>
                <Link href={`/login?next=${encodeURIComponent("/checkout")}`}>Sign in to checkout</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
        <CartFloatingCheckout
          subtotalCents={subtotalCents}
          currency={guestCurrency}
          checkoutHref={`/login?next=${encodeURIComponent("/checkout")}`}
          checkoutLabel="Sign in to checkout"
        />
      </>
    );
  }

  const items = data!.items;
  if (items.length === 0) {
    return <CartEmptyState />;
  }

  const itemCount = items.filter((l) => l.product).length;
  const checkoutCurrency = items[0]?.product?.currency ?? currency;
  return (
    <>
      <div className="space-y-4 pb-36 md:pb-0">
      {itemCount > 0 ? (
        <p className="text-muted-foreground text-sm tabular-nums">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
      ) : null}
      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <ul className="divide-border divide-y" role="list">
            {items.map((line) => {
              const p = line.product;
              if (!p) {
                return null;
              }
              const thumb = line.thumbnailUrl ?? null;
              return (
                <li
                  key={line._id}
                  className="flex flex-col gap-3 px-4 py-4 first:pt-4 last:pb-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="bg-muted/30 h-20 w-20 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="bg-muted h-20 w-20 shrink-0 rounded-md" />
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/products/${encodeURIComponent(p.slug)}`}
                        className="text-foreground font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                      <p className="text-muted-foreground text-sm tabular-nums">
                        {formatPrice(p.priceCents, p.currency)} each
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                    <QuantityStepper
                      value={line.quantity}
                      min={0}
                      max={p.stock}
                      disabled={busy === p._id}
                      onChange={(n) => void onQty(p._id, n)}
                    />
                    <p className="text-foreground w-24 text-right text-sm font-medium tabular-nums sm:w-28">
                      {formatPrice(p.priceCents * line.quantity, p.currency)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
      <Card className="hidden shadow-sm md:block">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg font-semibold">
            Subtotal:{" "}
            <span className="tabular-nums">
              {formatPrice(subtotalCents, checkoutCurrency)}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/shop">Keep shopping</Link>
            </Button>
            <Button asChild>
              <Link href="/checkout">Checkout</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
      <CartFloatingCheckout
        subtotalCents={subtotalCents}
        currency={checkoutCurrency}
        checkoutHref="/checkout"
        checkoutLabel="Checkout"
      />
    </>
  );
}
