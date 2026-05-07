"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ChevronDown, Loader2, Package } from "lucide-react";

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { orderStatusLabel } from "@/components/admin/labels";
import {
  AccountOrderDetailView,
  type AccountOrderStorefrontSettings,
} from "@/components/account/account-order-detail-view";
import { AccountPageSkeleton } from "@/components/account/account-page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { publicRef } from "@/lib/public-ref";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { formatPrice } from "@/lib/formatPrice";

function orderStatusBadgeVariant(status: Doc<"orders">["status"]) {
  switch (status) {
    case "pending":
      return "warning" as const;
    case "processing":
      return "default" as const;
    case "paid":
    case "shipped":
    case "delivered":
      return "success" as const;
    case "cancelled":
    case "refunded":
      return "destructive" as const;
    default:
      return "muted" as const;
  }
}

function ordersSummaryLine(orders: Doc<"orders">[]) {
  const n = orders.length;
  const inProgress = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
  const fulfilled = orders.filter((o) =>
    o.status === "paid" || o.status === "shipped" || o.status === "delivered",
  ).length;
  const closed = orders.filter((o) => o.status === "cancelled" || o.status === "refunded").length;
  const parts = [`${n} ${n === 1 ? "order" : "orders"}`];
  if (inProgress > 0) {
    parts.push(`${inProgress} in progress`);
  }
  if (fulfilled > 0) {
    parts.push(`${fulfilled} fulfilled`);
  }
  if (closed > 0) {
    parts.push(`${closed} closed`);
  }
  return parts.join(" · ");
}

function OrderInlineDetail({
  orderId,
  sessionToken,
  open,
  storefront,
  user,
}: {
  orderId: Id<"orders">;
  sessionToken: string;
  open: boolean;
  storefront: AccountOrderStorefrontSettings | undefined;
  user: ReturnType<typeof useAuth>["user"];
}) {
  const data = useQuery(api.orders.getWithItems, open ? { orderId, sessionToken } : "skip");

  if (!open) {
    return null;
  }
  if (data === undefined) {
    return (
      <div className="text-muted-foreground flex justify-center py-8">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </div>
    );
  }
  if (data === null) {
    return <p className="text-muted-foreground py-4 text-sm">We couldn&apos;t load this order.</p>;
  }
  return <AccountOrderDetailView data={data} storefront={storefront} user={user} embedded />;
}

export function OrdersContent() {
  const { isLoading, isAuthenticated, sessionToken, user } = useAuth();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<Id<"orders"> | null>(null);
  const orders = useQuery(api.orders.myOrders, sessionToken ? { sessionToken, limit: 50 } : "skip");
  const storefront = useQuery(api.settings.storefrontSettings);

  const summaryText = useMemo(() => (orders && orders.length > 0 ? ordersSummaryLine(orders) : null), [orders]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/account/orders")}`);
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || !sessionToken) {
    return <AccountPageSkeleton />;
  }

  if (orders === undefined) {
    return <AccountPageSkeleton />;
  }

  if (orders.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center px-6 py-14 text-center">
          <div className="bg-muted mb-5 flex size-14 items-center justify-center rounded-full">
            <Package className="text-muted-foreground size-7" aria-hidden />
          </div>
          <h2 className="text-foreground text-lg font-semibold tracking-tight">No orders yet</h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
            When you place an order, it will show up here with status updates and full details.
          </p>
          <Button className="mt-8" asChild>
            <Link href="/shop">Browse the shop</Link>
          </Button>
          <Button variant="ghost" className="mt-2" asChild>
            <Link href="/account">Back to account</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {summaryText ? (
        <p className="text-muted-foreground text-sm tabular-nums">{summaryText}</p>
      ) : null}
      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <ul className="divide-border divide-y" role="list">
            {orders.map((o) => {
              const isOpen = expandedId === o._id;
              const created = o.createdAt;
              return (
                <li key={o._id} className="flex flex-col">
                  <Collapsible open={isOpen} onOpenChange={(open) => setExpandedId(open ? o._id : null)}>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "hover:bg-muted/50 flex w-full gap-3 px-4 py-4 text-left transition-colors sm:items-center sm:gap-4",
                          "focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                        )}
                      >
                        <div
                          className="bg-muted/80 text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg"
                          aria-hidden
                        >
                          <Package className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-foreground font-medium">
                            Order {o.publicCode ? `#${publicRef(o.publicCode)}` : o._id.slice(0, 8)}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                            {o.invoiceNumber ? (
                              <span className="text-foreground text-xs font-medium tabular-nums">
                                Invoice #{publicRef(o.invoiceNumber)}
                              </span>
                            ) : null}
                            {o.invoiceNumber ? (
                              <span className="text-muted-foreground text-xs" aria-hidden>
                                ·
                              </span>
                            ) : null}
                            <span className="text-muted-foreground text-xs">
                              {new Date(created).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                            <span className="text-muted-foreground text-xs" aria-hidden>
                              ·
                            </span>
                            <span className="text-muted-foreground text-xs">{formatRelativeTime(created)}</span>
                            <Badge variant={orderStatusBadgeVariant(o.status)} className="font-normal">
                              {orderStatusLabel(o.status)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                          <p className="text-foreground text-sm font-medium tabular-nums">
                            {formatPrice(o.totalCents, o.currency)}
                          </p>
                          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-medium">
                            <ChevronDown
                              className={cn("size-4 shrink-0 transition-transform", isOpen && "rotate-180")}
                              aria-hidden
                            />
                            {isOpen ? "Hide" : "View"}
                          </span>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="bg-muted/20 border-border border-t px-4 py-4 sm:px-6">
                        <OrderInlineDetail
                          orderId={o._id}
                          sessionToken={sessionToken}
                          open={isOpen}
                          storefront={storefront}
                          user={user}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
