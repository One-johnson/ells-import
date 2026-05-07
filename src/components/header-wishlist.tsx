"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

export function HeaderWishlist() {
  const { sessionToken } = useAuth();
  const rows = useQuery(api.wishlist.listMine, sessionToken ? { sessionToken } : { sessionToken: undefined });
  const count = rows?.length ?? 0;

  if (!sessionToken) {
    return null;
  }

  return (
    <Button type="button" variant="ghost" size="icon" className="relative shrink-0" asChild>
      <Link href="/wishlist" aria-label={count > 0 ? `Wishlist, ${count} items` : "Wishlist"}>
        <Heart className="size-5" />
        {count > 0 ? (
          <span
            className={cn(
              "bg-primary text-primary-foreground pointer-events-none absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full px-1 text-[0.65rem] font-medium tabular-nums",
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
