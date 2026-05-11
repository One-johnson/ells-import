"use client";

import Link from "next/link";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "@convex/_generated/api";
import { ProductCard } from "@/components/storefront/product-card";
import { ShopGridSkeleton } from "@/components/storefront/shop-grid-skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StorefrontSort = "newest" | "price_asc" | "price_desc";

export function ShopContent() {
  const rootCategories = useQuery(api.categories.list, {});
  const [sort, setSort] = useState<StorefrontSort>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");

  const minPriceCents = useMemo(() => {
    const n = Number(minPrice);
    return Number.isFinite(n) && n > 0 ? Math.floor(n * 100) : undefined;
  }, [minPrice]);
  const maxPriceCents = useMemo(() => {
    const n = Number(maxPrice);
    return Number.isFinite(n) && n > 0 ? Math.floor(n * 100) : undefined;
  }, [maxPrice]);

  const {
    results: products,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.products.listActivePaginated,
    {
      sort,
      inStockOnly,
      categoryId: categoryId === "all" ? undefined : (categoryId as any),
      // Price filtering is supported efficiently only for price sorts.
      minPriceCents: sort === "newest" ? undefined : minPriceCents,
      maxPriceCents: sort === "newest" ? undefined : maxPriceCents,
    },
    { initialNumItems: 24 },
  );

  const categoryLinks = useMemo(() => rootCategories ?? [], [rootCategories]);
  const canLoadMore = status === "CanLoadMore";

  if (rootCategories === undefined || (isLoading && products.length === 0)) {
    return <ShopGridSkeleton />;
  }

  return (
    <div className="space-y-8">
      {categoryLinks.length > 0 ? (
        <section aria-label="Browse categories">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-foreground text-sm font-semibold tracking-tight">Categories</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v)}>
                <SelectTrigger className="h-8 w-44" size="sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryLinks.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="in-stock-only"
                  checked={inStockOnly}
                  onCheckedChange={(v) => setInStockOnly(Boolean(v))}
                />
                <label htmlFor="in-stock-only" className="text-muted-foreground text-xs font-medium">
                  In stock only
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  inputMode="decimal"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="h-8 w-20"
                  aria-label="Minimum price"
                  disabled={sort === "newest"}
                />
                <Input
                  inputMode="decimal"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="h-8 w-20"
                  aria-label="Maximum price"
                  disabled={sort === "newest"}
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as StorefrontSort)}>
                <SelectTrigger className="h-8 w-44" size="sm">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price_asc">Price: low to high</SelectItem>
                  <SelectItem value="price_desc">Price: high to low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {categoryLinks.map((c) => (
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
        {products.length === 0 && status === "Exhausted" ? (
          <p className="text-muted-foreground mt-3 text-sm">No products are available yet.</p>
        ) : (
          <div className="space-y-4">
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
              {products.map((p) => (
                <li key={p._id} className="min-w-0">
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
            <div className="flex justify-center">
              {canLoadMore ? (
                <Button type="button" variant="outline" onClick={() => loadMore(24)} disabled={isLoading}>
                  {isLoading ? "Loading…" : "Load more"}
                </Button>
              ) : (
                <p className="text-muted-foreground text-xs">You&apos;ve reached the end.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
