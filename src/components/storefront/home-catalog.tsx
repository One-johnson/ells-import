"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { ProductCard } from "@/components/storefront/product-card";
import { CategoryCarousel } from "@/components/storefront/category-carousel";
import { LatestArrivalsCarousel } from "@/components/storefront/latest-arrivals-carousel";
import { ShopGridSkeleton } from "@/components/storefront/shop-grid-skeleton";
import { cn } from "@/lib/utils";

const FEATURED_COUNT = 8;
const CATEGORY_CHIPS = 8;
const DISCOVERY_COUNT = 8;

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
  const exploreCatalog = useQuery(api.products.listActiveExploreCatalog, { perCategory: 2 });
  const bestSellers = useQuery(api.products.listBestSellers, { limit: DISCOVERY_COUNT });
  const trending = useQuery(api.products.listTrending, { limit: DISCOVERY_COUNT });
  const browseCategories = useQuery(api.categories.listWithThumbnails, {
    limit: 100,
    includeAll: true,
  });

  if (
    products === undefined ||
    exploreCatalog === undefined ||
    browseCategories === undefined ||
    bestSellers === undefined ||
    trending === undefined
  ) {
    return <ShopGridSkeleton />;
  }

  const hasMoreCategories = browseCategories.length > CATEGORY_CHIPS;

  return (
    <div className="mt-12 space-y-12 sm:mt-16">
      {browseCategories.length > 0 ? (
        <section aria-labelledby="home-cats-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="home-cats-heading" className="text-foreground text-lg font-semibold tracking-tight">
              Browse by category
            </h2>
            <SectionLink href="/shop">View all</SectionLink>
          </div>
          <div className="space-y-3">
            <CategoryCarousel categories={browseCategories} />
            {hasMoreCategories ? (
              <div className="flex justify-end">
                <Link
                  href="/shop"
                  className="text-muted-foreground hover:text-foreground inline-flex rounded-full border border-dashed px-3 py-1.5 text-xs font-medium transition"
                >
                  +{browseCategories.length - CATEGORY_CHIPS} more
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {bestSellers.length > 0 ? (
        <section aria-labelledby="home-best-sellers-heading" className="space-y-3" id="best-sellers">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 id="home-best-sellers-heading" className="text-foreground text-lg font-semibold tracking-tight">
                Best sellers
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">Most purchased lately.</p>
            </div>
            <SectionLink href="/shop">Shop all</SectionLink>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="list">
            {bestSellers.map((p) => (
              <li key={p._id} className="min-w-0">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {trending.length > 0 ? (
        <section aria-labelledby="home-trending-heading" className="space-y-3" id="trending">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 id="home-trending-heading" className="text-foreground text-lg font-semibold tracking-tight">
                Trending now
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">Popular this week.</p>
            </div>
            <SectionLink href="/shop">Browse</SectionLink>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="list">
            {trending.map((p) => (
              <li key={p._id} className="min-w-0">
                <ProductCard product={p} />
              </li>
            ))}
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
          <LatestArrivalsCarousel products={products} className="mt-2" />
        )}
      </section>

      {exploreCatalog.length > 0 ? (
        <section aria-labelledby="home-explore-heading" className="space-y-3" id="explore-catalog">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="home-explore-heading" className="text-foreground text-lg font-semibold tracking-tight">
              Explore the catalog
            </h2>
            <SectionLink href="/shop">See all products</SectionLink>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="list">
            {exploreCatalog.map((p) => (
              <li key={p._id} className="min-w-0">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
