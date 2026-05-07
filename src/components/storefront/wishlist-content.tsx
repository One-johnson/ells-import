"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/formatPrice";
import { publicRef } from "@/lib/public-ref";
import { useAuth } from "@/providers/auth-provider";
import { AccountPageSkeleton } from "@/components/account/account-page-skeleton";
import { toast } from "sonner";

export function WishlistContent() {
  const { isLoading, isAuthenticated, sessionToken } = useAuth();
  const router = useRouter();
  const rows = useQuery(api.wishlist.listMine, sessionToken ? { sessionToken } : { sessionToken: undefined });
  const removeMut = useMutation(api.wishlist.remove);
  const addItem = useMutation(api.cart.addItem);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/wishlist")}`);
    }
  }, [isLoading, isAuthenticated, router]);

  const onRemove = useCallback(
    async (productId: Id<"products">) => {
      if (!sessionToken) {
        return;
      }
      setBusyId(productId);
      try {
        await removeMut({ sessionToken, productId });
        toast.success("Removed from wishlist");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not remove");
      } finally {
        setBusyId(null);
      }
    },
    [removeMut, sessionToken],
  );

  const onAddToCart = useCallback(
    async (productId: Id<"products">, name: string, stock: number) => {
      if (!sessionToken || stock < 1) {
        return;
      }
      setBusyId(productId);
      try {
        await addItem({ sessionToken, productId, quantity: 1 });
        toast.success("Added to cart", { description: name });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not add to cart");
      } finally {
        setBusyId(null);
      }
    },
    [addItem, sessionToken],
  );

  if (isLoading || !isAuthenticated) {
    return <AccountPageSkeleton />;
  }

  if (rows === undefined) {
    return <AccountPageSkeleton />;
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">Your wishlist is empty.</p>
        <Button asChild>
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-lg border" role="list">
      {rows.map((row) => {
        const p = row.product;
        if (!p || p.status !== "active") {
          return (
            <li key={row._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <p className="text-muted-foreground text-sm">Product no longer available · removed from catalog</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!sessionToken || busyId === row.productId}
                onClick={() => void onRemove(row.productId)}
              >
                Remove
              </Button>
            </li>
          );
        }
        const thumb = row.thumbnailUrl;
        const busy = busyId === row.productId;
        const out = p.stock < 1;
        return (
          <li key={row._id} className="flex flex-wrap gap-4 px-4 py-4 sm:flex-nowrap">
            <Link
              href={`/products/${encodeURIComponent(p.slug)}`}
              className="bg-muted/30 border-border relative h-24 w-24 shrink-0 overflow-hidden rounded-md border"
            >
              {thumb ? (
                <img src={thumb} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-muted-foreground flex h-full items-center justify-center text-xs">No image</span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/products/${encodeURIComponent(p.slug)}`}
                className="text-foreground font-medium hover:underline"
              >
                {p.name}
              </Link>
              {p.publicCode ? (
                <p className="text-muted-foreground font-mono text-xs tabular-nums">Ref {publicRef(p.publicCode)}</p>
              ) : null}
              <p className="text-foreground mt-1 text-sm font-semibold tabular-nums">
                {formatPrice(p.priceCents, p.currency)}
              </p>
              {out ? <p className="text-muted-foreground mt-1 text-xs">Out of stock</p> : null}
            </div>
            <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:flex-col">
              <Button
                type="button"
                size="sm"
                disabled={out || !sessionToken || busy}
                onClick={() => void onAddToCart(p._id, p.name, p.stock)}
              >
                Add to cart
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!sessionToken || busy}
                onClick={() => void onRemove(row.productId)}
              >
                Remove
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
