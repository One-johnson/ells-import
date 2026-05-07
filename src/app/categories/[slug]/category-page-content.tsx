"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { ProductCard } from "@/components/storefront/product-card";
import { ShopGridSkeleton } from "@/components/storefront/shop-grid-skeleton";

export function CategoryPageContent() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const category = useQuery(api.categories.getBySlug, slug ? { slug } : "skip");
  const products = useQuery(
    api.products.listActive,
    category ? { limit: 200, categoryId: category._id } : "skip",
  );

  if (!slug) {
    return <p className="text-muted-foreground text-sm">Invalid category.</p>;
  }

  if (category === undefined || (category && products === undefined)) {
    return (
      <div className="space-y-4">
        <div className="bg-muted h-8 max-w-sm animate-pulse rounded-md" aria-hidden />
        <ShopGridSkeleton />
      </div>
    );
  }

  if (category === null) {
    return (
      <div className="space-y-3">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Not found</h1>
        <p className="text-muted-foreground text-sm">We couldn&apos;t find that category.</p>
        <Link href="/shop" className="text-foreground text-sm font-medium underline-offset-4 hover:underline">
          Back to shop
        </Link>
      </div>
    );
  }

  if (products === undefined) {
    return <ShopGridSkeleton />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">{category.name}</h1>
      <p className="text-muted-foreground -mt-2 text-sm">
        <Link href="/shop" className="text-foreground font-medium underline-offset-4 hover:underline">
          ← All products
        </Link>
      </p>
      {category.description ? (
        <p className="text-muted-foreground max-w-2xl text-sm whitespace-pre-line">{category.description}</p>
      ) : null}
      {products.length === 0 ? (
        <p className="text-muted-foreground text-sm">No products in this category yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {products.map((p) => (
            <li key={p._id} className="min-w-0">
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
