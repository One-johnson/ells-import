"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { getStatusConfig } from "@/lib/product-status";
import { Eye, Heart, ShoppingCart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export type ProductCardProduct = {
  _id: Id<"products">;
  name: string;
  slug: string;
  images: string[];
  price: number;
  compareAtPrice?: number;
  status?: string;
  stock?: number;
};

type ProductCardProps = {
  product: ProductCardProduct;
  imageSizes?: string;
};

export function ProductCard({ product, imageSizes }: ProductCardProps) {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const wishlist = useQuery(
    api.wishlists.get,
    sessionToken ? { sessionToken } : "skip"
  );
  const addToWishlist = useMutation(api.wishlists.add);
  const removeFromWishlist = useMutation(api.wishlists.remove);
  const addToCart = useMutation(api.carts.addItem);

  const inWishlist = (wishlist?.productIds ?? []).includes(product._id);

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!sessionToken) {
      toast.info("Sign in to add items to your wishlist");
      router.push("/sign-in");
      return;
    }
    if (inWishlist) {
      removeFromWishlist({ sessionToken, productId: product._id });
      toast.success("Removed from wishlist");
    } else {
      addToWishlist({ sessionToken, productId: product._id });
      toast.success("Added to wishlist");
    }
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!sessionToken) {
      toast.info("Sign in to add items to your cart");
      router.push("/sign-in");
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

  function handleView(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/shop/${product.slug}`);
  }

  return (
    <TooltipProvider delayDuration={300}>
      <article className="group relative rounded-xl border border-border bg-card overflow-hidden transition hover:border-[#5c4033]/40 dark:hover:border-[#8b6914]/50">
        <Link href={`/shop/${product.slug}`} className="block">
          <div className="aspect-square w-full bg-muted/50 relative overflow-hidden">
            {product.images?.[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover transition group-hover:scale-105"
                sizes={imageSizes ?? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ShoppingBag className="size-12 opacity-50" />
              </div>
            )}
            {/* Action icons overlay */}
            <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-90 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="size-8 rounded-full bg-background/90 shadow-sm hover:bg-background"
                    onClick={handleView}
                    aria-label="View product"
                  >
                    <Eye className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">View</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="size-8 rounded-full bg-background/90 shadow-sm hover:bg-background"
                    onClick={handleWishlist}
                    aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart
                      className={`size-4 ${inWishlist ? "fill-destructive text-destructive" : ""}`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="size-8 rounded-full bg-background/90 shadow-sm hover:bg-background"
                    onClick={handleAddToCart}
                    aria-label="Add to cart"
                  >
                    <ShoppingCart className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Add to cart</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="p-3">
            {product.status && (
              <Badge
                variant={getStatusConfig(product.status).variant as "success" | "info" | "warning" | "accent" | "muted"}
                className="mb-1.5 rounded-full text-[10px]"
              >
                {getStatusConfig(product.status).label}
              </Badge>
            )}
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
      </article>
    </TooltipProvider>
  );
}
