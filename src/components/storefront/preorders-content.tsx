"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { formatPrice } from "@/lib/formatPrice";
import { Button } from "@/components/ui/button";
import { PreorderRoundProgress } from "@/components/storefront/preorder-round-progress";

export function PreordersContent() {
  const rows = useQuery(api.products.listPreorderStorefront);

  if (rows === undefined) {
    return <p className="text-muted-foreground text-sm">Loading pre-orders…</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-10 text-center">
        <p className="text-foreground font-medium">No open pre-order rounds right now</p>
        <p className="text-muted-foreground mt-2 text-sm">
          When the store opens a monthly round, products will appear here. Delivery is 6–8 weeks after the round closes
          (end of the 28th UTC each month).
        </p>
        <Button className="mt-4" asChild variant="outline">
          <Link href="/shop">Browse in-stock shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
      {rows.map((row) => {
        const thumb = row.thumbnailUrl;
        return (
          <li
            key={row._id}
            className="bg-card flex flex-col overflow-hidden rounded-md border shadow-xs sm:rounded-lg"
          >
            <Link href={`/products/${row.slug}`} className="block shrink-0">
              <div className="bg-muted/30 relative h-[96px] w-full sm:h-[112px]">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL
                  <img src={thumb} alt="" className="size-full object-cover" />
                ) : (
                  <div className="text-muted-foreground flex size-full items-center justify-center px-2 text-center text-[10px] sm:text-xs">
                    No image
                  </div>
                )}
              </div>
            </Link>
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2 sm:gap-2 sm:p-2.5">
              <div className="min-h-0">
                <p className="text-muted-foreground text-[9px] font-medium tracking-wide uppercase sm:text-[10px]">
                  Pre-order
                </p>
                <Link
                  href={`/products/${row.slug}`}
                  className="text-foreground line-clamp-2 text-xs font-semibold leading-snug hover:underline sm:text-sm"
                >
                  {row.name}
                </Link>
              </div>
              {row.round ? (
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-[10px] leading-tight sm:text-xs">
                    <span className="text-foreground font-medium">{row.round.label}</span>
                  </p>
                  <PreorderRoundProgress monthKey={row.round.monthKey} closesAt={row.round.closesAt} />
                </div>
              ) : null}
              <p className="text-foreground mt-auto text-xs font-semibold tabular-nums sm:text-sm">
                {formatPrice(row.priceCents, row.currency)}
              </p>
              <Button asChild size="sm" variant="secondary" className="h-8 w-full px-2 text-xs sm:h-9">
                <Link href={`/products/${row.slug}`}>Details</Link>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
