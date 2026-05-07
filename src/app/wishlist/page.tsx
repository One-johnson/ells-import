import Link from "next/link";

import { WishlistContent } from "@/components/storefront/wishlist-content";

export const metadata = {
  title: "Wishlist",
};

export default function WishlistPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-8">
      <p className="text-muted-foreground text-sm">
        <Link className="text-foreground font-medium underline-offset-4 hover:underline" href="/shop">
          ← Shop
        </Link>
      </p>
      <h1 className="text-foreground mt-4 text-2xl font-semibold tracking-tight">Wishlist</h1>
      <p className="text-muted-foreground mt-1 text-sm">Saved products — add to cart when you’re ready.</p>
      <div className="mt-6">
        <WishlistContent />
      </div>
    </div>
  );
}
