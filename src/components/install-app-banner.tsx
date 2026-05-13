"use client";

import { Download, Share, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

export function InstallAppBanner() {
  const pathname = usePathname();
  const skip = pathname.startsWith("/admin") || pathname.startsWith("/account");
  const { installed, deferred, iosHint, installing, install, dismissBanner } = usePwaInstall({
    skip,
    iosHintDelayMs: 2200,
    respectBannerDismiss: true,
  });

  const visible = !skip && !installed && (Boolean(deferred) || iosHint);
  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "border-border bg-card/98 text-card-foreground shadow-lg md:hidden",
        "fixed right-3 left-3 z-[70] max-w-lg rounded-xl border px-3 py-2.5 backdrop-blur-md",
        "bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] print:hidden",
      )}
      role="region"
      aria-label="Install app"
    >
      <div className="flex gap-3">
        <div className="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          {deferred ? <Download className="size-5" aria-hidden /> : <Share className="size-5" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-foreground text-sm font-semibold leading-snug">
            {deferred ? "Install app" : "Add to Home Screen"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {deferred
              ? "Install Ells Import for quick access from your home screen."
              : 'Tap the Share button, then choose "Add to Home Screen".'}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {deferred ? (
              <Button type="button" size="sm" disabled={installing} onClick={() => void install()}>
                {installing ? "Installing…" : "Install"}
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="ghost" onClick={dismissBanner}>
              Not now
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-8 shrink-0"
          aria-label="Dismiss"
          onClick={dismissBanner}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
