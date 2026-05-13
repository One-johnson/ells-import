"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";

/**
 * Top padding for fixed header; add extra space when the optional announcement bar is shown.
 * Bottom padding on small screens clears the fixed mobile bottom nav (hidden on md+ and in admin).
 */
export function StorefrontMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const s = useQuery(api.settings.storefrontSettings);
  const hasAnnouncement = Boolean(s?.announcementText?.trim());
  const hideBottomNav = pathname.startsWith("/admin");

  return (
    <main
      className={cn(
        "min-h-0 w-full min-w-0 flex-1 print:min-h-0 print:pt-0",
        hasAnnouncement
          ? "pt-[calc(10.75rem+env(safe-area-inset-top,0px))] sm:pt-[calc(5.5rem+env(safe-area-inset-top,0px))]"
          : "pt-[calc(9rem+env(safe-area-inset-top,0px))] sm:pt-[calc(3.5rem+env(safe-area-inset-top,0px))]",
        !hideBottomNav &&
          "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-0",
      )}
    >
      {children}
    </main>
  );
}
