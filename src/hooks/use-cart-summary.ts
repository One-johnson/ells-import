"use client";

import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useAuth } from "@/providers/auth-provider";
import { useGuestCart } from "@/providers/guest-cart-provider";

export type CartLineWithProduct = Doc<"cartItems"> & {
  product: Doc<"products"> | null;
  thumbnailUrl: string | null;
};

/** Shared cart query + counts for header and mobile nav (Convex dedupes identical subscriptions). */
export function useCartSummary() {
  const { sessionToken } = useAuth();
  const guest = useGuestCart();
  const data = useQuery(api.cart.getMine, sessionToken ? { sessionToken } : { sessionToken: undefined });
  const items = (data?.items ?? []) as CartLineWithProduct[];
  const guestCount = guest.lines.reduce((n, l) => n + l.quantity, 0);
  const count = sessionToken ? items.reduce((n, line) => n + line.quantity, 0) : guestCount;

  return { count, sessionToken, guestLines: guest.lines, items, data };
}
