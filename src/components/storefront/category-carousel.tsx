"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CategoryCarouselItem = {
  _id: string;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
};

type Props = {
  categories: CategoryCarouselItem[];
  className?: string;
};

export function CategoryCarousel({ categories, className }: Props) {
  const items = useMemo(() => categories.filter((c) => Boolean(c.slug)), [categories]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      loop: true,
      containScroll: "trimSnaps",
      dragFree: true,
    },
    [Autoplay({ delay: 3200, stopOnInteraction: false })],
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
    onSelect();
    return () => {
      emblaApi.off("init", onSelect);
      emblaApi.off("reInit", onSelect);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi && items.length > 0) {
      emblaApi.reInit();
    }
  }, [emblaApi, items.length]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="overflow-hidden" ref={emblaRef}>
        <ul className="flex gap-3" role="list" aria-label="Browse categories">
          {items.map((c) => {
            const initial = (c.name?.trim()?.[0] ?? "?").toUpperCase();
            return (
              <li
                key={c._id}
                className={cn(
                  "flex min-w-0 shrink-0 grow-0",
                  "basis-[5.5rem] sm:basis-[6.5rem]",
                )}
              >
                <Link
                  href={`/categories/${encodeURIComponent(c.slug)}`}
                  className="group flex w-full flex-col items-center gap-2"
                >
                  {c.thumbnailUrl ? (
                    <img
                      src={c.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="bg-muted size-16 rounded-full object-cover ring-1 ring-border transition group-hover:ring-2 sm:size-18"
                    />
                  ) : (
                    <div className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-full ring-1 ring-border transition group-hover:ring-2 sm:size-18">
                      <span className="text-sm font-semibold">{initial}</span>
                    </div>
                  )}
                  <span className="text-foreground w-full text-center text-xs font-medium leading-tight line-clamp-2">
                    {c.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="border-border bg-background/90 absolute top-1/2 left-1 z-10 hidden -translate-y-1/2 border shadow-sm backdrop-blur-sm sm:flex"
        disabled={!canPrev}
        onClick={() => emblaApi?.scrollPrev()}
        aria-label="Show previous categories"
      >
        <ChevronLeft className="size-5" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="border-border bg-background/90 absolute top-1/2 right-1 z-10 hidden -translate-y-1/2 border shadow-sm backdrop-blur-sm sm:flex"
        disabled={!canNext}
        onClick={() => emblaApi?.scrollNext()}
        aria-label="Show next categories"
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}

