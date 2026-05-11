import Link from "next/link";

import { WishlistContent } from "@/components/storefront/wishlist-content";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Wishlist",
};

export default function WishlistPage() {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-3 py-5 sm:px-4 sm:py-10 lg:max-w-6xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-sm">
            <Link className="text-foreground font-medium underline-offset-4 hover:underline" href="/shop">
              ← Shop
            </Link>
          </p>
          <h1 className="text-foreground mt-2 text-xl font-semibold tracking-tight sm:mt-3 sm:text-3xl">
            Wishlist
          </h1>
          <p className="text-muted-foreground max-w-md text-sm leading-relaxed max-sm:text-[0.8125rem] max-sm:leading-snug">
            Saved products — add to cart when you&apos;re ready.
          </p>
        </div>
        <Button variant="outline" className="hidden shrink-0 self-start sm:inline-flex sm:mt-9" asChild>
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
      <div className="mt-6 sm:mt-8">
        <WishlistContent />
      </div>
    </div>
  );
}
