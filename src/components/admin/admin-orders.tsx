"use client";

import Link from "next/link";
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
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Download,
  FileDown,
  MoreHorizontal,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

import { orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/components/admin/labels";
import {
  downloadAdminOrderDetailPdf,
  downloadInvoicePdfFromData,
} from "@/components/admin/admin-order-detail-pdf";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { shouldIgnoreRowOpenDetails } from "@/lib/admin-table-row-details";
import { formatCents } from "@/lib/money";
import { publicRef } from "@/lib/public-ref";
import { userDisplayInitials } from "@/lib/user-initials";
import { useAuth } from "@/providers/auth-provider";

const ORDER_STATUSES: Doc<"orders">["status"][] = [
  "pending",
  "processing",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

function isInvoiceDownloadEligible(order: Doc<"orders">, latestPayment: Doc<"payments"> | null) {
  const statusOk = order.status === "paid" || order.status === "shipped" || order.status === "delivered";
  return Boolean(order.invoiceNumber) && statusOk && latestPayment?.status === "completed";
}

type OrderWithCustomer = {
  order: Doc<"orders">;
  customerEmail: string;
  customerName: string | undefined;
  customerAvatarUrl: string | null;
};

const columnIdLabel: Record<string, string> = {
  orderRef: "Order #",
  invoiceRef: "Invoice #",
  invoice: "Invoice",
  placed: "Placed",
  customer: "Customer",
  status: "Status",
  total: "Total",
};

function DataTableHeaderLabel({ id }: { id: string }) {
  if (id === "select" || id === "actions") {
    return null;
  }
  return <span>{columnIdLabel[id] ?? id}</span>;
}

export function AdminOrders() {
  const { sessionToken } = useAuth();
  const storefront = useQuery(api.settings.storefrontSettings);
  const [statusFilter, setStatusFilter] = useState<"all" | Doc<"orders">["status"]>("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [detailId, setDetailId] = useState<Id<"orders"> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [statusBulkOpen, setStatusBulkOpen] = useState(false);
  const [statusBulk, setStatusBulk] = useState<Doc<"orders">["status"]>("pending");
  const [sharingOrderId, setSharingOrderId] = useState<Id<"orders"> | null>(null);
  const [pdfBusy, setPdfBusy] = useState<false | "detail" | "invoice">(false);

  const rows = useQuery(
    api.orders.listWithCustomers,
    sessionToken
      ? {
          sessionToken,
          status: statusFilter === "all" ? undefined : statusFilter,
          limit: 500,
        }
      : "skip",
  );
  const detail = useQuery(
    api.orders.getWithItems,
    sessionToken && detailId
      ? { orderId: detailId, sessionToken }
      : "skip",
  );
  const setStatusMut = useMutation(api.orders.setStatus);
  const bulkSetStatusMut = useMutation(api.orders.bulkSetStatus);
  const removeMut = useMutation(api.orders.remove);
  const bulkRemoveMut = useMutation(api.orders.bulkRemove);
  const createInvoiceShareMut = useMutation(api.invoiceShares.createForOrder);

  const shareInvoice = useCallback(
    async (orderId: Id<"orders">, invoiceNumber?: string | null) => {
      if (!sessionToken) return;
      setSharingOrderId(orderId);
      try {
        const { token } = await createInvoiceShareMut({ sessionToken, orderId });
        const url = new URL(`/invoice/${token}`, window.location.origin).toString();
        const title = invoiceNumber ? `Invoice ${publicRef(invoiceNumber)}` : "Invoice";
        try {
          if (navigator.share) {
            await navigator.share({ title, url });
            toast.success("Invoice link shared.");
            return;
          }
        } catch {
          // user cancelled share dialog; fall back to copy
        }
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          toast.success("Invoice link copied.");
        } else {
          window.prompt("Copy invoice link:", url);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create invoice link.");
      } finally {
        setSharingOrderId(null);
      }
    },
    [sessionToken, createInvoiceShareMut],
  );

  const storeName = storefront?.storeName?.trim() || "Ells Import";
  const supportEmail =
    storefront && "supportEmail" in storefront && typeof storefront.supportEmail === "string"
      ? storefront.supportEmail.trim() || null
      : null;

  const exportOrderDetailPdf = useCallback(async () => {
    if (!detail?.order || !detail.customer) {
      return;
    }
    if (storefront === undefined) {
      return;
    }
    setPdfBusy("detail");
    try {
      await downloadAdminOrderDetailPdf({
        storeName,
        supportEmail,
        order: detail.order,
        items: detail.items,
        latestPayment: detail.latestPayment,
        customer: detail.customer,
      });
      toast.success("Order PDF downloaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create PDF.");
    } finally {
      setPdfBusy(false);
    }
  }, [detail, storefront, storeName, supportEmail]);

  const downloadInvoicePdf = useCallback(async () => {
    if (!detail?.order || !isInvoiceDownloadEligible(detail.order, detail.latestPayment)) {
      return;
    }
    if (storefront === undefined) {
      return;
    }
    setPdfBusy("invoice");
    try {
      await downloadInvoicePdfFromData({
        storeName,
        supportEmail,
        order: detail.order,
        items: detail.items,
        latestPayment: detail.latestPayment,
      });
      toast.success("Invoice downloaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create invoice.");
    } finally {
      setPdfBusy(false);
    }
  }, [detail, storefront, storeName, supportEmail]);

  const onSetStatus = useCallback(
    async (orderId: Id<"orders">, status: Doc<"orders">["status"]) => {
      if (!sessionToken) {
        return;
      }
      setErr(null);
      try {
        await setStatusMut({ sessionToken, orderId, status });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Update failed.");
      }
    },
    [sessionToken, setStatusMut],
  );

  const onDeleteOrder = useCallback(
    async (orderId: Id<"orders">) => {
      if (!sessionToken) {
        return;
      }
      if (!window.confirm("Delete this order and its line items?")) {
        return;
      }
      setErr(null);
      try {
        await removeMut({ sessionToken, orderId });
        setDetailId(null);
        setRowSelection((prev) => {
          const p = { ...prev };
          delete p[orderId as string];
          return p;
        });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Delete failed.");
      }
    },
    [sessionToken, removeMut],
  );

  const selectedOrderIds = useMemo((): Id<"orders">[] => {
    return (Object.keys(rowSelection) as Id<"orders">[]).filter((k) => rowSelection[k]);
  }, [rowSelection]);

  const onBulkStatus = async () => {
    if (!sessionToken || selectedOrderIds.length === 0) {
      return;
    }
    setErr(null);
    try {
      await bulkSetStatusMut({
        sessionToken,
        orderIds: selectedOrderIds,
        status: statusBulk,
      });
      setRowSelection({});
      setStatusBulkOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk update failed.");
    }
  };

  const onBulkDelete = async () => {
    if (!sessionToken || selectedOrderIds.length === 0) {
      return;
    }
    if (!window.confirm(`Delete ${selectedOrderIds.length} order(s) and their line items?`)) {
      return;
    }
    setErr(null);
    try {
      await bulkRemoveMut({ sessionToken, orderIds: selectedOrderIds });
      setRowSelection({});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk delete failed.");
    }
  };

  const data = useMemo(() => rows ?? [], [rows]);

  const columns = useMemo<ColumnDef<OrderWithCustomer>[]>(
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
            aria-label={`Select order ${row.original.order._id}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 36,
      },
      {
        id: "orderRef",
        accessorFn: (r) => r.order.publicCode ?? "",
        header: "Order #",
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">
            {publicRef(row.original.order.publicCode)}
          </span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        id: "invoiceRef",
        accessorFn: (r) => r.order.invoiceNumber ?? "",
        header: "Invoice #",
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">
            {row.original.order.invoiceNumber ? publicRef(row.original.order.invoiceNumber) : "—"}
          </span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        id: "invoice",
        header: "Invoice",
        cell: ({ row }) => {
          const o = row.original.order;
          const disabled = !o.invoiceNumber;
          return (
            <div className="flex items-center gap-1">
              <Button type="button" size="sm" variant="outline" asChild disabled={disabled}>
                <Link href={`/admin/orders/${o._id}/invoice`}>View</Link>
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8"
                aria-label="Share invoice"
                disabled={disabled || sharingOrderId === o._id}
                onClick={() => void shareInvoice(o._id, o.invoiceNumber)}
              >
                <Share2 className="size-4" />
              </Button>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "placed",
        accessorFn: (r) => r.order.createdAt,
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Placed
            <ChevronsUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">
            {new Date(row.original.order.createdAt).toLocaleString()}
          </span>
        ),
        sortingFn: "basic",
      },
      {
        id: "customer",
        accessorFn: (r) => `${r.customerName ?? ""} ${r.customerEmail}`.trim(),
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
        cell: ({ row }) => {
          const { customerEmail, customerName, customerAvatarUrl } = row.original;
          const initials = userDisplayInitials(customerName, customerEmail);
          return (
            <div className="flex max-w-[240px] items-center gap-2 leading-tight">
              <Avatar className="size-9 shrink-0">
                {customerAvatarUrl ? <AvatarImage src={customerAvatarUrl} alt="" /> : null}
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate font-medium" title={customerEmail}>
                  {customerName || customerEmail}
                </div>
                <div className="text-muted-foreground truncate text-xs">{customerEmail}</div>
              </div>
            </div>
          );
        },
        sortingFn: "alphanumeric",
      },
      {
        id: "status",
        accessorFn: (r) => r.order.status,
        header: "Status",
        cell: ({ row }) => {
          const o = row.original.order;
          return (
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <Badge variant="outline" className="w-fit">
                {orderStatusLabel(o.status)}
              </Badge>
              <Select
                value={o.status}
                onValueChange={(v) =>
                  void onSetStatus(o._id, v as Doc<"orders">["status"])
                }
              >
                <SelectTrigger className="h-8 min-w-[8.5rem] w-full" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {orderStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "total",
        accessorFn: (r) => r.order.totalCents,
        header: ({ column }) => (
          <div className="text-right">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Total
              <ChevronsUpDown className="ml-1 size-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const o = row.original.order;
          return (
            <div className="text-right tabular-nums text-sm">
              {formatCents(o.totalCents, o.currency)}
            </div>
          );
        },
        sortingFn: "basic",
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const o = row.original.order;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setDetailId(o._id)}
              >
                View
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Open menu"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => void onDeleteOrder(o._id)}
                  >
                    Delete order
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        enableHiding: false,
        enableSorting: false,
      },
    ],
    [onSetStatus, onDeleteOrder, shareInvoice, sharingOrderId],
  );

  // TanStack Table API is incompatible with React Compiler memoization rules; safe here.
  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable returns unstable refs
  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.order._id,
    state: {
      sorting,
      globalFilter,
      rowSelection,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, value) => {
      const t = String(value).trim().toLowerCase();
      if (!t) {
        return true;
      }
      const { order, customerEmail, customerName } = row.original;
      return (
        (order.publicCode?.toLowerCase().includes(t) ?? false) ||
        (order.invoiceNumber?.toLowerCase().includes(t) ?? false) ||
        customerEmail.toLowerCase().includes(t) ||
        (customerName?.toLowerCase().includes(t) ?? false) ||
        orderStatusLabel(order.status).toLowerCase().includes(t)
      );
    },
  });

  const downloadOrdersCsv = useCallback(() => {
    const esc = (s: string) => {
      const x = String(s);
      if (/[",\n\r]/.test(x)) {
        return `"${x.replace(/"/g, '""')}"`;
      }
      return x;
    };
    const line = (cells: string[]) => cells.map(esc).join(",");
    const outRows = table.getFilteredRowModel().rows;
    const header = [
      "order_ref",
      "invoice_number",
      "placed_iso",
      "customer_email",
      "customer_name",
      "status",
      "subtotal_cents",
      "tax_cents",
      "shipping_cents",
      "total_cents",
      "currency",
    ];
    const lines = outRows.map((r) => {
      const { order, customerEmail, customerName } = r.original;
      return line([
        order.publicCode ?? "",
        order.invoiceNumber ?? "",
        new Date(order.createdAt).toISOString(),
        customerEmail,
        customerName ?? "",
        order.status,
        String(order.subtotalCents),
        String(order.taxCents),
        String(order.shippingCents),
        String(order.totalCents),
        order.currency,
      ]);
    });
    const csv = "\uFEFF" + line(header) + "\r\n" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [table]);

  if (!sessionToken) {
    return null;
  }

  const nSelected = selectedOrderIds.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Orders</h1>
        <p className="text-muted-foreground text-sm">Review orders and update fulfillment status.</p>
      </div>

      {err && (
        <div
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          {err}
        </div>
      )}

      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Input
          className="max-w-sm"
          placeholder="Filter customer, id, or status…"
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as "all" | Doc<"orders">["status"]);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <SelectTrigger className="w-full md:w-56" size="default">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {orderStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          className="w-full md:w-auto"
          onClick={downloadOrdersCsv}
        >
          <Download className="size-3.5" />
          Export CSV
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="ml-auto md:ml-0">
              Columns
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {table
              .getAllColumns()
              .filter((c) => c.getCanHide() && c.id !== "select")
              .map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={c.getIsVisible()}
                  onCheckedChange={(v) => c.toggleVisibility(!!v)}
                >
                  <DataTableHeaderLabel id={c.id} />
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {nSelected > 0 && (
        <div className="bg-muted/40 flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">{nSelected} selected</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setStatusBulkOpen(true)}>
              Set status…
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => void onBulkDelete()}
            >
              Delete selected
            </Button>
          </div>
        </div>
      )}

      <Dialog open={statusBulkOpen} onOpenChange={setStatusBulkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set status for {nSelected} order(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Choose the new status for all selected orders.</p>
            <Select
              value={statusBulk}
              onValueChange={(v) => setStatusBulk(v as Doc<"orders">["status"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {orderStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStatusBulkOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onBulkStatus()}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rows === undefined ? (
        <p className="text-muted-foreground text-sm">Loading orders…</p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id} className={h.id === "actions" ? "w-[1%]" : undefined}>
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
                    No orders match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((r) => (
                  <TableRow
                    key={r.id}
                    data-state={r.getIsSelected() && "selected"}
                    className="cursor-pointer"
                    title="Click a row to view details"
                    onClick={(e) => {
                      if (shouldIgnoreRowOpenDetails(e.target)) {
                        return;
                      }
                      setDetailId(r.original.order._id);
                    }}
                  >
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

      <Drawer
        open={detailId !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDetailId(null);
          }
        }}
        direction="bottom"
      >
        <DrawerContent className="flex max-h-[min(92dvh,560px)] flex-col">
          <div className="bg-muted mx-auto mb-2 mt-1 h-1.5 w-10 shrink-0 rounded-full" aria-hidden />
          <DrawerHeader className="text-left">
            <DrawerTitle>Order details</DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-2">
            {detail === undefined && (
              <p className="text-muted-foreground text-sm">Loading…</p>
            )}
            {detail === null && (
              <p className="text-muted-foreground text-sm">Order not found.</p>
            )}
            {detail?.customer ? (
              <div className="mb-4 flex items-center gap-3 border-b pb-4">
                <Avatar className="size-12 shrink-0">
                  {detail.customer.avatarUrl ? (
                    <AvatarImage src={detail.customer.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback className="text-sm">
                    {userDisplayInitials(detail.customer.name, detail.customer.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium leading-tight">
                    {detail.customer.name?.trim() || detail.customer.email}
                  </p>
                  {detail.customer.name?.trim() ? (
                    <p className="text-muted-foreground truncate text-sm">{detail.customer.email}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {detail && (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Order #</p>
                  <p className="font-mono font-medium">
                    {publicRef(detail.order.publicCode)}
                  </p>
                </div>
                {detail.order.invoiceNumber ? (
                  <div>
                    <p className="text-muted-foreground text-xs">Invoice #</p>
                    <p className="font-mono font-medium">{publicRef(detail.order.invoiceNumber)}</p>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground text-xs">Status</p>
                    <p className="font-medium">{orderStatusLabel(detail.order.status)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs">Total</p>
                    <p className="font-medium tabular-nums">
                      {formatCents(detail.order.totalCents, detail.order.currency)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Placed</p>
                  <p>{new Date(detail.order.createdAt).toLocaleString()}</p>
                </div>
                {detail.latestPayment ? (
                  <div>
                    <p className="text-muted-foreground text-xs">Payment</p>
                    <p>
                      {paymentStatusLabel(detail.latestPayment.status)} · {paymentMethodLabel(detail.latestPayment.method)}{" "}
                      ·{" "}
                      <span className="tabular-nums">
                        {formatCents(detail.latestPayment.amountCents, detail.latestPayment.currency)}
                      </span>
                    </p>
                  </div>
                ) : null}
                {detail.order.notes ? (
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">Customer notes</p>
                    <p className="bg-muted/30 rounded border p-2 text-xs whitespace-pre-line">{detail.order.notes}</p>
                  </div>
                ) : null}
                {detail.order.shippingAddress && (
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">Shipping</p>
                    <div className="bg-muted/30 rounded border p-2 text-xs">
                      {[
                        detail.order.shippingAddress.name,
                        detail.order.shippingAddress.line1,
                        detail.order.shippingAddress.line2,
                        [detail.order.shippingAddress.city, detail.order.shippingAddress.state]
                          .filter(Boolean)
                          .join(", "),
                        `${detail.order.shippingAddress.postalCode} ${detail.order.shippingAddress.country}`,
                      ]
                        .filter(Boolean)
                        .join("\n")}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">Line items</p>
                  <ul className="divide-y rounded border">
                    {detail.items.map((line) => (
                      <li key={line._id} className="flex justify-between gap-2 px-2 py-1.5">
                        <span className="min-w-0">
                          {line.productName}
                          <span className="text-muted-foreground"> × {line.quantity}</span>
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {formatCents(line.unitPriceCents * line.quantity, detail.order.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          {detail?.order ? (
            <DrawerFooter className="gap-2 border-t sm:flex-col sm:items-stretch">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pdfBusy !== false || storefront === undefined}
                  onClick={() => void exportOrderDetailPdf()}
                >
                  <FileDown className="size-4" />
                  {pdfBusy === "detail" ? "Exporting…" : "Export PDF"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    pdfBusy !== false ||
                    storefront === undefined ||
                    !isInvoiceDownloadEligible(detail.order, detail.latestPayment)
                  }
                  onClick={() => void downloadInvoicePdf()}
                >
                  <Download className="size-4" />
                  {pdfBusy === "invoice" ? "Downloading…" : "Invoice PDF"}
                </Button>
                <Button type="button" size="sm" variant="outline" asChild disabled={!detail.order.invoiceNumber}>
                  <Link href={`/admin/orders/${detail.order._id}/invoice`}>View invoice</Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!detail.order.invoiceNumber || sharingOrderId === detail.order._id}
                  onClick={() => void shareInvoice(detail.order._id, detail.order.invoiceNumber)}
                >
                  <Share2 className="size-4" />
                  Share link
                </Button>
              </div>
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={() => void onDeleteOrder(detail.order._id)}
              >
                Delete order
              </Button>
            </DrawerFooter>
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
