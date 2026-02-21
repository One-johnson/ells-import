import { HeroCarousel } from "@/components/hero-carousel";
import { HomePromoBar } from "@/components/home-promo-bar";
import { HomeValueProps } from "@/components/home-value-props";
import { HomeFeaturedProducts } from "@/components/home-featured-products";
import { HomeShopBy } from "@/components/home-shop-by";
import { HomeCategories } from "@/components/home-categories";
import { HomeNewsletterCta } from "@/components/home-newsletter-cta";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col">
      <HeroCarousel />
      <HomePromoBar />

      <HomeValueProps />

      <HomeFeaturedProducts />

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 text-center">
        <p className="text-muted-foreground">
          Can&apos;t find it? Browse by category or get in touch.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/shop"
            className="rounded-lg bg-[#5c4033] px-5 py-2.5 text-sm font-medium text-[#f5f0e8] transition-colors hover:bg-[#4a3328] dark:bg-[#8b6914] dark:hover:bg-[#7a5c12]"
          >
            Shop all
          </Link>
          <Link
            href="/categories"
            className="rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Browse categories
          </Link>
        </div>
      </section>

      <HomeShopBy />

      <HomeCategories />

      <HomeNewsletterCta />
    </div>
  );
}
