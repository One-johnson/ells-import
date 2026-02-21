import Link from "next/link";
import { Sparkles, ShoppingBag, Tags, Mail } from "lucide-react";

const links = [
  { href: "/shop", label: "New arrivals", icon: Sparkles },
  { href: "/shop", label: "Shop all", icon: ShoppingBag },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/contact", label: "Contact", icon: Mail },
] as const;

export function HomeShopBy() {
  return (
    <section className="border-y border-border bg-muted/10 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="sr-only">Quick links</h2>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-[#5c4033] dark:hover:text-[#c9a227]"
            >
              <Icon className="size-4 text-[#5c4033] dark:text-[#c9a227]" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
