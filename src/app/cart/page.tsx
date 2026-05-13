import Link from "next/link";

import { CartContent } from "./cart-content";

export const metadata = {
  title: "Cart",
};

export default function CartPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cart</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review your items and quantities before checkout.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/shop" className="text-foreground font-medium underline-offset-4 hover:underline">
            ← Back to shop
          </Link>
        </p>
      </div>
      <CartContent />
    </div>
  );
}
