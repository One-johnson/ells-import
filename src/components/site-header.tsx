"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { X } from "lucide-react";

import { AppBrandLogoImage } from "@/components/app-brand-logo";
import { GlobalSearch } from "@/components/global-search";
import { HeaderCart } from "@/components/header-cart";
import { HeaderNotifications } from "@/components/header-notifications";
import { HeaderUserMenu } from "@/components/header-user-menu";
import { HeaderWishlist } from "@/components/header-wishlist";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

function SearchFieldFallback() {
  return (
    <div
      className="bg-muted/40 h-9 w-full min-w-0 max-w-md animate-pulse rounded-md lg:max-w-lg"
      aria-hidden
    />
  );
}

const ANNOUNCEMENT_DISMISS_KEY = "ells-import:announcement-dismiss";

export function SiteHeader() {
  const { isLoading, isAuthenticated, isAdmin, user, sessionToken } = useAuth();
  const storefront = useQuery(api.settings.storefrontSettings);
  const brand = storefront?.storeName?.trim() ?? "";
  const announcement = storefront?.announcementText?.trim() ?? "";
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  useEffect(() => {
    if (!announcement) {
      queueMicrotask(() => setShowAnnouncement(false));
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    queueMicrotask(() => {
      const dismissed = localStorage.getItem(ANNOUNCEMENT_DISMISS_KEY);
      setShowAnnouncement(dismissed !== announcement);
    });
  }, [announcement]);

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-border fixed top-0 z-50 w-full border-b pt-[env(safe-area-inset-top,0px)] backdrop-blur print:hidden">
      {announcement && showAnnouncement && (
        <div className="bg-primary/10 border-border flex items-center justify-center gap-2 border-b px-3 py-1.5 text-center text-xs sm:text-sm">
          <p className="text-foreground min-w-0 flex-1 leading-snug">{announcement}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            aria-label="Dismiss announcement"
            onClick={() => {
              setShowAnnouncement(false);
              localStorage.setItem(ANNOUNCEMENT_DISMISS_KEY, announcement);
            }}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}
      <div className="mx-auto w-full max-w-6xl px-3 py-2 sm:px-4 sm:py-0">
        {/* Mobile top bar: notifications far-left, brand centered, avatar stays right */}
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-1 md:hidden">
          <div className="flex shrink-0 justify-start">
            {isLoading ? (
              <span className="text-muted-foreground px-2 text-xs">…</span>
            ) : isAuthenticated && user && sessionToken ? (
              <HeaderNotifications sessionToken={sessionToken} />
            ) : (
              <span className="w-9" aria-hidden />
            )}
          </div>

          <div className="flex min-w-0 justify-center px-1">
            <Link
              href="/"
              aria-label="Home"
              className="text-foreground flex max-w-full flex-col items-center gap-1.5"
            >
              <AppBrandLogoImage size={56} />
              {brand ? (
                <span className="w-full truncate text-center text-xs font-semibold leading-none tracking-tight">
                  {brand}
                </span>
              ) : storefront === undefined ? (
                <span className="text-muted-foreground text-xs leading-none">…</span>
              ) : (
                <span className="sr-only">Home</span>
              )}
            </Link>
          </div>

          <nav className="flex shrink-0 items-center gap-1">
            <HeaderCart />
            {isLoading ? null : isAuthenticated && user && sessionToken ? (
              <HeaderUserMenu user={user} isAdmin={isAdmin} />
            ) : (
              <Button size="sm" variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </nav>
        </div>

        {/* Desktop / tablet header */}
        <div className="hidden w-full items-center gap-x-2 gap-y-2 md:flex md:flex-wrap md:py-0 md:min-h-14 md:gap-3">
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <Link
              href="/"
              className="text-foreground flex min-w-0 max-w-[min(100%,16rem)] items-center gap-3 sm:max-w-xs"
              aria-label="Home"
            >
              <AppBrandLogoImage size={56} priority />
              <span className="truncate text-sm font-semibold tracking-tight">
                {brand || <span className="sr-only">Home</span>}
              </span>
            </Link>
            <Link
              href="/shop"
              className="text-muted-foreground hover:text-foreground hidden text-xs font-medium transition md:inline md:text-sm"
            >
              Shop
            </Link>
          </div>

          <div className="min-w-0 flex-1 sm:max-w-md lg:max-w-lg">
            <Suspense fallback={<SearchFieldFallback />}>
              <GlobalSearch />
            </Suspense>
          </div>

          <nav className="ml-auto flex shrink-0 items-center gap-2">
            <HeaderCart />
            {isLoading ? (
              <span className="text-muted-foreground px-2 text-xs">…</span>
            ) : isAuthenticated && user && sessionToken ? (
              <>
                <HeaderWishlist />
                <HeaderNotifications sessionToken={sessionToken} />
                <HeaderUserMenu user={user} isAdmin={isAdmin} />
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">Register</Link>
                </Button>
              </>
            )}
          </nav>
        </div>

        {/* Mobile search row */}
        <div className="mt-2 w-full md:hidden">
          <Suspense fallback={<SearchFieldFallback />}>
            <GlobalSearch />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
