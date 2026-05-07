import { CartContent } from "./cart-content";

export const metadata = {
  title: "Cart",
};

export default function CartPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-8">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">Cart</h1>
      <div className="mt-6">
        <CartContent />
      </div>
    </div>
  );
}
