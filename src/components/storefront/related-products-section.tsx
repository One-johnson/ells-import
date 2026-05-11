"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { cn } from "@/lib/utils";

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

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    containScroll: "trimSnaps",
    dragFree: false,
  });

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnapCount, setScrollSnapCount] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) {
      return;
    }
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setScrollSnapCount(emblaApi.scrollSnapList().length);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }
    emblaApi.on("init", onSelect);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("init", onSelect);
      emblaApi.off("reInit", onSelect);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi && relatedProducts.length > 0) {
      emblaApi.reInit();
    }
  }, [emblaApi, relatedProducts]);

  if (relatedProducts.length === 0) {
    return null;
  }

  const showDots = scrollSnapCount > 1;

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

      <div className="relative">
        <div className="overflow-hidden rounded-lg pb-1" ref={emblaRef}>
          <ul
            className="flex gap-4"
            role="list"
            aria-label={category ? `Related products in ${category.name}` : "Related products"}
          >
            {relatedProducts.map((p) => (
              <li
                key={p._id}
                className={cn(
                  "flex min-w-0 shrink-0 grow-0",
                  // ~1 card + peek on small screens; 2 / 3 / 4 per view at larger breakpoints (gap-4 = 1rem)
                  "basis-[min(100%,19rem)] sm:basis-[calc((100%-1rem)/2)] md:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-3rem)/4)]",
                )}
              >
                <ProductCard product={p} className="h-full min-h-0 w-full" />
              </li>
            ))}
          </ul>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="border-border bg-background/90 absolute top-1/2 left-2 z-10 hidden -translate-y-1/2 border shadow-sm backdrop-blur-sm sm:flex"
          disabled={!canPrev}
          onClick={() => emblaApi?.scrollPrev()}
          aria-label="Show previous related products"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="border-border bg-background/90 absolute top-1/2 right-2 z-10 hidden -translate-y-1/2 border shadow-sm backdrop-blur-sm sm:flex"
          disabled={!canNext}
          onClick={() => emblaApi?.scrollNext()}
          aria-label="Show next related products"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      {showDots ? (
        <div className="flex justify-center gap-1.5 pt-1">
          {Array.from({ length: scrollSnapCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === selectedIndex
                  ? "bg-primary w-6"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-1.5",
              )}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Go to related products page ${i + 1} of ${scrollSnapCount}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
