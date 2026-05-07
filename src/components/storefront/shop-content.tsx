"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { ProductCard } from "@/components/storefront/product-card";
import { ShopGridSkeleton } from "@/components/storefront/shop-grid-skeleton";

export function ShopContent() {
  const products = useQuery(api.products.listActive, { limit: 200 });
  const rootCategories = useQuery(api.categories.list, {});

  if (products === undefined || rootCategories === undefined) {
    return <ShopGridSkeleton />;
  }

  return (
    <div className="space-y-8">
      {rootCategories.length > 0 ? (
        <section aria-label="Browse categories">
          <h2 className="text-foreground text-sm font-semibold tracking-tight">Categories</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {rootCategories.map((c) => (
              <li key={c._id}>
                <Link
                  href={`/categories/${encodeURIComponent(c.slug)}`}
                  className="bg-muted/60 text-foreground hover:bg-muted inline-flex rounded-full px-3 py-1.5 text-xs font-medium transition"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-foreground text-sm font-semibold tracking-tight">All products</h2>
        {products.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">No products are available yet.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {products.map((p) => (
              <li key={p._id} className="min-w-0">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
