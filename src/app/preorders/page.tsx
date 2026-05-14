import { PreordersContent } from "@/components/storefront/preorders-content";

export const metadata = {
  title: "Pre-orders",
};

export default function PreordersPage() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Pre-orders · China → Ghana</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Pay the product price now. After your monthly round closes (end of the 28th UTC), we consolidate shipping from
          China; goods typically arrive in Ghana within 6–8 weeks. Shipping is then invoiced separately using total CBM
          (cubic metres) for your lines.
        </p>
      </div>
      <PreordersContent />
    </div>
  );
}
