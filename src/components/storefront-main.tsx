"use client";

import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";

/**
 * Top padding for fixed header; add extra space when the optional announcement bar is shown.
 */
export function StorefrontMain({ children }: { children: ReactNode }) {
  const s = useQuery(api.settings.storefrontSettings);
  const hasAnnouncement = Boolean(s?.announcementText?.trim());

  return (
    <main
      className={cn(
        "min-h-0 w-full min-w-0 flex-1 print:min-h-0 print:pt-0",
        hasAnnouncement
          ? "pt-[calc(9.25rem+env(safe-area-inset-top,0px))] sm:pt-[calc(5.5rem+env(safe-area-inset-top,0px))]"
          : "pt-[calc(7rem+env(safe-area-inset-top,0px))] sm:pt-[calc(3.5rem+env(safe-area-inset-top,0px))]",
      )}
    >
      {children}
    </main>
  );
}
