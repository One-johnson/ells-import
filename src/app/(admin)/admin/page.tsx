"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import { SkeletonStatCard, SkeletonTable } from "@/components/skeletons";
import {
  type ColumnDef,
} from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
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
      <span className="font-mono text-xs">
        {String(row.original._id).slice(-8)}
      </span>
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) =>
      formatCurrency(row.original.total / 100),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className="capitalize">{row.original.status}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("en-US", {
        dateStyle: "short",
      }),
  },
];

export default function AdminDashboardPage() {
  const { sessionToken } = useAuth();
  const orders = useQuery(
    api.orders.list,
    sessionToken ? { sessionToken, limit: 10 } : "skip"
  );

  const isLoading = orders === undefined;

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
            <StatCard
              label="Total orders"
              value={orders?.items?.length ?? 0}
            />
            <StatCard label="Pending" value="—" />
            <StatCard label="Revenue" value="—" />
            <StatCard label="Customers" value="—" />
          </>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium mb-4">Recent orders</h2>
        {isLoading ? (
          <SkeletonTable rows={5} cols={4} />
        ) : orders?.items?.length ? (
          <DataTable
            columns={orderColumns}
            data={orders.items.map((o) => ({
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
