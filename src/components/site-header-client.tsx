"use client";

import dynamic from "next/dynamic";

const SiteHeader = dynamic(
  () => import("./site-header").then((m) => m.SiteHeader),
  {
    ssr: false,
    loading: () => (
      <header
        className="bg-background/95 border-border fixed top-0 z-50 min-h-14 w-full border-b pt-[env(safe-area-inset-top,0px)] print:hidden"
        aria-hidden
      />
    ),
  },
);

export function SiteHeaderClient() {
  return <SiteHeader />;
}
