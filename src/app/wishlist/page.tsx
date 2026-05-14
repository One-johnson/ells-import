import Link from "next/link";

import { WishlistContent } from "@/components/storefront/wishlist-content";

export const metadata = {
  title: "Wishlist",
};

export default function WishlistPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 lg:max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wishlist</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Saved products — add to cart when you&apos;re ready.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/shop" className="text-foreground font-medium underline-offset-4 hover:underline">
            ← Back to shop
          </Link>
        </p>
      </div>
      <WishlistContent />
    </div>
  );
}
