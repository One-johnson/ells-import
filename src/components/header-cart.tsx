"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useQuery } from "convex/react";
import { ConvexImage } from "@/components/convex-image";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCartSummary, type CartLineWithProduct } from "@/hooks/use-cart-summary";
import { cn } from "@/lib/utils";

function CartHoverSummary({ items }: { items: CartLineWithProduct[] }) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground px-1 py-2 text-center text-sm">Your cart is empty.</p>
    );
  }

  return (
    <ScrollArea className="max-h-[min(280px,45vh)]">
      <ul className="flex flex-col gap-2 pr-3">
        {items.map((line) => {
          const name = line.product?.name ?? "Unavailable product";
          const thumb = line.thumbnailUrl;
          return (
            <li key={line._id} className="flex gap-2.5">
              <div className="bg-muted relative size-11 shrink-0 overflow-hidden rounded-md border">
                {thumb ? (
                  <ConvexImage
                    src={thumb}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="44px"
                    priority={false}
                  />
                ) : (
                  <span className="text-muted-foreground flex size-full items-center justify-center text-[0.65rem]">
                    —
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground line-clamp-2 text-sm leading-snug">{name}</p>
                <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">Qty {line.quantity}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
}

type GuestCartProductSummary = {
  _id: string;
  name: string;
  slug: string;
  priceCents: number;
  currency: string;
  stock: number;
  status: "draft" | "active" | "archived";
  thumbnailUrl: string | null;
};

function GuestCartHoverSummary({
  lines,
  products,
}: {
  lines: { productId: string; quantity: number }[];
  products: GuestCartProductSummary[] | undefined;
}) {
  if (lines.length === 0) {
    return <p className="text-muted-foreground px-1 py-2 text-center text-sm">Your cart is empty.</p>;
  }
  if (products === undefined) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }
  const byId = new Map(products.map((p) => [p._id, p]));
  const visible = lines
    .map((l) => ({ line: l, product: byId.get(l.productId) ?? null }))
    .filter((x) => x.product && x.product.status === "active");
  if (visible.length === 0) {
    return <p className="text-muted-foreground px-1 py-2 text-center text-sm">Your cart is empty.</p>;
  }
  return (
    <ScrollArea className="max-h-[min(280px,45vh)]">
      <ul className="flex flex-col gap-2 pr-3">
        {visible.map(({ line, product }) => (
          <li key={line.productId} className="flex gap-2.5">
            <div className="bg-muted relative size-11 shrink-0 overflow-hidden rounded-md border">
              {product!.thumbnailUrl ? (
                <ConvexImage
                  src={product!.thumbnailUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="44px"
                  priority={false}
                />
              ) : (
                <span className="text-muted-foreground flex size-full items-center justify-center text-[0.65rem]">
                  —
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground line-clamp-2 text-sm leading-snug">{product!.name}</p>
              <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">Qty {line.quantity}</p>
            </div>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

export function HeaderCart() {
  const { count, sessionToken, guestLines, items, data } = useCartSummary();
  const guestProducts = useQuery(
    api.products.getManyForCart,
    !sessionToken && guestLines.length > 0
      ? { productIds: guestLines.map((l) => l.productId as Id<"products">) }
      : { productIds: [] },
  ) as GuestCartProductSummary[] | undefined;

  const badge =
    count > 0 ? (
      <span
        className={cn(
          "bg-primary text-primary-foreground pointer-events-none absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full px-1 text-[0.65rem] font-medium tabular-nums",
        )}
      >
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  const triggerInner = (
    <>
      <ShoppingCart className="size-5" />
      {badge}
    </>
  );

  const desktop = (
    <>
      {!sessionToken ? (
        <HoverCard openDelay={250} closeDelay={120}>
          <HoverCardTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="relative shrink-0" asChild>
              <Link href="/cart" aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}>
                {triggerInner}
              </Link>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent align="end" side="bottom" className="w-80 p-3">
            <p className="text-foreground mb-2 border-b pb-2 text-xs font-semibold tracking-wide uppercase">
              Cart
            </p>
            <GuestCartHoverSummary lines={guestLines} products={guestProducts} />
          </HoverCardContent>
        </HoverCard>
      ) : (
        <HoverCard openDelay={250} closeDelay={120}>
          <HoverCardTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="relative shrink-0" asChild>
              <Link href="/cart" aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}>
                {triggerInner}
              </Link>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent align="end" side="bottom" className="w-80 p-3">
            <p className="text-foreground mb-2 border-b pb-2 text-xs font-semibold tracking-wide uppercase">
              Cart
            </p>
            {data === undefined ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : (
              <CartHoverSummary items={items} />
            )}
          </HoverCardContent>
        </HoverCard>
      )}
    </>
  );

  return <div className="hidden md:block">{desktop}</div>;
}
