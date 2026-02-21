"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import { Tags } from "lucide-react";

export default function CategoriesPage() {
  const result = useQuery(api.categories.list, { limit: 100 });
  const categories = result?.items ?? [];
  const hasCategories = categories.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">Categories</h1>
      <p className="mt-2 text-muted-foreground">
        Browse by category. When you add categories in the admin, they appear here.
      </p>

      {hasCategories ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
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
      ) : (
        <div className="mt-12 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <Tags className="mx-auto size-14 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-medium text-foreground">
            No categories yet
          </h2>
          <p className="mt-2 max-w-sm mx-auto text-sm text-muted-foreground">
            Categories added in the admin dashboard will show up here.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex rounded-lg bg-[#5c4033] px-5 py-2.5 text-sm font-medium text-[#f5f0e8] transition-colors hover:bg-[#4a3328] dark:bg-[#8b6914] dark:hover:bg-[#7a5c12]"
          >
            View all products
          </Link>
        </div>
      )}
    </div>
  );
}
