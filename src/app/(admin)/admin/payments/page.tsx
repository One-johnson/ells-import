"use client";

import { useAuth } from "@/components/providers";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { formatCurrency } from "@/lib/utils";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SkeletonTable } from "@/components/skeletons";
import type { Id } from "convex/_generated/dataModel";

type PaymentRow = {
  _id: Id<"payments">;
  amount: number;
  status: string;
  createdAt: number;
};

const columns: ColumnDef<PaymentRow>[] = [
  {
    accessorKey: "_id",
    header: "Payment ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {String(row.original._id).slice(-8)}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) =>
      formatCurrency(row.original.amount / 100),
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

export default function AdminPaymentsPage() {
  const { sessionToken } = useAuth();
  const result = useQuery(
    api.payments.list,
    sessionToken ? { sessionToken, limit: 100 } : "skip"
  );

  const isLoading = result === undefined;
  const payments = result?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-muted-foreground mt-1">
          View payment history and status.
        </p>
      </div>
      {isLoading ? (
        <SkeletonTable rows={8} cols={4} />
      ) : (
        <DataTable
          columns={columns}
          data={payments.map((p) => ({
            _id: p._id,
            amount: p.amount,
            status: p.status,
            createdAt: p.createdAt,
          }))}
          initialSorting={[{ id: "createdAt", desc: true }]}
        />
      )}
    </div>
  );
}
