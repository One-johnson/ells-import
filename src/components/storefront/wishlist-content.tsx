"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Heart, PackageX, ShoppingCart, Trash2 } from "lucide-react";

import { ConvexImage } from "@/components/convex-image";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WishlistPageSkeleton } from "@/components/storefront/wishlist-page-skeleton";
import { formatPrice } from "@/lib/formatPrice";
import { publicRef } from "@/lib/public-ref";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

function WishlistSectionLabel({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      className="text-muted-foreground scroll-mt-6 text-xs font-semibold tracking-wide uppercase"
    >
      {children}
    </p>
  );
}

function WishlistEmptyState() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col items-center px-6 py-14 text-center">
        <div className="bg-muted mb-5 flex size-14 items-center justify-center rounded-full">
          <Heart className="text-muted-foreground size-7 stroke-[1.25]" aria-hidden />
        </div>
        <h2 className="text-foreground text-lg font-semibold tracking-tight">Nothing saved yet</h2>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
          Tap the heart on a product to save it here. Come back anytime to add favorites to your cart.
        </p>
        <Button className="mt-8" asChild>
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

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
    return <WishlistPageSkeleton />;
  }

  if (rows === undefined) {
    return <WishlistPageSkeleton />;
  }

  if (rows.length === 0) {
    return <WishlistEmptyState />;
  }

  return (
    <section aria-labelledby="wishlist-saved-heading" className="space-y-3 sm:space-y-4">
      <WishlistSectionLabel id="wishlist-saved-heading">Saved items</WishlistSectionLabel>
      <p className="text-muted-foreground text-sm tabular-nums">
        {rows.length} saved {rows.length === 1 ? "item" : "items"}
      </p>
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5" role="list">
        {rows.map((row) => {
          const p = row.product;
          if (!p || p.status !== "active") {
            return (
              <li key={row._id} className="lg:col-span-2">
                <Card
                  className={cn(
                    "border-dashed bg-muted/30 shadow-none transition-colors",
                    "hover:bg-muted/40",
                  )}
                >
                  <CardContent className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:justify-between sm:gap-4 sm:p-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="bg-muted/80 flex size-11 shrink-0 items-center justify-center rounded-lg border">
                        <PackageX className="text-muted-foreground size-5" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="text-foreground text-sm font-medium">No longer available</p>
                        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                          This product was removed from the catalog. Remove it from your list to tidy up.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={!sessionToken || busyId === row.productId}
                      onClick={() => void onRemove(row.productId)}
                    >
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          }
          const thumb = row.thumbnailUrl;
          const busy = busyId === row.productId;
          const out = p.stock < 1;
          const href = `/products/${encodeURIComponent(p.slug)}`;

          return (
            <li key={row._id} className="flex min-h-0">
              <Card
                className={cn(
                  "flex h-full min-h-0 w-full flex-col overflow-hidden shadow-sm transition-[border-color,box-shadow]",
                  "hover:border-foreground/15 hover:shadow-md",
                )}
              >
                <CardContent className="flex flex-1 flex-col p-3 sm:p-5">
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-5 lg:flex-col lg:gap-4">
                    <Link
                      href={href}
                      className={cn(
                        "bg-muted/30 border-border group/img relative shrink-0 overflow-hidden rounded-xl border",
                        "aspect-square w-full max-w-[6.25rem] sm:max-w-[8.5rem]",
                        "lg:aspect-[4/3] lg:w-full lg:max-w-none",
                      )}
                      aria-label={`View ${p.name}`}
                    >
                      {thumb ? (
                        <ConvexImage
                          src={thumb}
                          alt=""
                          fill
                          className="object-cover transition duration-300 group-hover/img:scale-[1.03]"
                          sizes="(min-width: 1024px) 42vw, (min-width: 640px) 136px, 100px"
                        />
                      ) : (
                        <span className="text-muted-foreground flex h-full items-center justify-center text-xs">
                          No image
                        </span>
                      )}
                    </Link>

                    <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-3 sm:gap-4 lg:min-h-0">
                      <div className="min-w-0 space-y-1.5 sm:space-y-2">
                        <div className="flex flex-wrap items-start gap-2 gap-y-1">
                          <Link
                            href={href}
                            className="text-foreground line-clamp-2 text-sm leading-snug font-medium hover:underline sm:text-base"
                          >
                            {p.name}
                          </Link>
                          {out ? (
                            <Badge variant="muted" className="shrink-0 font-normal">
                              Out of stock
                            </Badge>
                          ) : null}
                        </div>
                        {p.publicCode ? (
                          <p className="text-muted-foreground font-mono text-xs tabular-nums">
                            Ref {publicRef(p.publicCode)}
                          </p>
                        ) : null}
                        <p className="text-foreground text-base font-semibold tabular-nums sm:text-lg">
                          {formatPrice(p.priceCents, p.currency)}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:flex-col lg:items-stretch">
                        <Button
                          type="button"
                          size="sm"
                          className="w-full gap-1.5 sm:w-auto lg:w-full"
                          disabled={out || !sessionToken || busy}
                          onClick={() => void onAddToCart(p._id, p.name, p.stock)}
                        >
                          <ShoppingCart className="size-4" aria-hidden />
                          Add to cart
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-muted-foreground w-full gap-1.5 border-dashed sm:w-auto lg:w-full"
                          disabled={!sessionToken || busy}
                          onClick={() => void onRemove(row.productId)}
                          aria-label={`Remove ${p.name} from wishlist`}
                        >
                          <Trash2 className="size-4" aria-hidden />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
