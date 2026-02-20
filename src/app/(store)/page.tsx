import { HeroCarousel } from "@/components/hero-carousel";
import { HomeValueProps } from "@/components/home-value-props";
import { HomeCategories } from "@/components/home-categories";
import { HomeFeaturedProducts } from "@/components/home-featured-products";
import { HomeNewsletterCta } from "@/components/home-newsletter-cta";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col">
      <HeroCarousel />
      <HomeValueProps />
      <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Quality imports, delivered to your door
        </h2>
        <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
          Explore our curated selection of products from around the world. Fast shipping and easy returns.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/shop"
            className="rounded-lg bg-[#5c4033] px-6 py-3 text-sm font-medium text-[#f5f0e8] transition-colors hover:bg-[#4a3328] dark:bg-[#8b6914] dark:hover:bg-[#7a5c12]"
          >
            Shop all
          </Link>
          <Link
            href="/categories"
            className="rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Browse categories
          </Link>
        </div>
      </section>
      <HomeCategories />
      <HomeFeaturedProducts />
      <HomeNewsletterCta />
    </div>
  );
}
