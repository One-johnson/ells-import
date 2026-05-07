"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { HeroCarouselSkeleton } from "./hero-carousel-skeleton";

export function HeroCarousel() {
  const data = useQuery(api.settings.heroSlides);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    [Autoplay({ delay: 5200, stopOnInteraction: false })],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) {
      return;
    }
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }
    onSelect();
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("reInit", onSelect);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const slides =
    data === undefined
      ? []
      : data.slides.filter((s): s is typeof s & { imageUrl: string } => Boolean(s.imageUrl));

  useEffect(() => {
    if (emblaApi && slides.length) {
      emblaApi.reInit();
    }
  }, [emblaApi, slides]);

  if (data === undefined) {
    return <HeroCarouselSkeleton />;
  }

  if (slides.length === 0) {
    return (
      <div className="relative w-full">
        <div
          className="min-h-[min(60vh,28rem)] w-full rounded-none bg-muted/20 sm:rounded-lg"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-none sm:rounded-lg" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {slides.map((slide, i) => (
            <div key={`${slide.href ?? slide.title}-${i}`} className="min-w-0 flex-[0_0_100%] pl-0">
              <div
                className={cn(
                  "relative flex min-h-[min(60vh,28rem)] flex-col justify-end overflow-hidden px-6 py-10 sm:px-10 sm:py-16",
                )}
              >
                <img
                  src={slide.imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  fetchPriority={i === 0 ? "high" : "low"}
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20"
                  aria-hidden
                />
                <div className="relative z-10 text-white">
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{slide.title}</h2>
                  {slide.subtitle ? (
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">{slide.subtitle}</p>
                  ) : null}
                  {slide.href && slide.ctaLabel ? (
                    <div className="mt-4">
                      <Button asChild variant="secondary" size="sm" className="font-medium">
                        <Link href={slide.href}>{slide.ctaLabel}</Link>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="bg-background/80 border-border absolute top-1/2 left-2 z-10 -translate-y-1/2 border shadow-sm backdrop-blur"
        onClick={() => emblaApi?.scrollPrev()}
        aria-label="Previous slide"
      >
        <ChevronLeft className="size-5" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="bg-background/80 border-border absolute top-1/2 right-2 z-10 -translate-y-1/2 border shadow-sm backdrop-blur"
        onClick={() => emblaApi?.scrollNext()}
        aria-label="Next slide"
      >
        <ChevronRight className="size-5" />
      </Button>
      <div className="mt-3 flex justify-center gap-1.5 sm:mt-4">
        {slides.map((s, i) => (
          <button
            key={s.title + i}
            type="button"
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === selectedIndex
                ? "bg-primary w-6"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-1.5",
            )}
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
