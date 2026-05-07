"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/components/admin/labels";
import { shouldIgnoreRowOpenDetails } from "@/lib/admin-table-row-details";
import { formatCents } from "@/lib/money";
import { publicRef } from "@/lib/public-ref";
import { userDisplayInitials } from "@/lib/user-initials";
import { useAuth } from "@/providers/auth-provider";

import type { PublicUser } from "@convex/lib/publicUser";

const ROLES: PublicUser["role"][] = ["customer", "admin"];

const columnIdLabel: Record<string, string> = {
  avatar: "Photo",
  ref: "Ref",
  email: "Email",
  name: "Name",
  role: "Role",
  createdAt: "Since",
};

function DataTableHeader({ id }: { id: string }) {
  if (id === "select" || id === "actions") {
    return null;
  }
  return <span>{columnIdLabel[id] ?? id}</span>;
}

type AdminUserRow = PublicUser & { avatarUrl: string | null };

function profileImageSrc(u: AdminUserRow): string | null {
  if (u.avatarUrl) {
    return u.avatarUrl;
  }
  const img = u.image?.trim();
  if (img && /^https?:\/\//i.test(img)) {
    return img;
  }
  return null;
}

function CustomerOrderInlineDetail({
  orderId,
  sessionToken,
  open,
}: {
  orderId: Id<"orders">;
  sessionToken: string;
  open: boolean;
}) {
  const data = useQuery(api.orders.getWithItems, open ? { orderId, sessionToken } : "skip");
  if (!open) {
    return null;
  }
  if (data === undefined) {
    return <p className="text-muted-foreground py-2 text-sm">Loading…</p>;
  }
  if (data === null) {
    return <p className="text-muted-foreground py-2 text-sm">Couldn&apos;t load this order.</p>;
  }
  return (
    <div className="space-y-3 text-sm">
      {data.latestPayment ? (
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <p className="text-muted-foreground text-xs">Latest payment</p>
          <p className="mt-0.5">
            {paymentStatusLabel(data.latestPayment.status)} ·{" "}
            {paymentMethodLabel(data.latestPayment.method)} ·{" "}
            <span className="tabular-nums">
              {formatCents(data.latestPayment.amountCents, data.latestPayment.currency)}
            </span>
          </p>
        </div>
      ) : null}

      <div>
        <p className="text-muted-foreground mb-1 text-xs">Items</p>
        {data.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No line items.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {data.items.slice(0, 6).map((line) => (
              <li key={line._id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0 truncate">
                  {line.productName}
                  <span className="text-muted-foreground"> × {line.quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatCents(line.unitPriceCents * line.quantity, data.order.currency)}
                </span>
              </li>
            ))}
            {data.items.length > 6 ? (
              <li className="text-muted-foreground px-3 py-2 text-xs">
                +{data.items.length - 6} more item(s)
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </div>
  );
}

export function AdminUsers() {
  const { sessionToken, user: me } = useAuth();
  const [roleFilter, setRoleFilter] = useState<"all" | PublicUser["role"]>("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const [formOpen, setFormOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [newRole, setNewRole] = useState<PublicUser["role"]>("customer");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserRow | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<Id<"orders"> | null>(null);

  const users = useQuery(
    api.users.list,
    sessionToken
      ? {
          sessionToken,
          limit: 500,
          role: roleFilter === "all" ? undefined : roleFilter,
        }
      : "skip",
  );

  const customerOrders = useQuery(
    api.orders.listForUser,
    sessionToken && detailUser
      ? {
          sessionToken,
          userId: detailUser._id,
          limit: 30,
        }
      : "skip",
  );

  const customerOrderSummary = useMemo(() => {
    if (!customerOrders || customerOrders.length === 0) {
      return null;
    }
    const lastOrderAt = customerOrders[0]!.createdAt;
    const fulfilled = customerOrders.filter(
      (o) => o.status === "paid" || o.status === "shipped" || o.status === "delivered",
    );
    const fulfilledSpendCents = fulfilled.reduce((sum, o) => sum + o.totalCents, 0);
    const currency = customerOrders[0]!.currency;
    return {
      lastOrderAt,
      fulfilledCount: fulfilled.length,
      fulfilledSpendCents,
      currency,
    };
  }, [customerOrders]);

  const createMut = useMutation(api.users.create);
  const setRoleMut = useMutation(api.users.setRole);
  const bulkSetRoleMut = useMutation(api.users.bulkSetRole);
  const removeMut = useMutation(api.users.remove);
  const bulkRemoveMut = useMutation(api.users.bulkRemove);

  useEffect(() => {
    setExpandedOrderId(null);
  }, [detailUser?._id]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) {
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      await createMut({
        sessionToken,
        email: email.trim().toLowerCase(),
        password,
        name: name.trim() || undefined,
        role: newRole,
      });
      setFormOpen(false);
      setEmail("");
      setPassword("");
      setName("");
      setNewRole("customer");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  };

  const onSetRole = useCallback(
    async (userId: Id<"users">, next: PublicUser["role"]) => {
      if (!sessionToken) {
        return;
      }
      setErr(null);
      try {
        await setRoleMut({ sessionToken, userId, role: next });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Role update failed.");
      }
    },
    [sessionToken, setRoleMut],
  );

  const onDelete = useCallback(
    async (u: AdminUserRow) => {
      if (!sessionToken) {
        return;
      }
      if (u._id === me?._id) {
        setErr("You cannot delete your own account from here.");
        return;
      }
      if (!window.confirm(`Delete user ${u.email}?`)) {
        return;
      }
      setErr(null);
      try {
        await removeMut({ sessionToken, userId: u._id });
        setRowSelection((prev) => {
          const p = { ...prev };
          delete p[u._id as string];
          return p;
        });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Delete failed.");
      }
    },
    [sessionToken, me?._id, removeMut],
  );

  const selectedUserIds = useMemo((): Id<"users">[] => {
    return (Object.keys(rowSelection) as Id<"users">[]).filter((k) => rowSelection[k]);
  }, [rowSelection]);

  const onBulkRole = async (role: PublicUser["role"]) => {
    if (!sessionToken || selectedUserIds.length === 0) {
      return;
    }
    setErr(null);
    try {
      await bulkSetRoleMut({ sessionToken, userIds: selectedUserIds, role });
      setRowSelection({});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk update failed.");
    }
  };

  const onBulkDelete = async () => {
    if (!sessionToken || selectedUserIds.length === 0) {
      return;
    }
    if (!window.confirm(`Delete ${selectedUserIds.length} user(s)?`)) {
      return;
    }
    setErr(null);
    try {
      await bulkRemoveMut({ sessionToken, userIds: selectedUserIds });
      setRowSelection({});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk delete failed.");
    }
  };

  const data = useMemo(() => (users as AdminUserRow[] | undefined) ?? [], [users]);

  const columns = useMemo<ColumnDef<AdminUserRow>[]>(
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
            disabled={!row.getCanSelect()}
            aria-label={`Select ${row.original.email}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 36,
      },
      {
        id: "avatar",
        header: "Photo",
        cell: ({ row }) => {
          const u = row.original;
          const initials = userDisplayInitials(u.name, u.email);
          const src = profileImageSrc(u);
          return (
            <Avatar className="size-10">
              {src ? <AvatarImage src={src} alt="" /> : null}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "ref",
        accessorFn: (r) => r.publicCode ?? "",
        header: "Ref",
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">
            {publicRef(row.original.publicCode)}
          </span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        id: "email",
        accessorKey: "email",
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Email
            <ChevronsUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.original.email}</div>,
        sortingFn: "alphanumeric",
      },
      {
        id: "name",
        accessorFn: (r) => r.name ?? "",
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ChevronsUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.name ?? "—"}</span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        id: "role",
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <Badge variant={u.role === "admin" ? "default" : "outline"}>{u.role}</Badge>
              {u._id === me?._id ? (
                <span className="text-muted-foreground text-xs">(you)</span>
              ) : (
                <Select
                  value={u.role}
                  onValueChange={(v) => {
                    const next = v as PublicUser["role"];
                    if (next === u.role) {
                      return;
                    }
                    void onSetRole(u._id, next);
                  }}
                >
                  <SelectTrigger className="h-8 min-w-0 max-w-full sm:w-36" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => (
          <div className="text-right">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Since
              <ChevronsUpDown className="ml-1 size-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-muted-foreground text-right text-xs tabular-nums sm:text-left">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </div>
        ),
        sortingFn: "basic",
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const u = row.original;
          if (u._id === me?._id) {
            return null;
          }
          return (
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
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => void onDelete(u)}
                >
                  <Trash2 className="text-destructive" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        enableHiding: false,
        enableSorting: false,
      },
    ],
    [me?._id, onDelete, onSetRole],
  );

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row._id,
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
    enableRowSelection: (row) => row.original._id !== me?._id,
    globalFilterFn: (row, _columnId, value) => {
      const t = String(value).trim().toLowerCase();
      if (!t) {
        return true;
      }
      const u = row.original;
      return (
        u.email.toLowerCase().includes(t) ||
        (u.name?.toLowerCase().includes(t) ?? false) ||
        (u.publicCode?.toLowerCase().includes(t) ?? false)
      );
    },
  });

  if (!sessionToken) {
    return null;
  }

  const nSelected = selectedUserIds.length;
  const detailProfileSrc = detailUser ? profileImageSrc(detailUser) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-muted-foreground text-sm">Accounts, roles, and sign-in emails.</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setErr(null);
            setFormOpen(true);
          }}
          className="shrink-0"
        >
          <Plus className="size-4" />
          New user
        </Button>
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
          placeholder="Filter email or name…"
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        />
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v as "all" | PublicUser["role"]);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <SelectTrigger className="w-full md:w-48" size="default">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r === "admin" ? "Admins" : "Customers"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  <DataTableHeader id={c.id} />
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {nSelected > 0 && (
        <div className="bg-muted/40 flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">{nSelected} selected</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="secondary">
                Bulk actions
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Role</DropdownMenuLabel>
              {ROLES.map((r) => (
                <DropdownMenuItem key={r} onClick={() => void onBulkRole(r)}>
                  Set to {r}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => void onBulkDelete()}
              >
                <Trash2 className="text-destructive" />
                Delete selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {users === undefined ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id} className={h.id === "actions" ? "w-10" : undefined}>
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
                    No users match your filters.
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
                      setDetailUser(r.original);
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
        open={detailUser !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDetailUser(null);
          }
        }}
        direction="right"
        shouldScaleBackground={false}
      >
        <DrawerContent className="flex h-full max-h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DrawerHeader className="border-border shrink-0 border-b px-4 pb-4 pt-6 text-left">
            {detailUser ? (
              <div className="flex items-start gap-4">
                <Avatar className="size-16 shrink-0 rounded-lg">
                  {detailProfileSrc ? (
                    <AvatarImage
                      src={detailProfileSrc}
                      alt=""
                      className="rounded-lg object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-lg text-base">
                    {userDisplayInitials(detailUser.name, detailUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <DrawerTitle className="text-left">User details</DrawerTitle>
                  <DrawerDescription className="text-left">
                    {detailUser.name?.trim() ? `${detailUser.name} · ${detailUser.email}` : detailUser.email}
                  </DrawerDescription>
                </div>
              </div>
            ) : (
              <>
                <DrawerTitle>User details</DrawerTitle>
                <DrawerDescription />
              </>
            )}
          </DrawerHeader>
          {detailUser && (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="break-all font-medium">{detailUser.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Name</p>
                <p>{detailUser.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Role</p>
                <Badge variant={detailUser.role === "admin" ? "default" : "outline"}>
                  {detailUser.role}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Email verified</p>
                <p>{detailUser.emailVerified === true ? "Yes" : detailUser.emailVerified === false ? "No" : "—"}</p>
              </div>
              {detailUser.lastSeenAt != null ? (
                <div>
                  <p className="text-muted-foreground text-xs">Last seen</p>
                  <p>{new Date(detailUser.lastSeenAt).toLocaleString()}</p>
                </div>
              ) : null}
              <div>
                <p className="text-muted-foreground text-xs">Reference #</p>
                <p className="font-mono text-sm">{publicRef(detailUser.publicCode)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(detailUser.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p>{new Date(detailUser.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              {detailUser ? (
                <div className="pt-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold">Orders</p>
                      <p className="text-muted-foreground text-xs">User order history (latest first).</p>
                    </div>
                    {customerOrders ? (
                      <Badge variant="outline" className="tabular-nums">
                        {customerOrders.length}
                      </Badge>
                    ) : null}
                  </div>

                  {customerOrderSummary ? (
                    <div className="mb-3 grid grid-cols-2 gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Last order</p>
                        <p className="tabular-nums">
                          {new Date(customerOrderSummary.lastOrderAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Fulfilled spend</p>
                        <p className="tabular-nums font-medium">
                          {formatCents(
                            customerOrderSummary.fulfilledSpendCents,
                            customerOrderSummary.currency,
                          )}
                        </p>
                        <p className="text-muted-foreground tabular-nums">
                          {customerOrderSummary.fulfilledCount} fulfilled
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {customerOrders === undefined ? (
                    <p className="text-muted-foreground text-sm">Loading orders…</p>
                  ) : customerOrders.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No orders yet.</p>
                  ) : (
                    <ul className="divide-y rounded-md border">
                      {customerOrders.map((o) => {
                        const isOpen = expandedOrderId === o._id;
                        return (
                          <li key={o._id}>
                            <Collapsible
                              open={isOpen}
                              onOpenChange={(open) => setExpandedOrderId(open ? o._id : null)}
                            >
                              <CollapsibleTrigger asChild>
                                <button
                                  type="button"
                                  className="hover:bg-muted/40 flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-mono text-sm">
                                      {o.publicCode ? publicRef(o.publicCode) : o._id.slice(0, 8)}
                                    </p>
                                    <p className="text-muted-foreground truncate text-xs">
                                      {new Date(o.createdAt).toLocaleString()} · {orderStatusLabel(o.status)}
                                      {o.invoiceNumber ? ` · Inv ${publicRef(o.invoiceNumber)}` : ""}
                                    </p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="tabular-nums text-sm font-medium">
                                      {formatCents(o.totalCents, o.currency)}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                      {isOpen ? "Hide" : "View"}
                                    </p>
                                  </div>
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="bg-muted/20 border-t px-3 py-3">
                                  <CustomerOrderInlineDetail
                                    orderId={o._id}
                                    sessionToken={sessionToken!}
                                    open={isOpen}
                                  />
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          )}
          <DrawerFooter className="border-border shrink-0 border-t">
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New user</DialogTitle>
          </DialogHeader>
          <form id="new-user-form" className="space-y-3" onSubmit={(e) => void onCreate(e)}>
            <div className="grid gap-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input
                id="u-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-pass">Password (min 8 characters)</Label>
              <Input
                id="u-pass"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-name">Name (optional)</Label>
              <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-role">Role</Label>
              <Select
                value={newRole}
                onValueChange={(v) => setNewRole(v as PublicUser["role"])}
              >
                <SelectTrigger id="u-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" form="new-user-form" disabled={saving}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
