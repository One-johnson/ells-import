"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSearchParams, useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminOrderDetailContent } from "./order-detail-content";
import { getOrderStatusBadgeVariant } from "@/lib/order-status-badges";
import type { Id } from "convex/_generated/dataModel";
import Image from "next/image";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;

type OrderRow = {
  _id: Id<"orders">;
  orderNumber: string | undefined;
  orderType: string | undefined;
  customer: { name: string; image?: string } | null;
  total: number;
  status: string;
  createdAt: number;
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId");
  const isMobile = useIsMobile();
  const { sessionToken } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [selectedOrderId, setSelectedOrderId] = useState<Id<"orders"> | null>(null);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<OrderRow[]>([]);
  const [deleting, setDeleting] = useState(false);

  const bulkRemoveOrders = useMutation(api.orders.bulkRemove);

  useEffect(() => {
    if (orderIdParam) {
      setSelectedOrderId(orderIdParam as Id<"orders">);
    }
  }, [orderIdParam]);

  function openOrder(id: Id<"orders">) {
    setSelectedOrderId(id);
    router.replace(`/admin/orders?orderId=${id}`);
  }

  function closeOrder() {
    setSelectedOrderId(null);
    router.replace("/admin/orders");
  }

  async function handleBulkDelete() {
    if (selectedRows.length === 0 || !sessionToken) return;
    setDeleting(true);
    try {
      await bulkRemoveOrders({
        sessionToken,
        orderIds: selectedRows.map((r) => r._id),
      });
      toast.success(`${selectedRows.length} order(s) deleted.`);
      setSelectedRows([]);
      setRowSelection({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete orders.");
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<OrderRow>[] = useMemo(
    () => [
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
        accessorKey: "orderType",
        header: "Type",
        cell: ({ row }) => (
          <span className="capitalize text-muted-foreground">
            {row.original.orderType ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => {
          const c = row.original.customer;
          if (!c) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-2">
              {c.image ? (
                <Image
                  src={c.image}
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {c.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="truncate text-sm">{c.name}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => formatCurrency(row.original.total / 100),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={getOrderStatusBadgeVariant(row.original.status)} className="capitalize">
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
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openOrder(row.original._id)}
          >
            View
          </Button>
        ),
        enableSorting: false,
      },
    ],
    []
  );

  const result = useQuery(
    api.orders.list,
    sessionToken
      ? {
          sessionToken,
          limit: 500,
          status: statusFilter === "all" ? undefined : (statusFilter as (typeof ORDER_STATUSES)[number]),
        }
      : "skip"
  );

  const isLoading = result === undefined;
  const orders = result?.items ?? [];
  const tableData = useMemo(
    () =>
      orders.map((o) => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        orderType: o.orderType,
        customer: (o as { customer?: { name: string; image?: string } | null }).customer ?? null,
        total: o.total,
        status: o.status,
        createdAt: o.createdAt,
      })),
    [orders]
  );
  const open = selectedOrderId !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1">
            View and manage orders.
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
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
          filterPlaceholder="Search orders..."
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

      {isMobile ? (
        <Sheet open={open} onOpenChange={(o) => !o && closeOrder()}>
          <SheetContent
            side="bottom"
            className="max-h-[90vh] overflow-y-auto rounded-t-xl"
          >
            <SheetHeader>
              <SheetTitle>Order details</SheetTitle>
            </SheetHeader>
            <div className="pb-6 pt-2">
              {selectedOrderId && (
                <AdminOrderDetailContent orderId={selectedOrderId} onDeleted={closeOrder} />
              )}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={(o) => !o && closeOrder()}>
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order details</DialogTitle>
            </DialogHeader>
            <div className="pt-2">
              {selectedOrderId && (
                <AdminOrderDetailContent orderId={selectedOrderId} onDeleted={closeOrder} />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
