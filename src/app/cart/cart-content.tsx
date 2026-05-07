"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { CartPageSkeleton } from "@/components/storefront/cart-page-skeleton";
import { useAuth } from "@/providers/auth-provider";
import { formatPrice } from "@/lib/formatPrice";
import { toast } from "sonner";

export function CartContent() {
  const { isLoading, isAuthenticated, sessionToken } = useAuth();
  const router = useRouter();
  const data = useQuery(api.cart.getMine, sessionToken ? { sessionToken } : { sessionToken: undefined });
  const setLineQty = useMutation(api.cart.setLineQuantity);
  const removeItem = useMutation(api.cart.removeItem);
  const [busy, setBusy] = useState<Id<"products"> | null>(null);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/cart")}`);
    }
  }, [isLoading, isAuthenticated, router]);

  const subtotalCents = useMemo(() => {
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
  }, [data?.items]);

  const currency = data?.items[0]?.product?.currency ?? "GHS";

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

  if (isLoading || !isAuthenticated || !sessionToken) {
    return <CartPageSkeleton />;
  }

  if (data === undefined) {
    return <CartPageSkeleton />;
  }

  const items = data.items;
  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">Your cart is empty.</p>
        <Button asChild>
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y rounded-lg border" role="list">
        {items.map((line) => {
          const p = line.product;
          if (!p) {
            return null;
          }
          const thumb = line.thumbnailUrl ?? null;
          return (
            <li key={line._id} className="flex flex-col gap-3 px-4 py-4 first:pt-4 last:pb-4 sm:flex-row sm:items-center">
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
                <label className="text-muted-foreground sr-only" htmlFor={`qty-${line._id}`}>
                  Quantity
                </label>
                <input
                  id={`qty-${line._id}`}
                  type="number"
                  min={0}
                  max={p.stock}
                  value={line.quantity}
                  disabled={busy === p._id}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!Number.isNaN(n)) {
                      void onQty(p._id, n);
                    }
                  }}
                  className="border-input bg-background w-20 rounded-md border px-2 py-1.5 text-sm"
                />
                <p className="text-foreground w-24 text-right text-sm font-medium tabular-nums sm:w-28">
                  {formatPrice(p.priceCents * line.quantity, p.currency)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col items-start justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
        <p className="text-lg font-semibold">
          Subtotal:{" "}
          <span className="tabular-nums">
            {formatPrice(subtotalCents, items[0]?.product?.currency ?? currency)}
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
      </div>
    </div>
  );
}
