"use client";

import { CheckCircle2, Download, Share } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { isLikelyIos } from "@/lib/pwa-install";
import { cn } from "@/lib/utils";

type AccountInstallAppCardProps = {
  id?: string;
  /** Shown under the main description when relevant (e.g. user dismissed the floating install banner). */
  footnote?: string;
  className?: string;
};

export function AccountInstallAppCard({ id, footnote, className }: AccountInstallAppCardProps) {
  const { installed, deferred, installing, install } = usePwaInstall({
    iosHintDelayMs: null,
    respectBannerDismiss: false,
  });

  const showIosHelp = !installed && !deferred && isLikelyIos();

  return (
    <Card
      id={id}
      className={cn(
        "overflow-hidden border-emerald-700/35 bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-900 text-white shadow-lg shadow-emerald-900/25 transition motion-reduce:transition-none md:flex md:flex-col",
        className,
      )}
    >
      <CardHeader className="pb-3 md:flex-1">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm motion-reduce:backdrop-blur-none">
            {installed ? (
              <CheckCircle2 className="size-6" aria-hidden />
            ) : deferred ? (
              <Download className="size-6" aria-hidden />
            ) : (
              <Share className="size-6" aria-hidden />
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg text-white">
              {installed ? "App installed" : deferred ? "Install app" : "Add to Home Screen"}
            </CardTitle>
            <CardDescription className="text-pretty text-emerald-50/95">
              {installed
                ? "You are using the installed version of this shop. Open it anytime from your home screen."
                : deferred
                  ? "Install Ells Import on this device for quick access, like a native app."
                  : showIosHelp
                    ? 'On iPhone or iPad: tap Share in Safari, then "Add to Home Screen".'
                    : "When your browser offers it, use Install app or Add to Home screen from the browser menu (often under ⋮ or Share)."}
            </CardDescription>
            {footnote ? (
              <p className="text-emerald-50/85 border-emerald-400/25 mt-2 border-t border-dashed pt-2 text-xs leading-relaxed">
                {footnote}
              </p>
            ) : null}
          </div>
        </div>
      </CardHeader>
      {deferred ? (
        <CardContent className="pt-0 md:mt-auto">
          <Button
            type="button"
            variant="secondary"
            className="bg-white text-emerald-900 hover:bg-emerald-50 motion-reduce:transition-none"
            disabled={installing}
            onClick={() => void install()}
          >
            {installing ? "Installing…" : "Install"}
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
