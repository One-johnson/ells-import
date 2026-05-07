"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { formatPrice } from "@/lib/formatPrice";
import { publicRef } from "@/lib/public-ref";
import { SearchResultsSkeleton } from "@/components/search/search-results-skeleton";

function SearchContentInner() {
  const searchParams = useSearchParams();
  const qParam = (searchParams.get("q") ?? "").trim();
  const results = useQuery(
    api.products.searchActive,
    qParam ? { q: qParam } : "skip",
  );

  if (qParam.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Use the search field in the header to look up products by name, SKU, description, or 6-digit
        reference.
      </p>
    );
  }

  if (results === undefined) {
    return <SearchResultsSkeleton />;
  }

  if (results.length === 0) {
    return (
      <p className="text-muted-foreground text-sm" aria-live="polite">
        No products found for &quot;{qParam}&quot;.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border" role="list">
      {results.map((p) => (
        <li key={p._id} className="px-4 py-3 first:pt-3 last:pb-3">
          <Link
            href={`/products/${encodeURIComponent(p.slug)}`}
            className="group flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-4"
          >
            {p.thumbnailUrl ? (
              <div className="bg-muted/30 border-border aspect-[4/3] w-full overflow-hidden rounded-md border sm:h-20 sm:w-20 sm:shrink-0 sm:aspect-square">
                <img
                  src={p.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <p className="text-foreground group-hover:underline font-medium">{p.name}</p>
                  <p className="text-muted-foreground font-mono text-xs tabular-nums">
                    Ref {publicRef(p.publicCode)}
                  </p>
                </div>
                <p className="text-foreground/90 text-sm tabular-nums sm:text-right">
                  {formatPrice(p.priceCents, p.currency)}
                </p>
              </div>
              {p.description ? (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{p.description}</p>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SearchContent() {
  return <SearchContentInner />;
}
