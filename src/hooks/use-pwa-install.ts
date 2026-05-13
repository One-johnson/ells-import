"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  type BeforeInstallPromptEvent,
  dismissPwaInstallBanner,
  isInstalledPwa,
  isLikelyIos,
  isPwaInstallBannerDismissed,
} from "@/lib/pwa-install";

export type UsePwaInstallOptions = {
  /** When true, effects do not run (e.g. hide floating banner on account). */
  skip?: boolean;
  /** Delay before showing iOS “Add to Home Screen” hint; `0` = next tick; `null` = never (hook consumer handles iOS UI). */
  iosHintDelayMs: number | null;
  /** Honor banner dismiss localStorage (floating banner only). */
  respectBannerDismiss: boolean;
};

export function usePwaInstall(options: UsePwaInstallOptions) {
  const { skip = false, iosHintDelayMs, respectBannerDismiss } = options;
  const isIosDevice = useMemo(() => (typeof navigator !== "undefined" ? isLikelyIos() : false), []);

  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (skip) {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setInstalled(isInstalledPwa());
      }
    });
    const onAppInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      cancelled = true;
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [skip]);

  useEffect(() => {
    if (skip || installed) {
      return;
    }
    if (respectBannerDismiss && isPwaInstallBannerDismissed()) {
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setIosHint(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (iosHintDelayMs !== null && isLikelyIos()) {
      const showIos = () => {
        if (isInstalledPwa()) {
          return;
        }
        if (respectBannerDismiss && isPwaInstallBannerDismissed()) {
          return;
        }
        setIosHint(true);
      };
      if (iosHintDelayMs <= 0) {
        queueMicrotask(showIos);
      } else {
        timer = setTimeout(showIos, iosHintDelayMs);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [skip, installed, iosHintDelayMs, respectBannerDismiss]);

  const install = useCallback(async () => {
    if (!deferred) {
      return;
    }
    setInstalling(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* user dismissed native sheet */
    } finally {
      setInstalling(false);
      setDeferred(null);
    }
  }, [deferred]);

  const dismissBanner = useCallback(() => {
    dismissPwaInstallBanner();
    setDeferred(null);
    setIosHint(false);
  }, []);

  return {
    installed,
    deferred,
    iosHint,
    installing,
    install,
    dismissBanner,
    isIosDevice,
  };
}
