"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import { SkeletonStatCard, SkeletonTable } from "@/components/skeletons";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { OrdersByStatusChart, OrdersByDayChart, CHART_COLORS } from "@/components/dashboard-charts";
import type { Id } from "convex/_generated/dataModel";
import {
  ShoppingCart,
  Clock,
  Banknote,
  Users,
  Package,
  TrendingUp,
  Award,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";

type OrderRow = {
  _id: Id<"orders">;
  orderNumber?: string;
  total: number;
  status: string;
  createdAt: number;
};

const orderColumns: ColumnDef<OrderRow>[] = [
  {
    accessorKey: "orderNumber",
    header: "Order #",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.orderNumber ?? String(row.original._id).slice(-8)}
      </span>
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => formatCurrency(row.original.total / 100),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <span className="capitalize">{row.original.status}</span>,
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("en-US", { dateStyle: "short" }),
  },
];

export default function AdminDashboardPage() {
  const { sessionToken } = useAuth();
  const orders = useQuery(
    api.orders.list,
    sessionToken ? { sessionToken, limit: 500 } : "skip"
  );
  const users = useQuery(
    api.users.list,
    sessionToken ? { sessionToken, limit: 1000 } : "skip"
  );
  const productsList = useQuery(
    api.products.list,
    sessionToken ? { limit: 500 } : "skip"
  );

  const isLoading = orders === undefined;

  const orderItems = orders?.items ?? [];
  const totalRevenue = orderItems
    .filter((o) => !["cancelled", "refunded"].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);
  const pendingCount = orderItems.filter((o) => o.status === "pending").length;
  const customerCount = useMemo(
    () => users?.items?.filter((u) => u.role === "customer").length ?? 0,
    [users]
  );
  const statusCounts = orderItems.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const chartData = Object.entries(statusCounts).map(([name, count]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    count,
  }));

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  const ordersByDay = last7Days.map((day) => {
    const next = day + 24 * 60 * 60 * 1000;
    const count = orderItems.filter(
      (o) => o.createdAt >= day && o.createdAt < next
    ).length;
    return {
      date: new Date(day).toLocaleDateString("en-US", { weekday: "short" }),
      orders: count,
    };
  });

  const mostPurchased = useMemo(() => {
    const byProduct: Record<string, { name: string; quantity: number }> = {};
    for (const order of orderItems) {
      if (["cancelled", "refunded"].includes(order.status)) continue;
      for (const item of order.items) {
        const key = item.productId;
        if (!byProduct[key]) byProduct[key] = { name: item.name, quantity: 0 };
        byProduct[key].quantity += item.quantity;
      }
    }
    return Object.entries(byProduct)
      .map(([id, { name, quantity }]) => ({ id, name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);
  }, [orderItems]);

  const topBuyers = useMemo(() => {
    const byUser: Record<string, { orderCount: number; totalSpent: number }> = {};
    for (const order of orderItems) {
      if (["cancelled", "refunded"].includes(order.status)) continue;
      const uid = order.userId;
      if (!byUser[uid]) byUser[uid] = { orderCount: 0, totalSpent: 0 };
      byUser[uid].orderCount += 1;
      byUser[uid].totalSpent += order.total;
    }
    const userList = users?.items ?? [];
    return Object.entries(byUser)
      .map(([userId, data]) => {
        const user = userList.find((u) => u._id === userId);
        return {
          userId,
          name: user?.name ?? "Unknown",
          image: user?.image,
          ...data,
        };
      })
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 8);
  }, [orderItems, users?.items]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your store and recent activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard label="Total orders" value={orderItems.length} icon={ShoppingCart} iconColor={CHART_COLORS[0]} />
            <StatCard label="Pending" value={pendingCount} icon={Clock} iconColor={CHART_COLORS[2]} />
            <StatCard
              label="Revenue"
              value={formatCurrency(totalRevenue / 100)}
              icon={Banknote}
              iconColor={CHART_COLORS[1]}
            />
            <StatCard label="Customers" value={customerCount} icon={Users} iconColor={CHART_COLORS[4]} />
            <StatCard label="Products" value={productsList?.items?.length ?? 0} icon={Package} iconColor={CHART_COLORS[3]} />
          </>
        )}
      </div>

      {!isLoading && (chartData.length > 0 || ordersByDay.some((d) => d.orders > 0)) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-medium mb-4">Orders by status</h3>
            <OrdersByStatusChart data={chartData} />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-medium mb-4">Orders (last 7 days)</h3>
            <OrdersByDayChart data={ordersByDay} />
          </div>
        </div>
      )}

      {!isLoading && (mostPurchased.length > 0 || topBuyers.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="size-5" style={{ color: CHART_COLORS[0] }} />
              Most purchased items
            </h3>
            {mostPurchased.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No data yet.</p>
            ) : (
              <ul className="space-y-2">
                {mostPurchased.map((item, i) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-md py-2 px-2 hover:bg-muted/50"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded text-xs font-medium text-white"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      >
                        {i + 1}
                      </span>
                      <span className="truncate text-sm">{item.name}</span>
                    </span>
                    <span className="text-sm font-medium shrink-0">{item.quantity} sold</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Award className="size-5" style={{ color: CHART_COLORS[1] }} />
              Top buyers
            </h3>
            {topBuyers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No data yet.</p>
            ) : (
              <ul className="space-y-2">
                {topBuyers.map((buyer, i) => (
                  <li
                    key={buyer.userId}
                    className="flex items-center justify-between gap-2 rounded-md py-2 px-2 hover:bg-muted/50"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {buyer.image ? (
                        <Image
                          src={buyer.image}
                          alt=""
                          width={28}
                          height={28}
                          className="size-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <span
                          className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        >
                          {buyer.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="truncate text-sm">{buyer.name}</span>
                    </span>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {buyer.orderCount} orders · {formatCurrency(buyer.totalSpent / 100)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-medium mb-4">Recent orders</h2>
        {isLoading ? (
          <SkeletonTable rows={5} cols={4} />
        ) : orderItems.length ? (
          <DataTable
            columns={orderColumns}
            data={orderItems.slice(0, 10).map((o) => ({
              _id: o._id,
              orderNumber: o.orderNumber,
              total: o.total,
              status: o.status,
              createdAt: o.createdAt,
            }))}
            initialSorting={[{ id: "createdAt", desc: true }]}
          />
        ) : (
          <p className="text-muted-foreground text-sm py-8 text-center rounded-lg border border-border">
            No orders yet.
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        {Icon && (
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: iconColor ? `${iconColor}20` : "hsl(var(--muted))", color: iconColor ?? "hsl(var(--muted-foreground))" }}
          >
            <Icon className="size-5" />
          </span>
        )}
      </div>
    </div>
  );
}
