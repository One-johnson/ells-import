"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ProductCard, type ProductCardProduct } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  products: ProductCardProduct[];
  className?: string;
};

/** Horizontal strip of product cards; ~1 peek on mobile, 2–4 visible on larger breakpoints. */
export function LatestArrivalsCarousel({ products, className }: Props) {
  const items = useMemo(() => products, [products]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      loop: true,
      containScroll: "trimSnaps",
      dragFree: true,
    },
    [Autoplay({ delay: 4000, stopOnInteraction: false })],
  );

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) {
      return;
    }
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }
    emblaApi.on("init", onSelect);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
    const raf = requestAnimationFrame(() => {
      onSelect();
    });
    return () => {
      cancelAnimationFrame(raf);
      emblaApi.off("init", onSelect);
      emblaApi.off("reInit", onSelect);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi && items.length > 0) {
      emblaApi.reInit();
    }
  }, [emblaApi, items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="overflow-hidden pb-1" ref={emblaRef}>
        <ul className="flex gap-3" role="list" aria-label="Latest arrivals">
          {items.map((p) => (
            <li
              key={p._id}
              className={cn(
                "flex min-w-0 shrink-0 grow-0",
                "basis-[min(100%,18rem)] sm:basis-[calc((100%-0.75rem)/2)] lg:basis-[calc((100%-1.5rem)/3)] xl:basis-[calc((100%-2.25rem)/4)]",
              )}
            >
              <div className="w-full min-w-0">
                <ProductCard product={p} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="border-border bg-background/90 absolute top-[42%] left-1 z-10 hidden -translate-y-1/2 border shadow-sm backdrop-blur-sm sm:flex"
        disabled={!canPrev}
        onClick={() => emblaApi?.scrollPrev()}
        aria-label="Show previous products"
      >
        <ChevronLeft className="size-5" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="border-border bg-background/90 absolute top-[42%] right-1 z-10 hidden -translate-y-1/2 border shadow-sm backdrop-blur-sm sm:flex"
        disabled={!canNext}
        onClick={() => emblaApi?.scrollNext()}
        aria-label="Show next products"
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
