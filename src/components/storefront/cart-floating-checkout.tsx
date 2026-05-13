"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/formatPrice";
import { cn } from "@/lib/utils";

type CartFloatingCheckoutProps = {
  subtotalCents: number;
  currency: string;
  checkoutHref: string;
  checkoutLabel: string;
};

export function CartFloatingCheckout({
  subtotalCents,
  currency,
  checkoutHref,
  checkoutLabel,
}: CartFloatingCheckoutProps) {
  return (
    <div
      className={cn(
        "border-border bg-background/95 supports-[backdrop-filter]:bg-background/90",
        "fixed inset-x-0 bottom-0 z-[75] border-t pt-3 shadow-[0_-8px_30px_-4px_rgba(0,0,0,0.08)] backdrop-blur-md",
        "pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:hidden print:hidden",
      )}
      role="region"
      aria-label="Checkout summary"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-end gap-2 gap-y-2 px-4 pb-1">
        <div className="mr-auto min-w-0">
          <p className="text-muted-foreground text-xs">Subtotal</p>
          <p className="text-foreground truncate text-lg font-semibold tabular-nums">
            {formatPrice(subtotalCents, currency)}
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link href="/shop">Shop</Link>
        </Button>
        <Button className="shrink-0 px-5" asChild>
          <Link href={checkoutHref}>{checkoutLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
