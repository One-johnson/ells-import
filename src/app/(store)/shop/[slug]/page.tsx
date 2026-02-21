"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStatusConfig } from "@/lib/product-status";
import { ShoppingBag, ShoppingCart, Heart, ArrowLeft, Package, Hash } from "lucide-react";
import { toast } from "sonner";

export default function ProductPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { sessionToken } = useAuth();
  const product = useQuery(
    api.products.getBySlug,
    slug ? { slug } : "skip"
  );
  const wishlist = useQuery(
    api.wishlists.get,
    sessionToken ? { sessionToken } : "skip"
  );
  const addToWishlist = useMutation(api.wishlists.add);
  const removeFromWishlist = useMutation(api.wishlists.remove);
  const addToCart = useMutation(api.carts.addItem);

  const inWishlist = (wishlist?.productIds ?? []).includes(product?._id ?? ("" as never));

  function handleWishlist() {
    if (!product || !sessionToken) return;
    if (inWishlist) {
      removeFromWishlist({ sessionToken, productId: product._id });
      toast.success("Removed from wishlist");
    } else {
      addToWishlist({ sessionToken, productId: product._id });
      toast.success("Added to wishlist");
    }
  }

  function handleAddToCart() {
    if (!product) return;
    if (!sessionToken) {
      toast.info("Sign in to add items to your cart");
      return;
    }
    addToCart({
      sessionToken,
      productId: product._id,
      quantity: 1,
      priceSnapshot: product.price,
    });
    toast.success("Added to cart");
  }

  if (slug && product === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Product not found</h1>
        <p className="mt-2 text-muted-foreground">This product may have been removed.</p>
        <Button asChild className="mt-4">
          <Link href="/shop">Back to shop</Link>
        </Button>
      </div>
    );
  }

  const mainImage = product.images?.[0];
  const statusConfig = getStatusConfig(product.status);
  const inStock = (product.stock ?? 0) > 0;
  const canAddToCart = inStock && product.status !== "sold_out" && product.status !== "archived";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/shop"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to shop
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="aspect-square w-full max-w-lg overflow-hidden rounded-xl border border-border bg-muted/50">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.name}
              width={600}
              height={600}
              className="h-full w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ShoppingBag className="size-24 opacity-50" />
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.status && (
              <Badge variant={statusConfig.variant as "success" | "info" | "warning" | "accent" | "muted"} className="rounded-full">
                {statusConfig.label}
              </Badge>
            )}
            {product.productId && (
              <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <Hash className="size-3.5" />
                {product.productId}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {product.name}
          </h1>
          <p className="mt-2 text-lg font-medium text-[#5c4033] dark:text-[#c9a227]">
            {formatCurrency(product.price / 100)}
            {product.compareAtPrice != null && product.compareAtPrice > product.price && (
              <span className="ml-2 text-base text-muted-foreground line-through">
                {formatCurrency(product.compareAtPrice / 100)}
              </span>
            )}
          </p>

          <dl className="mt-4 space-y-2 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <dt className="text-sm font-medium text-muted-foreground">Stock</dt>
              <dd className="flex items-center gap-1.5 text-sm text-foreground">
                <Package className="size-4 text-muted-foreground" />
                {inStock ? `${product.stock} in stock` : "Out of stock"}
              </dd>
            </div>
            {product.sku && (
              <div className="flex flex-wrap items-center gap-2">
                <dt className="text-sm font-medium text-muted-foreground">SKU</dt>
                <dd className="font-mono text-sm text-foreground">{product.sku}</dd>
              </div>
            )}
          </dl>

          {product.description && (
            <div className="mt-4 border-t border-border pt-4">
              <h2 className="text-sm font-semibold text-foreground">Description</h2>
              <p className="mt-2 text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={handleAddToCart}
              className="gap-2"
              disabled={!canAddToCart}
            >
              <ShoppingCart className="size-4" />
              {canAddToCart ? "Add to cart" : product.status === "sold_out" ? "Sold out" : "Unavailable"}
            </Button>
            <Button
              variant="outline"
              onClick={handleWishlist}
              className="gap-2"
              aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={`size-4 ${inWishlist ? "fill-destructive text-destructive" : ""}`} />
              {inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
