"use client";

import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexImage } from "@/components/convex-image";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/formatPrice";
import { addGuestCartItem } from "@/lib/guestCart";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { ProductQuickViewDrawer } from "@/components/storefront/product-quick-view-drawer";

export type ProductCardProduct = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  priceCents: number;
  currency: string;
  stock: number;
  initialStock?: number;
  thumbnailUrl?: string | null;
  publicCode?: string;
};

type ProductCardProps = {
  product: ProductCardProduct;
  className?: string;
};

export function ProductCard({ product, className }: ProductCardProps) {
  const isMobile = useIsMobile();
  const [quickOpen, setQuickOpen] = useState(false);
  const { sessionToken, isAuthenticated } = useAuth();
  const productId = product._id as Id<"products">;
  const productHref = `/products/${encodeURIComponent(product.slug)}`;

  const addItem = useMutation(api.cart.addItem);
  const wishlistAdd = useMutation(api.wishlist.add);
  const wishlistRemove = useMutation(api.wishlist.remove);
  const wishlistRows = useQuery(
    api.wishlist.listMine,
    sessionToken ? { sessionToken } : { sessionToken: undefined },
  );

  const [cartBusy, setCartBusy] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  const inWishlist = useMemo(() => {
    if (!wishlistRows) {
      return false;
    }
    return wishlistRows.some((w) => w.productId === productId);
  }, [wishlistRows, productId]);

  const out = product.stock <= 0;
  const lowStockThreshold = 3;
  const low = !out && product.stock > 0 && product.stock <= lowStockThreshold;
  const baseline = Math.max(1, Math.floor(product.initialStock ?? product.stock));
  const pct = Math.max(0, Math.min(100, Math.round((product.stock / baseline) * 100)));

  const onAddToCart = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (out) {
        return;
      }
      if (!isAuthenticated || !sessionToken) {
        addGuestCartItem(productId as string, 1);
        toast.success("Added to cart", { description: product.name });
        return;
      }
      setCartBusy(true);
      try {
        await addItem({ sessionToken, productId, quantity: 1 });
        toast.success("Added to cart", { description: product.name });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add to cart");
      } finally {
        setCartBusy(false);
      }
    },
    [addItem, sessionToken, isAuthenticated, productId, product.name, out],
  );

  const onToggleWishlist = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAuthenticated || !sessionToken) {
        toast.error("Sign in to save items to your wishlist.");
        return;
      }
      setWishlistBusy(true);
      try {
        if (inWishlist) {
          await wishlistRemove({ sessionToken, productId });
          toast.success("Removed from wishlist");
        } else {
          await wishlistAdd({ sessionToken, productId });
          toast.success("Saved to wishlist");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Wishlist update failed");
      } finally {
        setWishlistBusy(false);
      }
    },
    [sessionToken, isAuthenticated, productId, inWishlist, wishlistAdd, wishlistRemove],
  );

  const imageArea = product.thumbnailUrl ? (
    <ConvexImage
      src={product.thumbnailUrl}
      alt={product.name}
      fill
      className="object-cover transition group-hover/card:scale-[1.02]"
      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 50vw"
    />
  ) : (
    <div className="text-muted-foreground flex h-full items-center justify-center text-xs">No image</div>
  );

  return (
    <div
      className={cn(
        "bg-card border-border group/card flex flex-col overflow-hidden rounded-lg border transition hover:border-foreground/20",
        className,
      )}
    >
      <div className="bg-muted/30 relative aspect-[4/3] w-full overflow-hidden">
        {isMobile ? (
          <button
            type="button"
            className="absolute inset-0 z-0 block cursor-pointer border-0 bg-transparent p-0 text-left"
            aria-label={`Quick view ${product.name}`}
            onClick={() => setQuickOpen(true)}
          >
            {imageArea}
          </button>
        ) : (
          <Link href={productHref} className="absolute inset-0 z-0 block" aria-label={`View ${product.name}`}>
            {imageArea}
          </Link>
        )}
        {out ? (
          <span className="pointer-events-none absolute top-2 left-2 z-[1] rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium">
            Out of stock
          </span>
        ) : low ? (
          <span className="pointer-events-none absolute top-2 left-2 z-[1] rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium">
            Only {product.stock} left
          </span>
        ) : null}
        <div
          className={cn(
            "absolute inset-0 z-[2] flex items-start justify-end gap-1 p-2 transition-opacity duration-200",
            "pointer-events-none opacity-0 group-hover/card:pointer-events-auto group-hover/card:opacity-100",
            "group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100",
          )}
        >
          {!out ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="bg-background/90 size-9 border shadow-sm backdrop-blur-sm"
              disabled={cartBusy}
              aria-label="Add to cart"
              title="Add to cart"
              onClick={(e) => void onAddToCart(e)}
            >
              <ShoppingCart className="size-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="bg-background/90 size-9 border shadow-sm backdrop-blur-sm"
            disabled={wishlistBusy}
            aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            onClick={(e) => void onToggleWishlist(e)}
          >
            <Heart className={cn("size-4", inWishlist && "fill-current")} />
          </Button>
        </div>
      </div>
      {isMobile ? (
        <button
          type="button"
          className="flex flex-1 flex-col gap-1 p-3 text-left"
          onClick={() => setQuickOpen(true)}
        >
          <p className="text-foreground line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
          {!out ? (
            <div className="mt-1">
              <div className="bg-muted h-1.5 w-full rounded-full">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-[width]",
                    pct <= 20 ? "bg-destructive" : pct <= 50 ? "bg-amber-500" : "bg-primary",
                  )}
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              </div>
              <p className="text-muted-foreground mt-1 text-xs tabular-nums">{product.stock} in stock</p>
            </div>
          ) : (
            <p className="text-muted-foreground mt-1 text-xs">Out of stock</p>
          )}
          <p className="text-foreground mt-auto pt-1 text-sm font-medium tabular-nums">
            {formatPrice(product.priceCents, product.currency)}
          </p>
        </button>
      ) : (
        <Link href={productHref} className="flex flex-1 flex-col gap-1 p-3">
          <p className="text-foreground line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
          {!out ? (
            <div className="mt-1">
              <div className="bg-muted h-1.5 w-full rounded-full">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-[width]",
                    pct <= 20 ? "bg-destructive" : pct <= 50 ? "bg-amber-500" : "bg-primary",
                  )}
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              </div>
              <p className="text-muted-foreground mt-1 text-xs tabular-nums">{product.stock} in stock</p>
            </div>
          ) : (
            <p className="text-muted-foreground mt-1 text-xs">Out of stock</p>
          )}
          <p className="text-foreground mt-auto pt-1 text-sm font-medium tabular-nums">
            {formatPrice(product.priceCents, product.currency)}
          </p>
        </Link>
      )}
      {isMobile ? (
        <ProductQuickViewDrawer product={product} open={quickOpen} onOpenChange={setQuickOpen} />
      ) : null}
    </div>
  );
}
