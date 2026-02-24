"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/components/providers";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { formatCurrency } from "@/lib/utils";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableAdvanced } from "@/components/ui/data-table-advanced";
import { SkeletonTable } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import type { Id } from "convex/_generated/dataModel";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { getPaymentStatusBadgeVariant } from "@/lib/order-status-badges";

const PAYMENT_STATUSES = ["pending", "sent", "confirmed", "failed", "expired", "refunded"] as const;

type PaymentRow = {
  _id: Id<"payments">;
  orderId: Id<"orders">;
  amount: number;
  status: string;
  createdAt: number;
};

export default function AdminPaymentsPage() {
  const { sessionToken } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<PaymentRow[]>([]);
  const [deleting, setDeleting] = useState(false);

  const bulkRemovePayments = useMutation(api.payments.bulkRemove);

  const columns: ColumnDef<PaymentRow>[] = useMemo(
    () => [
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
        cell: ({ row }) => formatCurrency(row.original.amount / 100),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={getPaymentStatusBadgeVariant(row.original.status)} className="capitalize">
            {row.original.status.replace("_", " ")}
          </Badge>
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
      {
        id: "order",
        header: "Order",
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/admin/orders?orderId=${row.original.orderId}`}>
              View order
            </Link>
          </Button>
        ),
        enableSorting: false,
      },
    ],
    []
  );

  const result = useQuery(
    api.payments.list,
    sessionToken
      ? {
          sessionToken,
          limit: 500,
          status: statusFilter === "all" ? undefined : (statusFilter as (typeof PAYMENT_STATUSES)[number]),
        }
      : "skip"
  );

  const isLoading = result === undefined;
  const payments = result?.items ?? [];
  const tableData = useMemo(
    () =>
      payments.map((p) => ({
        _id: p._id,
        orderId: p.orderId,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
      })),
    [payments]
  );

  async function handleBulkDelete() {
    if (selectedRows.length === 0 || !sessionToken) return;
    setDeleting(true);
    try {
      await bulkRemovePayments({
        sessionToken,
        paymentIds: selectedRows.map((r) => r._id),
      });
      toast.success(`${selectedRows.length} payment(s) deleted.`);
      setSelectedRows([]);
      setRowSelection({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete payments.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">
            View payment history and status.
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : (
        <DataTableAdvanced
          columns={columns}
          data={tableData}
          initialSorting={[{ id: "createdAt", desc: true }]}
          filterPlaceholder="Search payments..."
          enableRowSelection
          getRowId={(row) => row._id}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onSelectionChange={setSelectedRows}
          bulkActions={
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={deleting || selectedRows.length === 0}
            >
              <Trash2 className="mr-2 size-4" />
              Delete ({selectedRows.length})
            </Button>
          }
        />
      )}
    </div>
  );
}
