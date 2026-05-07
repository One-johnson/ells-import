import dynamic from "next/dynamic";

import { HomeStorefrontIntro } from "@/components/home-storefront-intro";
import { HomeCatalog } from "@/components/storefront/home-catalog";
import { HeroCarouselSkeleton } from "@/components/storefront/hero-carousel-skeleton";

const HeroCarousel = dynamic(
  () =>
    import("@/components/storefront/hero-carousel").then((m) => ({
      default: m.HeroCarousel,
    })),
  { loading: () => <HeroCarouselSkeleton /> },
);

export default function Home() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="w-full max-w-full shrink-0">
        <HeroCarousel />
      </div>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <HomeStorefrontIntro />
        <HomeCatalog />
      </div>
    </div>
  );
}
