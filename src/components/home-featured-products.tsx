"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { ProductCard } from "@/components/product-card";

export function HomeFeaturedProducts() {
  const result = useQuery(api.products.listForStore, {
    limit: 8,
  });
  const products = result?.items ?? [];
  const hasProducts = products.length > 0;

  return (
    <section className="border-t border-border bg-muted/10 py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {hasProducts ? "New arrivals" : "Coming soon"}
          </h2>
          {hasProducts && (
            <Link
              href="/shop"
              className="text-sm font-medium text-[#5c4033] hover:underline dark:text-[#c9a227]"
            >
              View all
            </Link>
          )}
        </div>

        {hasProducts ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                imageSizes="(max-width: 640px) 50vw, 25vw"
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <ShoppingBag className="mx-auto size-14 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium text-foreground">
              New products on the way
            </h3>
            <p className="mt-2 max-w-sm mx-auto text-sm text-muted-foreground">
              We&apos;re curating our collection. Check back soon or browse categories to see what we offer.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-flex rounded-lg bg-[#5c4033] px-5 py-2.5 text-sm font-medium text-[#f5f0e8] transition-colors hover:bg-[#4a3328] dark:bg-[#8b6914] dark:hover:bg-[#7a5c12]"
            >
              Go to shop
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
