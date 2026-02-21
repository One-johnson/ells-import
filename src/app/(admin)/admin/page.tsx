"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import { SkeletonStatCard, SkeletonTable } from "@/components/skeletons";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { OrdersByStatusChart, OrdersByDayChart } from "@/components/dashboard-charts";
import type { Id } from "convex/_generated/dataModel";

type OrderRow = {
  _id: Id<"orders">;
  total: number;
  status: string;
  createdAt: number;
};

const orderColumns: ColumnDef<OrderRow>[] = [
  {
    accessorKey: "_id",
    header: "Order ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{String(row.original._id).slice(-8)}</span>
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
    sessionToken ? { sessionToken, limit: 100 } : "skip"
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
          </>
        ) : (
          <>
            <StatCard label="Total orders" value={orderItems.length} />
            <StatCard label="Pending" value={pendingCount} />
            <StatCard
              label="Revenue"
              value={formatCurrency(totalRevenue / 100)}
            />
            <StatCard label="Customers" value={users?.items?.length ?? 0} />
            <StatCard label="Products" value={productsList?.items?.length ?? 0} />
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

      <div>
        <h2 className="text-lg font-medium mb-4">Recent orders</h2>
        {isLoading ? (
          <SkeletonTable rows={5} cols={4} />
        ) : orderItems.length ? (
          <DataTable
            columns={orderColumns}
            data={orderItems.slice(0, 10).map((o) => ({
              _id: o._id,
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
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
