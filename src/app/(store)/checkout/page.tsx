import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">Checkout</h1>
      <p className="mt-2 text-muted-foreground">
        Checkout flow coming soon. Your cart is saved.
      </p>
      <Button asChild className="mt-4">
        <Link href="/cart">Back to cart</Link>
      </Button>
    </div>
  );
}
