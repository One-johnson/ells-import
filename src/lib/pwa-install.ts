export type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt: () => Promise<void>;
};

export const PWA_INSTALL_BANNER_DISMISS_KEY = "ells-import:pwa-install-dismissed";

export function isInstalledPwa(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const standaloneMq = window.matchMedia("(display-mode: standalone)").matches;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return standaloneMq || nav.standalone === true;
}

export function isLikelyIos(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) {
    return true;
  }
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isPwaInstallBannerDismissed(): boolean {
  try {
    return localStorage.getItem(PWA_INSTALL_BANNER_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissPwaInstallBanner(): void {
  try {
    localStorage.setItem(PWA_INSTALL_BANNER_DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}
