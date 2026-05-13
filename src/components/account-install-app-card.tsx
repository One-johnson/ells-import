"use client";

import { CheckCircle2, Download, Share } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { isLikelyIos } from "@/lib/pwa-install";

export function AccountInstallAppCard() {
  const { installed, deferred, installing, install } = usePwaInstall({
    iosHintDelayMs: null,
    respectBannerDismiss: false,
  });

  const showIosHelp = !installed && !deferred && isLikelyIos();

  return (
    <Card className="border-muted/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="bg-primary/15 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
            {installed ? (
              <CheckCircle2 className="size-6" aria-hidden />
            ) : deferred ? (
              <Download className="size-6" aria-hidden />
            ) : (
              <Share className="size-6" aria-hidden />
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">
              {installed ? "App installed" : deferred ? "Install app" : "Add to Home Screen"}
            </CardTitle>
            <CardDescription className="text-pretty">
              {installed
                ? "You are using the installed version of this shop. Open it anytime from your home screen."
                : deferred
                  ? "Install Ells Import on this device for quick access, like a native app."
                  : showIosHelp
                    ? 'On iPhone or iPad: tap Share in Safari, then "Add to Home Screen".'
                    : "When your browser offers it, use Install app or Add to Home screen from the browser menu (often under ⋮ or Share)."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      {deferred ? (
        <CardContent className="pt-0">
          <Button type="button" disabled={installing} onClick={() => void install()}>
            {installing ? "Installing…" : "Install"}
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
