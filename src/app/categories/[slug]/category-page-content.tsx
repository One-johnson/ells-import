"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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

export function CategoryPageContent() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const category = useQuery(api.categories.getBySlug, slug ? { slug } : "skip");
  const [sort, setSort] = useState<StorefrontSort>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const minPriceCents = useMemo(() => {
    const n = Number(minPrice);
    return Number.isFinite(n) && n > 0 ? Math.floor(n * 100) : undefined;
  }, [minPrice]);
  const maxPriceCents = useMemo(() => {
    const n = Number(maxPrice);
    return Number.isFinite(n) && n > 0 ? Math.floor(n * 100) : undefined;
  }, [maxPrice]);

  const categoryId = category ? category._id : undefined;
  const enabled = Boolean(categoryId);

  const { results: products, status, loadMore, isLoading } = usePaginatedQuery(
    api.products.listActivePaginated,
    enabled
      ? {
          sort,
          inStockOnly,
          categoryId,
          minPriceCents: sort === "newest" ? undefined : minPriceCents,
          maxPriceCents: sort === "newest" ? undefined : maxPriceCents,
        }
      : "skip",
    { initialNumItems: 24 },
  );

  const canLoadMore = status === "CanLoadMore";
  const pageTitle = category?.name ?? "";

  if (!slug) {
    return <p className="text-muted-foreground text-sm">Invalid category.</p>;
  }

  if (category === undefined || (enabled && isLoading && products.length === 0)) {
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">{pageTitle}</h1>
        <p className="text-muted-foreground text-sm">
          <Link href="/shop" className="text-foreground font-medium underline-offset-4 hover:underline">
            ← All products
          </Link>
        </p>
      </div>
      {category.description ? (
        <p className="text-muted-foreground max-w-2xl text-sm whitespace-pre-line">{category.description}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="cat-in-stock-only"
              checked={inStockOnly}
              onCheckedChange={(v) => setInStockOnly(Boolean(v))}
            />
            <label htmlFor="cat-in-stock-only" className="text-muted-foreground text-xs font-medium">
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

      {products.length === 0 && status === "Exhausted" ? (
        <p className="text-muted-foreground text-sm">No products in this category yet.</p>
      ) : (
        <div className="space-y-4">
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
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
    </div>
  );
}
