"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { ProductCard } from "@/components/product-card";

export default function ShopPage() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category") ?? undefined;
  const result = useQuery(api.products.listForStore, {
    limit: 48,
    categoryId,
  });
  const products = result?.items ?? [];
  const hasProducts = products.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">
          {categoryId ? "Shop by category" : "Shop"}
        </h1>
      </div>

      {hasProducts ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              imageSizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ))}
        </div>
      ) : (
        <div className="mt-12 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <ShoppingBag className="mx-auto size-14 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-medium text-foreground">
            {categoryId ? "No products in this category" : "No products yet"}
          </h2>
          <p className="mt-2 max-w-sm mx-auto text-sm text-muted-foreground">
            {categoryId
              ? "Try another category or browse all products."
              : "Check back soon for new arrivals."}
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex rounded-lg bg-[#5c4033] px-5 py-2.5 text-sm font-medium text-[#f5f0e8] transition-colors hover:bg-[#4a3328] dark:bg-[#8b6914] dark:hover:bg-[#7a5c12]"
          >
            {categoryId ? "View all products" : "Go to shop"}
          </Link>
        </div>
      )}
    </div>
  );
}
