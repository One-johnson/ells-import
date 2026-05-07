"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { ProductCard } from "@/components/storefront/product-card";
import { ShopGridSkeleton } from "@/components/storefront/shop-grid-skeleton";
import { cn } from "@/lib/utils";

const FEATURED_COUNT = 8;
const CATEGORY_CHIPS = 8;

function SectionLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("text-foreground text-sm font-medium underline-offset-4 hover:underline", className)}
    >
      {children}
    </Link>
  );
}

export function HomeCatalog() {
  const products = useQuery(api.products.listActive, { limit: FEATURED_COUNT });
  const rootCategories = useQuery(api.categories.list, {});

  if (products === undefined || rootCategories === undefined) {
    return <ShopGridSkeleton />;
  }

  const categoryPreview = rootCategories.slice(0, CATEGORY_CHIPS);
  const hasMoreCategories = rootCategories.length > CATEGORY_CHIPS;

  return (
    <div className="mt-12 space-y-12 sm:mt-16">
      {rootCategories.length > 0 ? (
        <section aria-labelledby="home-cats-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="home-cats-heading" className="text-foreground text-lg font-semibold tracking-tight">
              Browse by category
            </h2>
            <SectionLink href="/shop">View all</SectionLink>
          </div>
          <ul className="flex flex-wrap gap-2" role="list">
            {categoryPreview.map((c) => (
              <li key={c._id}>
                <Link
                  href={`/categories/${encodeURIComponent(c.slug)}`}
                  className="bg-muted/60 text-foreground hover:bg-muted inline-flex rounded-full px-3 py-1.5 text-xs font-medium transition"
                >
                  {c.name}
                </Link>
              </li>
            ))}
            {hasMoreCategories ? (
              <li>
                <Link
                  href="/shop"
                  className="text-muted-foreground hover:text-foreground inline-flex rounded-full border border-dashed px-3 py-1.5 text-xs font-medium transition"
                >
                  +{rootCategories.length - CATEGORY_CHIPS} more
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="home-featured-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 id="home-featured-heading" className="text-foreground text-lg font-semibold tracking-tight">
              Latest arrivals
            </h2>
          </div>
          {products.length > 0 ? <SectionLink href="/shop">See all products</SectionLink> : null}
        </div>
        {products.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No products are live yet. When items are set to <span className="text-foreground font-medium">Active</span> in
            admin, they will appear here.
          </p>
        ) : (
          <ul className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="list">
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
