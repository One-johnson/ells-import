"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

export default function OrdersPage() {
  const { sessionToken } = useAuth();
  const result = useQuery(
    api.orders.list,
    sessionToken ? { sessionToken, limit: 50 } : "skip"
  );
  const orders = result?.items ?? [];
  const isLoggedIn = !!sessionToken;

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
        <p className="mt-2 text-muted-foreground">Sign in to view your orders.</p>
        <Button asChild className="mt-4">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
      <p className="mt-1 text-muted-foreground">Your order history and status.</p>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <Package className="mx-auto size-14 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">You haven&apos;t placed any orders yet.</p>
          <Button asChild className="mt-4">
            <Link href="/shop">Shop now</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {orders.map((order) => (
              <li key={order._id}>
                <Link
                  href={`/orders/${order._id}`}
                  className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/50 sm:px-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                      <Package className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Order #{order.orderNumber ?? String(order._id).slice(-8)}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {order.status.replace("_", " ")} · {order.items.length} item
                        {order.items.length !== 1 ? "s" : ""} · {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(order.total / 100)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
