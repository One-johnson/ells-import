import Link from "next/link";
import { Truck, BadgeCheck } from "lucide-react";

export function HomePromoBar() {
  return (
    <section className="border-b border-border bg-[#5c4033]/5 dark:bg-[#8b6914]/10">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Truck className="size-4 text-[#5c4033] dark:text-[#c9a227]" />
            Free shipping on orders over GH₵500
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="size-4 text-[#5c4033] dark:text-[#c9a227]" />
            30-day easy returns
          </span>
          <span className="hidden sm:inline">•</span>
          <Link
            href="/contact"
            className="font-medium text-[#5c4033] hover:underline dark:text-[#c9a227]"
          >
            Need help? Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}
