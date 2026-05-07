"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { formatPrice } from "@/lib/formatPrice";
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

  const maxQty = product ? Math.max(0, product.stock) : 0;

  const onAddToCart = useCallback(async () => {
    if (!sessionToken || !product) {
      return;
    }
    if (maxQty < 1) {
      return;
    }
    const q = Math.min(qty, maxQty);
    setAdding(true);
    try {
      await addItem({ sessionToken, productId: product._id, quantity: q });
      toast.success("Added to cart", { description: product.name });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add to cart");
    } finally {
      setAdding(false);
    }
  }, [addItem, sessionToken, product, maxQty, qty]);

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
              <img
                src={mainUrl}
                alt=""
                className="h-full w-full object-contain"
              />
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
                  <img src={url} alt="" className="h-full w-full object-cover" />
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
            {maxQty < 1 ? "Out of stock" : `In stock · ${maxQty} available`}
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
              {maxQty > 0 ? (
                <>
                  <div>
                    <label htmlFor="qty" className="text-muted-foreground text-xs">
                      Quantity
                    </label>
                    <input
                      id="qty"
                      type="number"
                      min={1}
                      max={maxQty}
                      value={Math.min(qty, maxQty)}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        if (!Number.isNaN(n)) {
                          setQty(Math.min(maxQty, Math.max(1, n)));
                        }
                      }}
                      className="border-input bg-background text-foreground mt-1 w-20 rounded-md border px-2 py-1.5 text-sm"
                    />
                  </div>
                  <Button onClick={() => void onAddToCart()} disabled={adding}>
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
          ) : maxQty < 1 ? null : (
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
