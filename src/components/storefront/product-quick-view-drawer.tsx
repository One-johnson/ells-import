"use client";

import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexImage } from "@/components/convex-image";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { formatPrice } from "@/lib/formatPrice";
import { addGuestCartItem } from "@/lib/guestCart";
import { descriptionToSpecLines } from "@/lib/product-specs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

/** Same fields as `ProductCard` props (avoid circular import). */
export type QuickViewProduct = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  priceCents: number;
  currency: string;
  stock: number;
  initialStock?: number;
  thumbnailUrl?: string | null;
};

type Props = {
  product: QuickViewProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductQuickViewDrawer({ product, open, onOpenChange }: Props) {
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

  const [qty, setQty] = useState(1);
  const [cartBusy, setCartBusy] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setQty(1);
    }
  }, [open, product._id]);

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
  const maxQty = Math.max(0, product.stock);

  const specPreview = useMemo(() => {
    const raw = product.description?.trim();
    if (!raw) {
      return [];
    }
    const lines = descriptionToSpecLines(raw);
    const list = lines.length > 0 ? lines : [raw];
    return list.slice(0, 2);
  }, [product.description]);

  const onAddToCart = useCallback(async () => {
    if (out || maxQty < 1) {
      return;
    }
    const q = Math.min(Math.max(1, qty), maxQty);
    if (!isAuthenticated || !sessionToken) {
      addGuestCartItem(productId as string, q);
      toast.success("Added to cart", { description: product.name });
      onOpenChange(false);
      return;
    }
    setCartBusy(true);
    try {
      await addItem({ sessionToken, productId, quantity: q });
      toast.success("Added to cart", { description: product.name });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add to cart");
    } finally {
      setCartBusy(false);
    }
  }, [addItem, sessionToken, isAuthenticated, productId, product.name, out, maxQty, qty, onOpenChange]);

  const onToggleWishlist = useCallback(async () => {
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
  }, [sessionToken, isAuthenticated, productId, inWishlist, wishlistAdd, wishlistRemove]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[min(92dvh,36rem)]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="pr-8 leading-snug">{product.name}</DrawerTitle>
          <DrawerDescription className="sr-only">Quick view and add to cart</DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-2">
          <div className="bg-muted/30 relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-lg">
            {product.thumbnailUrl ? (
              <ConvexImage
                src={product.thumbnailUrl}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
              />
            ) : (
              <div className="text-muted-foreground flex aspect-[4/3] items-center justify-center text-sm">
                No image
              </div>
            )}
            {!out && low ? (
              <span className="pointer-events-none absolute top-2 left-2 rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium">
                Only {product.stock} left
              </span>
            ) : null}
            {out ? (
              <span className="pointer-events-none absolute top-2 left-2 rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium">
                Out of stock
              </span>
            ) : null}
          </div>

          <p className="text-foreground text-xl font-semibold tabular-nums">
            {formatPrice(product.priceCents, product.currency)}
          </p>

          {!out ? (
            <div>
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
            <p className="text-muted-foreground text-sm">Out of stock</p>
          )}

          {specPreview.length > 0 ? (
            <ul className="text-muted-foreground space-y-1 text-sm">
              {specPreview.map((line, i) => (
                <li key={i} className="line-clamp-2">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}

          {!out && maxQty > 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-sm">Qty</span>
              <QuantityStepper
                value={qty}
                min={1}
                max={maxQty}
                disabled={cartBusy}
                onChange={setQty}
              />
            </div>
          ) : null}
        </div>

        <DrawerFooter className="gap-3 border-t pt-4 sm:flex-col">
          {!out ? (
            <Button
              type="button"
              className="w-full"
              disabled={cartBusy || maxQty < 1}
              onClick={() => void onAddToCart()}
            >
              <ShoppingCart className="mr-2 size-4" />
              {cartBusy ? "Adding…" : "Add to cart"}
            </Button>
          ) : null}
          <div className="flex w-full flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={wishlistBusy}
              onClick={() => void onToggleWishlist()}
            >
              <Heart className={cn("mr-2 size-4", inWishlist && "fill-current")} />
              {inWishlist ? "Saved" : "Wishlist"}
            </Button>
            <Button variant="secondary" className="flex-1" asChild>
              <Link href={productHref} onClick={() => onOpenChange(false)}>
                View full details
              </Link>
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
