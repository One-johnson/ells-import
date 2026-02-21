"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import { Tags, ArrowRight } from "lucide-react";

export function HomeCategories() {
  const result = useQuery(api.categories.list, { limit: 6 });
  const categories = result?.items ?? [];
  const isEmpty = categories.length === 0;

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Shop by category
        </h2>
        {!isEmpty && (
          <Link
            href="/categories"
            className="hidden text-sm font-medium text-[#5c4033] hover:underline dark:text-[#c9a227] sm:inline-flex items-center gap-1"
          >
            View all
            <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.slice(0, 6).map((cat) => (
            <Link
              key={cat._id}
              href={`/shop?category=${cat._id}`}
              className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:border-[#5c4033]/40 dark:hover:border-[#8b6914]/50"
            >
              <div className="aspect-[4/3] w-full bg-muted/50">
                {cat.image ? (
                  <Image
                    src={cat.image}
                    alt=""
                    fill
                    className="object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Tags className="size-12 opacity-50" />
                  </div>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <span className="font-medium text-white drop-shadow-sm">
                  {cat.name}
                </span>
              </div>
            </Link>
          ))}
      </div>
      {isEmpty && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Browse our categories to find what you need.
        </p>
      )}
    </section>
  );
}
