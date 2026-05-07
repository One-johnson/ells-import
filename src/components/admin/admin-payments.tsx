"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
} from "lucide-react";

import { paymentMethodLabel, paymentStatusLabel } from "@/components/admin/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/money";
import { publicRef } from "@/lib/public-ref";
import { useAuth } from "@/providers/auth-provider";

const STATUSES: Array<"all" | Doc<"payments">["status"]> = [
  "all",
  "pending",
  "completed",
  "failed",
  "refunded",
];

type PayRow = {
  payment: Doc<"payments">;
  orderPublicCode: string | undefined;
  customerEmail: string;
};

export function AdminPayments() {
  const { sessionToken } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | Doc<"payments">["status"]>("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const raw = useQuery(
    api.payments.list,
    sessionToken
      ? {
          sessionToken,
          status: statusFilter === "all" ? undefined : statusFilter,
          limit: 2000,
        }
      : "skip",
  );

  const data = useMemo<PayRow[]>(() => raw ?? [], [raw]);

  const columns = useMemo<ColumnDef<PayRow>[]>(
    () => [
      {
        id: "code",
        accessorFn: (r) => r.payment.publicCode,
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Payment #
            <ChevronsUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium tabular-nums">
            {row.original.payment.publicCode}
          </span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        id: "order",
        accessorFn: (r) => r.orderPublicCode ?? "",
        header: "Order #",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-sm tabular-nums">
            {publicRef(row.original.orderPublicCode)}
          </span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        id: "customer",
        accessorFn: (r) => r.customerEmail,
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Customer
            <ChevronsUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate" title={row.original.customerEmail}>
            {row.original.customerEmail}
          </span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        id: "amount",
        accessorFn: (r) => r.payment.amountCents,
        header: ({ column }) => (
          <div className="text-right">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Amount
              <ChevronsUpDown className="ml-1 size-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const p = row.original.payment;
          return (
            <div className="text-right tabular-nums text-sm">
              {formatCents(p.amountCents, p.currency)}
            </div>
          );
        },
        sortingFn: "basic",
      },
      {
        id: "status",
        accessorFn: (r) => r.payment.status,
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="outline">{paymentStatusLabel(row.original.payment.status)}</Badge>
        ),
      },
      {
        id: "method",
        accessorFn: (r) => r.payment.method,
        header: "Method",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {paymentMethodLabel(row.original.payment.method)}
          </span>
        ),
      },
      {
        id: "created",
        accessorFn: (r) => r.payment.createdAt,
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Recorded
            <ChevronsUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap text-xs">
            {new Date(row.original.payment.createdAt).toLocaleString()}
          </span>
        ),
        sortingFn: "basic",
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getRowId: (r) => r.payment._id,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _id, value) => {
      const t = String(value).trim().toLowerCase();
      if (!t) {
        return true;
      }
      const { payment, orderPublicCode, customerEmail } = row.original;
      return (
        payment.publicCode.toLowerCase().includes(t) ||
        (orderPublicCode?.toLowerCase().includes(t) ?? false) ||
        customerEmail.toLowerCase().includes(t) ||
        paymentMethodLabel(payment.method).toLowerCase().includes(t) ||
        paymentStatusLabel(payment.status).toLowerCase().includes(t)
      );
    },
  });

  if (!sessionToken) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Payments</h1>
        <p className="text-muted-foreground text-sm">
          All recorded payment rows (checkout and manual order entries).
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            className="max-w-sm"
            placeholder="Filter by #, order #, email…"
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as "all" | Doc<"payments">["status"]);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
          >
            <SelectTrigger className="w-full sm:w-48" size="default">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All statuses" : paymentStatusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {raw === undefined ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id}>
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-muted-foreground py-8 text-center text-sm"
                  >
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((r) => (
                  <TableRow key={r.id}>
                    {r.getVisibleCells().map((c) => (
                      <TableCell key={c.id}>
                        {flexRender(c.column.columnDef.cell, c.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="text-muted-foreground flex flex-col gap-2 border-t px-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-sm">Rows</span>
                <Select
                  value={String(pagination.pageSize)}
                  onValueChange={(v) =>
                    setPagination((p) => ({ ...p, pageIndex: 0, pageSize: Number(v) }))
                  }
                >
                  <SelectTrigger className="h-8 w-20" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="First page"
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  aria-label="Last page"
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
