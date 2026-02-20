"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SkeletonTable } from "@/components/skeletons";
import type { Id } from "convex/_generated/dataModel";

type OrderRow = {
  _id: Id<"orders">;
  total: number;
  status: string;
  createdAt: number;
};

const columns: ColumnDef<OrderRow>[] = [
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

export default function AdminOrdersPage() {
  const { sessionToken } = useAuth();
  const result = useQuery(
    api.orders.list,
    sessionToken ? { sessionToken, limit: 100 } : "skip"
  );

  const isLoading = result === undefined;
  const orders = result?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1">
          View and manage orders.
        </p>
      </div>
      {isLoading ? (
        <SkeletonTable rows={8} cols={4} />
      ) : (
        <DataTable
          columns={columns}
          data={orders.map((o) => ({
            _id: o._id,
            total: o.total,
            status: o.status,
            createdAt: o.createdAt,
          }))}
          initialSorting={[{ id: "createdAt", desc: true }]}
        />
      )}
    </div>
  );
}
