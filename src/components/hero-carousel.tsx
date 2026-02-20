"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    src: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80",
    alt: "Boutique store interior",
    title: "Curated for You",
    subtitle: "Discover quality imports from around the world.",
    cta: "Shop now",
    href: "/shop",
  },
  {
    src: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80",
    alt: "Shopping bags",
    title: "Free Shipping",
    subtitle: "On orders over GH₵500. Fast delivery to your door.",
    cta: "View offers",
    href: "/shop",
  },
  {
    src: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80",
    alt: "Product display",
    title: "New Arrivals",
    subtitle: "Fresh picks added weekly. Be the first to shop.",
    cta: "Explore",
    href: "/shop",
  },
  {
    src: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80",
    alt: "Gift boxes",
    title: "Gift Ready",
    subtitle: "Beautiful packaging for every occasion.",
    cta: "Find gifts",
    href: "/shop",
  },
  {
    src: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&q=80",
    alt: "Fashion retail",
    title: "Style & Quality",
    subtitle: "Where timeless style meets everyday comfort.",
    cta: "Shop collection",
    href: "/categories",
  },
  {
    src: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=80",
    alt: "Store shelf",
    title: "Ell's Import",
    subtitle: "Quality imports, delivered to your door.",
    cta: "Start shopping",
    href: "/shop",
  },
];

export function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", duration: 24 },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  );

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const autoplay = emblaApi.plugins()?.autoplay as { play: () => void } | undefined;
    autoplay?.play();
  }, [emblaApi]);

  return (
    <section className="relative w-full overflow-hidden bg-muted/30">
      <div className="embla viewport" ref={emblaRef}>
        <div className="embla__container flex">
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              className="embla__slide relative min-w-0 flex-[0_0_100%]"
            >
              <div className="relative aspect-[21/9] w-full sm:aspect-[3/1] md:aspect-[21/8]">
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority={i === 0}
                  unoptimized
                />
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent",
                    "flex flex-col justify-center px-6 text-white sm:px-10 md:px-16 lg:px-24"
                  )}
                >
                  <h2 className="text-2xl font-bold tracking-tight drop-shadow-sm sm:text-3xl md:text-4xl lg:text-5xl">
                    {slide.title}
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-white/90 sm:text-base md:text-lg">
                    {slide.subtitle}
                  </p>
                  <Link
                    href={slide.href}
                    className="mt-4 inline-flex w-fit items-center rounded-lg bg-[#5c4033] px-5 py-2.5 text-sm font-medium text-[#f5f0e8] shadow-lg transition-colors hover:bg-[#4a3328] dark:bg-[#8b6914] dark:hover:bg-[#7a5c12]"
                  >
                    {slide.cta}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Prev/Next buttons */}
      <button
        type="button"
        onClick={scrollPrev}
        aria-label="Previous slide"
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/50 sm:left-4"
      >
        <ChevronLeft className="size-6" />
      </button>
      <button
        type="button"
        onClick={scrollNext}
        aria-label="Next slide"
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/50 sm:right-4"
      >
        <ChevronRight className="size-6" />
      </button>
      {/* Dots */}
      <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-2">
        {SLIDES.map((_, i) => (
          <DotButton key={i} emblaApi={emblaApi} index={i} />
        ))}
      </div>
    </section>
  );
}

function DotButton({
  emblaApi,
  index,
}: {
  emblaApi: ReturnType<typeof useEmblaCarousel>[1];
  index: number;
}) {
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap() === index);
    emblaApi.on("select", () => setSelected(emblaApi.selectedScrollSnap() === index));
  }, [emblaApi, index]);

  return (
    <button
      type="button"
      onClick={() => emblaApi?.scrollTo(index)}
      aria-label={`Go to slide ${index + 1}`}
      className={cn(
        "h-2 w-2 rounded-full transition-all sm:h-2.5 sm:w-2.5",
        selected
          ? "bg-white scale-110"
          : "bg-white/50 hover:bg-white/80"
      )}
    />
  );
}
