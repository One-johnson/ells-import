"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Heart, Home, Package, ShoppingCart, User } from "lucide-react";

import { useCartSummary } from "@/hooks/use-cart-summary";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

function NavItem({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-muted-foreground flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[0.65rem] font-medium transition-colors",
        active && "text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className="relative flex size-9 items-center justify-center">{children}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { count } = useCartSummary();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const accountHref = isAuthenticated ? "/account" : "/login";
  const accountActive =
    pathname.startsWith("/account") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register");

  const badge =
    count > 0 ? (
      <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[0.6rem] font-semibold leading-none tabular-nums">
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  return (
    <nav
      className="bg-background/95 supports-[backdrop-filter]:bg-background/85 border-border fixed right-0 bottom-0 left-0 z-[60] flex border-t pb-[env(safe-area-inset-bottom,0px)] backdrop-blur md:hidden print:hidden"
      aria-label="Primary"
    >
      <NavItem
        href="/"
        label="Home"
        active={
          pathname === "/" ||
          pathname.startsWith("/shop") ||
          pathname.startsWith("/categories") ||
          pathname.startsWith("/products")
        }
      >
        <Home className="size-5 shrink-0 stroke-[1.75]" aria-hidden />
      </NavItem>
      <NavItem href="/preorders" label="Pre-order" active={pathname.startsWith("/preorders")}>
        <Package className="size-5 shrink-0 stroke-[1.75]" aria-hidden />
      </NavItem>
      <NavItem href="/wishlist" label="Wishlist" active={pathname.startsWith("/wishlist")}>
        <Heart className="size-5 shrink-0 stroke-[1.75]" aria-hidden />
      </NavItem>
      <NavItem href="/cart" label="Cart" active={pathname.startsWith("/cart")}>
        <span className="relative inline-flex">
          <ShoppingCart className="size-5 shrink-0 stroke-[1.75]" aria-hidden />
          {badge}
        </span>
      </NavItem>
      <NavItem href={accountHref} label="Account" active={accountActive}>
        <User className="size-5 shrink-0 stroke-[1.75]" aria-hidden />
      </NavItem>
    </nav>
  );
}
