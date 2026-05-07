"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { X } from "lucide-react";

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

const DEFAULT_STORE_NAME = "Ells Import";
const ANNOUNCEMENT_DISMISS_KEY = "ells-import:announcement-dismiss";

export function SiteHeader() {
  const { isLoading, isAuthenticated, isAdmin, user, sessionToken } = useAuth();
  const storefront = useQuery(api.settings.storefrontSettings);
  const brand = storefront?.storeName?.trim() || DEFAULT_STORE_NAME;
  const announcement = storefront?.announcementText?.trim() ?? "";
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  useEffect(() => {
    if (!announcement) {
      setShowAnnouncement(false);
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const dismissed = localStorage.getItem(ANNOUNCEMENT_DISMISS_KEY);
    setShowAnnouncement(dismissed !== announcement);
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
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2 sm:min-h-14 sm:gap-3 sm:px-4 sm:py-0">
        <div className="order-1 flex min-w-0 shrink-0 items-center gap-2 sm:order-1 sm:gap-3">
          <Link href="/" className="text-foreground text-sm font-semibold tracking-tight">
            {brand}
          </Link>
          <Link
            href="/shop"
            className="text-muted-foreground hover:text-foreground text-xs font-medium transition sm:text-sm"
          >
            Shop
          </Link>
        </div>
        <div className="order-3 w-full min-w-0 sm:order-2 sm:w-auto sm:max-w-md sm:flex-1 lg:max-w-lg">
          <Suspense fallback={<SearchFieldFallback />}>
            <GlobalSearch />
          </Suspense>
        </div>
        <nav className="order-2 ml-auto flex shrink-0 items-center gap-1 sm:order-3 sm:gap-2">
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
    </header>
  );
}
