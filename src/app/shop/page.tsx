import { ShopContent } from "@/components/storefront/shop-content";

export const metadata = {
  title: "Shop",
};

export default function ShopPage() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Shop</h1>
        <p className="text-muted-foreground mt-1 text-sm">Browse the catalog and open a product for details.</p>
      </div>
      <ShopContent />
    </div>
  );
}
