"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function WishlistPage() {
  const { sessionToken } = useAuth();
  const wishlist = useQuery(api.wishlists.get, sessionToken ? { sessionToken } : "skip");
  const productIds = wishlist?.productIds ?? [];
  const products = useQuery(
    api.products.getByIds,
    productIds.length > 0 ? { productIds } : "skip"
  );
  const removeFromWishlist = useMutation(api.wishlists.remove);
  const addToCart = useMutation(api.carts.addItem);

  const isLoggedIn = !!sessionToken;

  async function handleRemove(productId: Id<"products">) {
    if (!sessionToken) return;
    await removeFromWishlist({ sessionToken, productId });
    toast.success("Removed from wishlist");
  }

  async function handleAddToCart(productId: Id<"products">, price: number) {
    if (!sessionToken) return;
    await addToCart({
      sessionToken,
      productId,
      quantity: 1,
      priceSnapshot: price,
    });
    toast.success("Added to cart");
  }

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Wishlist</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to view your saved items.
        </p>
        <Button asChild className="mt-4">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  const hasItems = productIds.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">Wishlist</h1>
      <p className="mt-1 text-muted-foreground">
        Your saved items. Add to cart when you&apos;re ready.
      </p>

      {!hasItems ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <Heart className="mx-auto size-14 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">Your wishlist is empty.</p>
          <Button asChild variant="default" className="mt-4">
            <Link href="/shop">Browse shop</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(products ?? []).map((product) => (
            <div
              key={product._id}
              className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden transition hover:border-[#5c4033]/40 dark:hover:border-[#8b6914]/50"
            >
              <Link href="/shop" className="flex flex-1 flex-col">
                <div className="aspect-square w-full bg-muted/50 relative">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover transition group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ShoppingBag className="size-12 opacity-50" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h2 className="font-medium text-foreground line-clamp-2 group-hover:text-[#5c4033] dark:group-hover:text-[#c9a227]">
                    {product.name}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-[#5c4033] dark:text-[#c9a227]">
                    {formatCurrency(product.price / 100)}
                    {product.compareAtPrice != null &&
                      product.compareAtPrice > product.price && (
                        <span className="ml-2 text-xs text-muted-foreground line-through">
                          {formatCurrency(product.compareAtPrice / 100)}
                        </span>
                      )}
                  </p>
                </div>
              </Link>
              <div className="flex gap-2 p-3 pt-0">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddToCart(product._id, product.price);
                  }}
                >
                  <ShoppingCart className="size-4 mr-1.5" />
                  Add to cart
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemove(product._id);
                  }}
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
