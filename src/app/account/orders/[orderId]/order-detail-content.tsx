"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { AccountOrderDetailView } from "@/components/account/account-order-detail-view";
import { AccountPageSkeleton } from "@/components/account/account-page-skeleton";
import { useAuth } from "@/providers/auth-provider";

export function OrderDetailContent() {
  const params = useParams();
  const pathname = usePathname();
  const orderId = typeof params.orderId === "string" ? (params.orderId as Id<"orders">) : null;
  const { isLoading, isAuthenticated, sessionToken, user } = useAuth();
  const router = useRouter();
  const storefront = useQuery(api.settings.storefrontSettings);
  const data = useQuery(
    api.orders.getWithItems,
    orderId && sessionToken ? { orderId, sessionToken } : "skip",
  );

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/account/orders")}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (!orderId) {
    return <p className="text-muted-foreground text-sm">Invalid order.</p>;
  }

  if (isLoading || !isAuthenticated || !sessionToken) {
    return <AccountPageSkeleton />;
  }

  if (data === undefined) {
    return <AccountPageSkeleton />;
  }

  if (data === null) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">We couldn&apos;t load this order, or you don&apos;t have access.</p>
        <Link href="/account/orders" className="text-foreground text-sm font-medium underline-offset-4 hover:underline">
          Back to orders
        </Link>
      </div>
    );
  }

  return <AccountOrderDetailView data={data} storefront={storefront} user={user} />;
}
