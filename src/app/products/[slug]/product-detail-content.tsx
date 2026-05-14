"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexImage } from "@/components/convex-image";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { useAuth } from "@/providers/auth-provider";
import { formatPrice } from "@/lib/formatPrice";
import { addGuestCartItem } from "@/lib/guestCart";
import { descriptionToSpecLines } from "@/lib/product-specs";
import { publicRef } from "@/lib/public-ref";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ProductReviewsPanel } from "@/components/storefront/product-reviews-panel";
import { RelatedProductsSection } from "@/components/storefront/related-products-section";

export function ProductDetailContent() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const product = useQuery(api.products.getActiveBySlug, slug ? { slug } : "skip");
  const category = useQuery(
    api.categories.get,
    product?.categoryId ? { categoryId: product.categoryId as Id<"categories"> } : "skip",
  );
  const { sessionToken, isAuthenticated, isLoading: authLoading } = useAuth();
  const addItem = useMutation(api.cart.addItem);
  const wishlistAdd = useMutation(api.wishlist.add);
  const wishlistRemove = useMutation(api.wishlist.remove);
  const wishlistRows = useQuery(
    api.wishlist.listMine,
    sessionToken ? { sessionToken } : { sessionToken: undefined },
  );
  const openRounds = useQuery(api.preorderRounds.listOpen);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);

  const inWishlist = useMemo(() => {
    if (!product || !wishlistRows) {
      return false;
    }
    return wishlistRows.some((w) => w.productId === product._id);
  }, [product, wishlistRows]);

  const mainUrl = useMemo(() => {
    if (!product?.imageUrls?.length) {
      return null;
    }
    return product.imageUrls[Math.min(imageIdx, product.imageUrls.length - 1)] ?? null;
  }, [product?.imageUrls, imageIdx]);

  const specBulletLines = useMemo(() => {
    const raw = product?.description?.trim();
    if (!raw) {
      return [];
    }
    const lines = descriptionToSpecLines(raw);
    return lines.length > 0 ? lines : [raw];
  }, [product?.description]);

  const isPreorder = product?.fulfillmentMode === "preorder";
  const preorderRound =
    product && openRounds ? openRounds.find((r) => r._id === product.preorderRoundId) : undefined;
  const maxQty = product ? (isPreorder ? 999 : Math.max(0, product.stock)) : 0;
  const preorderCanAdd =
    !isPreorder ||
    openRounds === undefined ||
    Boolean(
      product?.preorderRoundId &&
        openRounds?.some((r) => r._id === product.preorderRoundId && r.status === "open"),
    );

  const onAddToCart = useCallback(async () => {
    if (!product) {
      return;
    }
    if (!preorderCanAdd) {
      return;
    }
    if (!isPreorder && maxQty < 1) {
      return;
    }
    const q = Math.min(qty, maxQty);
    if (!sessionToken || !isAuthenticated) {
      addGuestCartItem(product._id as string, q);
      toast.success("Added to cart", { description: product.name });
      return;
    }
    setAdding(true);
    try {
      await addItem({ sessionToken, productId: product._id, quantity: q });
      toast.success("Added to cart", { description: product.name });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add to cart");
    } finally {
      setAdding(false);
    }
  }, [addItem, sessionToken, product, maxQty, qty, isAuthenticated, preorderCanAdd, isPreorder]);

  const onToggleWishlist = useCallback(async () => {
    if (!sessionToken || !product) {
      return;
    }
    setWishlistBusy(true);
    try {
      if (inWishlist) {
        await wishlistRemove({ sessionToken, productId: product._id });
        toast.success("Removed from wishlist");
      } else {
        await wishlistAdd({ sessionToken, productId: product._id });
        toast.success("Saved to wishlist");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Wishlist update failed");
    } finally {
      setWishlistBusy(false);
    }
  }, [sessionToken, product, inWishlist, wishlistAdd, wishlistRemove]);

  if (!slug) {
    return <p className="text-muted-foreground text-sm">Invalid product link.</p>;
  }

  if (product === undefined) {
    return (
      <div className="space-y-4">
        <div className="bg-muted max-w-md animate-pulse rounded-md py-3" />
        <div className="bg-muted aspect-[4/3] max-w-lg animate-pulse rounded-lg" />
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="space-y-3">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Not found</h1>
        <p className="text-muted-foreground text-sm">This product is unavailable or the link is wrong.</p>
        <Button variant="link" asChild className="h-auto p-0">
          <Link href="/shop" className="text-foreground">
            Back to shop
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="space-y-3">
          <div className="bg-muted/30 border-border aspect-square w-full overflow-hidden rounded-lg border">
            {mainUrl ? (
              <ConvexImage src={mainUrl} alt={product.name} width={800} height={800} className="h-full w-full object-contain" />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">No image</div>
            )}
          </div>
          {product.imageUrls.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {product.imageUrls.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setImageIdx(i)}
                  className={`bg-muted/30 h-16 w-16 overflow-hidden rounded-md border-2 p-0 transition ${
                    i === imageIdx ? "border-foreground" : "border-transparent"
                  }`}
                >
                  <ConvexImage src={url} alt="" width={64} height={64} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            {category ? (
              <p className="text-muted-foreground text-sm">
                <Link
                  href={`/categories/${encodeURIComponent(category.slug)}`}
                  className="text-foreground font-medium hover:underline"
                >
                  {category.name}
                </Link>
              </p>
            ) : null}
            {isPreorder ? (
              <div className="bg-primary/5 border-primary/20 rounded-md border px-3 py-2 text-sm">
                {preorderRound ? (
                  <p>
                    <span className="font-medium">Pre-order</span> — China → Ghana. Round{" "}
                    <span className="font-medium">{preorderRound.label}</span> closes{" "}
                    {new Date(preorderRound.closesAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    . Pay product price now; <span className="font-medium">shipping is invoiced later</span> using total
                    CBM after arrival (typically 6–8 weeks after close).{" "}
                    <Link href="/preorders" className="underline underline-offset-2">
                      All pre-orders
                    </Link>
                  </p>
                ) : (
                  <p className="text-destructive font-medium">
                    This pre-order round is closed — you cannot add this item to the cart.
                  </p>
                )}
              </div>
            ) : null}
            <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">{product.name}</h1>
            {product.publicCode ? (
              <p className="text-muted-foreground font-mono text-xs tabular-nums">Ref {publicRef(product.publicCode)}</p>
            ) : null}
          </div>

          <p className="text-2xl font-semibold tabular-nums">{formatPrice(product.priceCents, product.currency)}</p>

          {product.compareAtCents && product.compareAtCents > product.priceCents ? (
            <p className="text-muted-foreground text-sm line-through">
              {formatPrice(product.compareAtCents, product.currency)}
            </p>
          ) : null}

          <p className="text-muted-foreground text-sm">
            {isPreorder
              ? preorderRound
                ? "Pre-order · unlimited until the round closes"
                : "Pre-order · round closed"
              : maxQty < 1
                ? "Out of stock"
                : `In stock · ${maxQty} available`}
          </p>

          {specBulletLines.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-foreground text-sm font-semibold">Specifications</h2>
              <ul className="text-foreground/90 list-disc space-y-1 pl-5 text-sm leading-relaxed">
                {specBulletLines.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {authLoading ? (
            <p className="text-muted-foreground text-sm">…</p>
          ) : isAuthenticated && sessionToken ? (
            <div className="flex flex-wrap items-end gap-3">
              {maxQty > 0 && preorderCanAdd ? (
                <>
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-xs">Quantity</label>
                    <QuantityStepper
                      value={Math.min(qty, maxQty)}
                      min={1}
                      max={maxQty}
                      disabled={adding}
                      onChange={(n) => setQty(Math.min(maxQty, Math.max(1, n)))}
                    />
                  </div>
                  <Button onClick={() => void onAddToCart()} disabled={adding || !preorderCanAdd}>
                    {adding ? "Adding…" : "Add to cart"}
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground max-w-sm text-sm">
                  Out of stock — save to your wishlist to watch for a restock.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                disabled={wishlistBusy || wishlistRows === undefined}
                onClick={() => void onToggleWishlist()}
                aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={cn("size-4", inWishlist && "fill-current")} aria-hidden />
              </Button>
            </div>
          ) : maxQty < 1 && !isPreorder ? null : (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">Sign in to add items to your cart or save them.</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={`/login?next=${encodeURIComponent(`/products/${encodeURIComponent(product.slug)}`)}`}>
                    Sign in
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link
                    href={`/register?next=${encodeURIComponent(`/products/${encodeURIComponent(product.slug)}`)}`}
                  >
                    Create account
                  </Link>
                </Button>
              </div>
              {maxQty > 0 && preorderCanAdd ? (
                <div className="pt-1">
                  <QuantityStepper
                    value={Math.min(qty, maxQty)}
                    min={1}
                    max={maxQty}
                    disabled={adding}
                    onChange={(n) => setQty(Math.min(maxQty, Math.max(1, n)))}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <ProductReviewsPanel productId={product._id} productSlug={product.slug} />

      <RelatedProductsSection
        currentProductId={product._id}
        categoryId={product.categoryId}
        category={category ?? null}
      />
    </div>
  );
}
