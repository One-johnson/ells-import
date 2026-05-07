"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { ProductCard } from "@/components/storefront/product-card";

type CategoryLite = Pick<Doc<"categories">, "name" | "slug">;

type Props = {
  currentProductId: Id<"products">;
  categoryId?: Id<"categories">;
  category: CategoryLite | null | undefined;
};

export function RelatedProductsSection({ currentProductId, categoryId, category }: Props) {
  const relatedCatalog = useQuery(api.products.listActive, {
    limit: 48,
    ...(categoryId ? { categoryId } : {}),
  });

  const relatedProducts = useMemo(() => {
    if (!relatedCatalog) {
      return [];
    }
    return relatedCatalog.filter((p) => p._id !== currentProductId).slice(0, 8);
  }, [relatedCatalog, currentProductId]);

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="related-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="related-heading" className="text-foreground text-lg font-semibold tracking-tight">
          {category ? `More in ${category.name}` : "You may also like"}
        </h2>
        {category ? (
          <Link
            href={`/categories/${encodeURIComponent(category.slug)}`}
            className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
          >
            View category
          </Link>
        ) : (
          <Link
            href="/shop"
            className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
          >
            View all products
          </Link>
        )}
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" role="list">
        {relatedProducts.map((p) => (
          <li key={p._id}>
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
