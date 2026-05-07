"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/formatPrice";
import { descriptionToSpecPreview } from "@/lib/product-specs";
import { publicRef } from "@/lib/public-ref";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

export type ProductCardProduct = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  priceCents: number;
  currency: string;
  stock: number;
  thumbnailUrl?: string | null;
  publicCode?: string;
};

type ProductCardProps = {
  product: ProductCardProduct;
  className?: string;
};

export function ProductCard({ product, className }: ProductCardProps) {
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

  const onAddToCart = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (out) {
        return;
      }
      if (!isAuthenticated || !sessionToken) {
        toast.error("Sign in to add items to your cart.");
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

  return (
    <div
      className={cn(
        "bg-card border-border group/card flex flex-col overflow-hidden rounded-lg border transition hover:border-foreground/20",
        className,
      )}
    >
      <div className="bg-muted/30 relative aspect-[4/3] w-full overflow-hidden">
        <Link href={productHref} className="absolute inset-0 z-0 block" aria-label={`View ${product.name}`}>
          {product.thumbnailUrl ? (
            <img
              src={product.thumbnailUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition group-hover/card:scale-[1.02]"
            />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-xs">No image</div>
          )}
        </Link>
        {out ? (
          <span className="pointer-events-none absolute top-2 left-2 z-[1] rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium">
            Out of stock
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
              <ShoppingBag className="size-4" />
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
      <Link href={productHref} className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-foreground line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
        {product.publicCode ? (
          <p className="text-muted-foreground font-mono text-xs tabular-nums">Ref {publicRef(product.publicCode)}</p>
        ) : null}
        {product.description ? (
          <p className="text-muted-foreground line-clamp-2 text-xs">{descriptionToSpecPreview(product.description)}</p>
        ) : null}
        <p className="text-foreground mt-auto pt-1 text-sm font-medium tabular-nums">
          {formatPrice(product.priceCents, product.currency)}
        </p>
      </Link>
    </div>
  );
}
