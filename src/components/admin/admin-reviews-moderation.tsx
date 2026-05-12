"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronsUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { AdminConfirmDeleteDialog } from "@/components/admin/admin-confirm-delete-dialog";
import { useAuth } from "@/providers/auth-provider";

type ReviewRow = {
  review: Doc<"reviews">;
  productName: string;
  productSlug: string;
  reviewerEmail: string;
  reviewerName: string | undefined;
};

export function AdminReviewsModeration() {
  const { sessionToken } = useAuth();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [err, setErr] = useState<string | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<
    null | { kind: "single"; id: Id<"reviews"> } | { kind: "bulk" }
  >(null);

  const raw = useQuery(
    api.reviews.adminListWithDetails,
    sessionToken ? { sessionToken, limit: 500 } : "skip",
  );
  const removeMut = useMutation(api.reviews.remove);
  const bulkRemoveMut = useMutation(api.reviews.bulkRemove);

  const data = useMemo<ReviewRow[]>(() => raw ?? [], [raw]);

  const selectedReviewIds = useMemo((): Id<"reviews">[] => {
    return (Object.keys(rowSelection) as Id<"reviews">[]).filter((k) => rowSelection[k]);
  }, [rowSelection]);

  const requestDeleteReview = useCallback((id: Id<"reviews">) => {
    setDeletePrompt({ kind: "single", id });
  }, []);

  const columns = useMemo<ColumnDef<ReviewRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table: t }) => (
          <Checkbox
            checked={
              t.getIsAllPageRowsSelected() ||
              (t.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(v) => t.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all on page"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select review"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 36,
      },
      {
        id: "product",
        accessorFn: (r) => r.productName,
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Product
            <ChevronsUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.productName}</div>
            <div className="text-muted-foreground font-mono text-xs">{row.original.productSlug}</div>
          </div>
        ),
      },
      {
        id: "reviewer",
        accessorFn: (r) => r.reviewerEmail,
        header: "Reviewer",
        cell: ({ row }) => (
          <div>
            <div className="truncate" title={row.original.reviewerEmail}>
              {row.original.reviewerName || row.original.reviewerEmail}
            </div>
            <div className="text-muted-foreground text-xs">{row.original.reviewerEmail}</div>
          </div>
        ),
      },
      {
        id: "rating",
        accessorFn: (r) => r.review.rating,
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Rating
            <ChevronsUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.review.rating} / 5</Badge>
        ),
      },
      {
        id: "title",
        accessorFn: (r) => r.review.title ?? r.review.body ?? "",
        header: "Summary",
        cell: ({ row }) => (
          <div className="max-w-xs">
            {row.original.review.title && (
              <p className="line-clamp-1 font-medium">{row.original.review.title}</p>
            )}
            {row.original.review.body && (
              <p className="text-muted-foreground line-clamp-2 text-sm">{row.original.review.body}</p>
            )}
          </div>
        ),
      },
      {
        id: "when",
        accessorFn: (r) => r.review.createdAt,
        header: "Posted",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs">
            {new Date(row.original.review.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              requestDeleteReview(row.original.review._id);
            }}
          >
            Remove
          </Button>
        ),
      },
    ],
    [requestDeleteReview],
  );

  const table = useReactTable({
    data,
    columns,
    getRowId: (r) => r.review._id,
    state: { sorting, globalFilter, rowSelection, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
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
      const r = row.original;
      return (
        r.productName.toLowerCase().includes(t) ||
        r.productSlug.toLowerCase().includes(t) ||
        r.reviewerEmail.toLowerCase().includes(t) ||
        (r.reviewerName?.toLowerCase().includes(t) ?? false) ||
        (r.review.title?.toLowerCase().includes(t) ?? false) ||
        (r.review.body?.toLowerCase().includes(t) ?? false)
      );
    },
  });

  if (!sessionToken) {
    return null;
  }

  const nSel = selectedReviewIds.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reviews</h1>
        <p className="text-muted-foreground text-sm">Moderate product reviews and remove policy violations.</p>
      </div>

      {err && (
        <div
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          {err}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          className="max-w-sm"
          placeholder="Filter by product, reviewer, text…"
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        />
        {nSel > 0 && (
          <Button type="button" variant="destructive" size="sm" onClick={() => setDeletePrompt({ kind: "bulk" })}>
            Delete {nSel} selected
          </Button>
        )}
      </div>

      {raw === undefined ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="space-y-2">
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
                      No reviews found.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((r) => (
                    <TableRow key={r.id} data-state={r.getIsSelected() && "selected"}>
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
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-sm">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </p>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <AdminConfirmDeleteDialog
        open={deletePrompt !== null}
        onOpenChange={(o) => !o && setDeletePrompt(null)}
        title={
          deletePrompt?.kind === "bulk"
            ? `Delete ${selectedReviewIds.length} review(s)?`
            : "Delete this review?"
        }
        description={
          deletePrompt?.kind === "bulk"
            ? `This will permanently remove ${selectedReviewIds.length} review(s). This cannot be undone.`
            : "This will permanently remove this review. This cannot be undone."
        }
        onConfirm={async () => {
          if (!sessionToken || !deletePrompt) {
            return;
          }
          setErr(null);
          try {
            if (deletePrompt.kind === "single") {
              const id = deletePrompt.id;
              await removeMut({ sessionToken, reviewId: id });
              setRowSelection((prev) => {
                const p = { ...prev };
                delete p[id as string];
                return p;
              });
            } else {
              await bulkRemoveMut({ sessionToken, reviewIds: selectedReviewIds });
              setRowSelection({});
            }
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Delete failed.");
            throw e;
          }
        }}
      />
    </div>
  );
}
