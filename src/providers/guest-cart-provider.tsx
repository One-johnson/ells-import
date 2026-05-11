"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { GuestCartLine } from "@/lib/guestCart";
import { readGuestCart, subscribeGuestCart } from "@/lib/guestCart";

type GuestCartContextValue = {
  lines: GuestCartLine[];
  isReady: boolean;
};

const GuestCartContext = createContext<GuestCartContextValue | null>(null);

export function GuestCartProvider({ children }: { children: ReactNode }) {
  const [isReady, setReady] = useState(false);
  const [lines, setLines] = useState<GuestCartLine[]>([]);

  useEffect(() => {
    setLines(readGuestCart());
    setReady(true);
    return subscribeGuestCart(() => setLines(readGuestCart()));
  }, []);

  const value = useMemo(() => ({ lines, isReady }), [lines, isReady]);
  return <GuestCartContext.Provider value={value}>{children}</GuestCartContext.Provider>;
}

export function useGuestCart() {
  const ctx = useContext(GuestCartContext);
  if (!ctx) {
    throw new Error("useGuestCart must be used within GuestCartProvider");
  }
  return ctx;
}

