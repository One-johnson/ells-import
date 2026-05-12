"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
  ImageIcon,
  MoreHorizontal,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { shouldIgnoreRowOpenDetails } from "@/lib/admin-table-row-details";
import { publicRef } from "@/lib/public-ref";
import { slugify } from "@/lib/slug";
import { useAuth } from "@/providers/auth-provider";
import { useConvexFileUpload } from "@/hooks/use-convex-file-upload";

import { AdminConfirmDeleteDialog } from "@/components/admin/admin-confirm-delete-dialog";
import { BulkAddCategoriesDialog } from "./bulk-add-categories-dialog";
import { StorageImagePreview } from "./storage-image-preview";

type CategoryRow = Doc<"categories"> & { thumbnailUrl: string | null };

type FormState = {
  name: string;
  slug: string;
  description: string;
  imageId: Id<"_storage"> | null;
  parentId: string;
  sortOrder: string;
};

function emptyForm(): FormState {
  return {
    name: "",
    slug: "",
    description: "",
    imageId: null,
    parentId: "",
    sortOrder: "0",
  };
}

function docToForm(c: Doc<"categories">): FormState {
  return {
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    imageId: c.imageId ?? null,
    parentId: c.parentId ?? "",
    sortOrder: String(c.sortOrder),
  };
}

function buildTree(cats: CategoryRow[]) {
  const byId = new Map(cats.map((c) => [c._id, c]));
  const children = new Map<Id<"categories"> | "root", CategoryRow[]>();
  for (const c of cats) {
    const k = c.parentId ?? "root";
    if (!children.has(k)) {
      children.set(k, []);
    }
    children.get(k)!.push(c);
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }
  const ordered: { cat: CategoryRow; depth: number }[] = [];
  function walk(parent: Id<"categories"> | "root", depth: number) {
    for (const c of children.get(parent) ?? []) {
      if (c.parentId !== (parent === "root" ? undefined : parent)) {
        continue;
      }
      ordered.push({ cat: c, depth });
      walk(c._id, depth + 1);
    }
  }
  walk("root", 0);
  const seen = new Set(ordered.map((o) => o.cat._id));
  for (const c of cats) {
    if (!seen.has(c._id)) {
      ordered.push({ cat: c, depth: 0 });
    }
  }
  return { ordered, byId };
}

type TreeRow = { cat: CategoryRow; depth: number };

function DataTableHeaderLabel({ id }: { id: string }) {
  const labels: Record<string, string> = {
    image: "Image",
    ref: "Ref",
    name: "Name",
    slug: "Slug",
    parent: "Parent",
    sort: "Order",
  };
  return <span>{labels[id] ?? id}</span>;
}

export function AdminCategories() {
  const { sessionToken } = useAuth();
  const { upload, remove: removeStored } = useConvexFileUpload(sessionToken);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const newSessionUploads = useRef<Set<Id<"_storage">>>(new Set());

  const all = useQuery(api.categories.listAll) as CategoryRow[] | undefined;

  const createMut = useMutation(api.categories.create);
  const updateMut = useMutation(api.categories.update);
  const removeMut = useMutation(api.categories.remove);
  const bulkSortMut = useMutation(api.categories.bulkUpdateSort);
  const bulkRemoveMut = useMutation(api.categories.bulkRemove);
  const bulkSetParentMut = useMutation(api.categories.bulkSetParent);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"categories"> | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [parentBulkOpen, setParentBulkOpen] = useState(false);
  const [parentBulk, setParentBulk] = useState<string>("__root__");
  const [detailCategory, setDetailCategory] = useState<CategoryRow | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<
    null | { kind: "single"; id: Id<"categories"> } | { kind: "bulk" }
  >(null);

  const { ordered: treeRows, byId } = useMemo(() => {
    if (!all) {
      return { ordered: [] as TreeRow[], byId: new Map<Id<"categories">, CategoryRow>() };
    }
    return buildTree(all);
  }, [all]);

  const onFormOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        for (const id of newSessionUploads.current) {
          void removeStored(id);
        }
        newSessionUploads.current = new Set();
      }
      setFormOpen(open);
    },
    [removeStored],
  );

  const openCreate = useCallback(() => {
    setErr(null);
    setEditingId(null);
    setForm(emptyForm());
    newSessionUploads.current = new Set();
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((c: CategoryRow) => {
    setErr(null);
    setEditingId(c._id);
    setForm(docToForm(c));
    newSessionUploads.current = new Set();
    setFormOpen(true);
  }, []);

  const parentOptions = useMemo(() => {
    if (!all) {
      return [];
    }
    return all.filter((c) => c._id !== editingId);
  }, [all, editingId]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) {
      return;
    }
    if (!f.type.startsWith("image/")) {
      setErr("Only image files are allowed.");
      return;
    }
    setUploading(true);
    setErr(null);
    try {
      const prev = form.imageId;
      if (prev && newSessionUploads.current.has(prev)) {
        newSessionUploads.current.delete(prev);
        await removeStored(prev);
      }
      const id = await upload(f);
      newSessionUploads.current.add(id);
      setForm((s) => ({ ...s, imageId: id }));
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    if (form.imageId) {
      if (newSessionUploads.current.has(form.imageId)) {
        newSessionUploads.current.delete(form.imageId);
        void removeStored(form.imageId);
      }
      setForm((s) => ({ ...s, imageId: null }));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) {
      return;
    }
    setErr(null);
    const sort = Number.parseInt(form.sortOrder, 10);
    if (Number.isNaN(sort)) {
      setErr("Sort order must be a number.");
      return;
    }
    const slug = form.slug.trim() || slugify(form.name);
    if (!slug) {
      setErr("Slug is required.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateMut({
          sessionToken,
          categoryId: editingId,
          name: form.name.trim() || undefined,
          slug: slugify(slug) || undefined,
          description: form.description.trim() || undefined,
          imageId: form.imageId === null ? null : form.imageId,
          parentId: form.parentId === "" ? null : (form.parentId as Id<"categories">),
          sortOrder: sort,
        });
      } else {
        await createMut({
          sessionToken,
          name: form.name.trim(),
          slug: slugify(slug),
          description: form.description.trim() || undefined,
          imageId: form.imageId ?? undefined,
          parentId:
            form.parentId === "" ? undefined : (form.parentId as Id<"categories">),
          sortOrder: sort,
        });
      }
      newSessionUploads.current.clear();
      setFormOpen(false);
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteCategory = useCallback((id: Id<"categories">) => {
    setDeletePrompt({ kind: "single", id });
  }, []);

  const bumpSort = useCallback(
    async (id: Id<"categories">, delta: number) => {
      if (!sessionToken || !all) {
        return;
      }
      const c = byId.get(id);
      if (!c) {
        return;
      }
      const siblings = all
        .filter((x) => (x.parentId ?? "none") === (c.parentId ?? "none"))
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = siblings.findIndex((s) => s._id === id);
      const j = idx + delta;
      if (j < 0 || j >= siblings.length) {
        return;
      }
      const a = siblings[idx]!;
      const b = siblings[j]!;
      setErr(null);
      try {
        await bulkSortMut({
          sessionToken,
          updates: [
            { categoryId: a._id, sortOrder: b.sortOrder },
            { categoryId: b._id, sortOrder: a.sortOrder },
          ],
        });
      } catch (caught) {
        setErr(caught instanceof Error ? caught.message : "Reorder failed.");
      }
    },
    [sessionToken, all, byId, bulkSortMut],
  );

  const selectedCategoryIds = useMemo((): Id<"categories">[] => {
    return (Object.keys(rowSelection) as Id<"categories">[]).filter(
      (k) => rowSelection[k],
    );
  }, [rowSelection]);

  const onApplyBulkParent = async () => {
    if (!sessionToken || selectedCategoryIds.length === 0) {
      return;
    }
    setErr(null);
    try {
      await bulkSetParentMut({
        sessionToken,
        categoryIds: selectedCategoryIds,
        parentId:
          parentBulk === "__root__" ? null : (parentBulk as Id<"categories">),
      });
      setRowSelection({});
      setParentBulkOpen(false);
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Bulk update failed.");
    }
  };

  const columns = useMemo<ColumnDef<TreeRow>[]>(
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
            aria-label={`Select ${row.original.cat.name}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 36,
      },
      {
        id: "image",
        header: "Image",
        cell: ({ row }) => {
          const c = row.original.cat;
          if (c.thumbnailUrl) {
            return (
              <img
                src={c.thumbnailUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-9 rounded-md object-cover"
              />
            );
          }
          if (c.imageId) {
            return <StorageImagePreview storageId={c.imageId} className="size-9" />;
          }
          return (
            <div className="text-muted-foreground flex size-9 items-center justify-center rounded-md border border-dashed">
              <ImageIcon className="size-4" />
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "ref",
        accessorFn: (r) => r.cat.publicCode ?? "",
        header: "Ref",
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">
            {publicRef(row.original.cat.publicCode)}
          </span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        id: "name",
        accessorFn: (r) => r.cat.name,
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
          <span
            className="inline-block font-medium"
            style={{ paddingLeft: row.original.depth * 12 }}
            title={row.original.cat.name}
          >
            {row.original.cat.name}
          </span>
        ),
        sortingFn: "alphanumeric",
        filterFn: (row, _id, value) => {
          const t = String(value).trim().toLowerCase();
          if (!t) {
            return true;
          }
          return (
            row.original.cat.name.toLowerCase().includes(t) ||
            row.original.cat.slug.toLowerCase().includes(t) ||
            (row.original.cat.publicCode?.toLowerCase().includes(t) ?? false)
          );
        },
      },
      {
        id: "slug",
        accessorFn: (r) => r.cat.slug,
        header: "Slug",
        cell: ({ row }) => (
          <span className="text-muted-foreground hidden font-mono text-sm sm:inline">
            {row.original.cat.slug}
          </span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        id: "parent",
        header: "Parent",
        cell: ({ row }) => {
          const pid = row.original.cat.parentId;
          return (
            <span className="text-muted-foreground hidden md:inline">
              {pid ? (byId.get(pid)?.name ?? "—") : "—"}
            </span>
          );
        },
        enableSorting: false,
      },
      {
        id: "sort",
        accessorFn: (r) => r.cat.sortOrder,
        header: ({ column }) => (
          <div className="text-right">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Order
              <ChevronsUpDown className="ml-1 size-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{row.original.cat.sortOrder}</div>
        ),
        sortingFn: "basic",
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const c = row.original.cat;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Open menu">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => void bumpSort(c._id, -1)}>
                  Move up
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void bumpSort(c._id, 1)}>
                  Move down
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEdit(c)}>Edit</DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => requestDeleteCategory(c._id)}
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
    [byId, openEdit, requestDeleteCategory, bumpSort],
  );

  const table = useReactTable({
    data: treeRows,
    columns,
    getRowId: (row) => row.cat._id,
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
      return (
        row.original.cat.name.toLowerCase().includes(t) ||
        row.original.cat.slug.toLowerCase().includes(t) ||
        (row.original.cat.publicCode?.toLowerCase().includes(t) ?? false)
      );
    },
  });

  if (!sessionToken) {
    return null;
  }

  const nSelected = selectedCategoryIds.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Categories</h1>
          <p className="text-muted-foreground text-sm">Organize products with a nested hierarchy.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={openCreate} className="shrink-0">
            <Plus className="size-4" />
            New category
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setBulkAddOpen(true)}
            className="shrink-0"
          >
            <Plus className="size-4" />
            Bulk add
          </Button>
        </div>
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
          placeholder="Filter name or slug…"
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        />
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
              .filter((c) => c.getCanHide() && c.id !== "select" && c.id !== "image")
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="secondary">
                Bulk actions
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setParentBulkOpen(true)}>Set parent…</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeletePrompt({ kind: "bulk" })}
              >
                <Trash2 className="text-destructive" />
                Delete selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {all === undefined ? (
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
                    No categories match.
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
                      setDetailCategory(r.original.cat);
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onPickFile}
      />

      <Dialog open={detailCategory !== null} onOpenChange={(o) => !o && setDetailCategory(null)}>
        <DialogContent className="max-h-[min(90dvh,48rem)] max-w-md overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Category details</DialogTitle>
            <DialogDescription>
              {detailCategory?.name ?? ""}
            </DialogDescription>
          </DialogHeader>
          {detailCategory && (
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                {detailCategory.thumbnailUrl ? (
                  <img
                    src={detailCategory.thumbnailUrl}
                    alt=""
                    className="size-20 shrink-0 rounded-md object-cover"
                  />
                ) : detailCategory.imageId ? (
                  <StorageImagePreview storageId={detailCategory.imageId} className="size-20" />
                ) : (
                  <div className="text-muted-foreground flex size-20 shrink-0 items-center justify-center rounded-md border border-dashed">
                    <ImageIcon className="size-8" />
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{detailCategory.name}</p>
                  <p className="text-muted-foreground font-mono text-xs">{detailCategory.slug}</p>
                </div>
              </div>
              {detailCategory.description ? (
                <div>
                  <p className="text-muted-foreground text-xs">Description</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{detailCategory.description}</p>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground text-xs">Parent</p>
                  <p>
                    {detailCategory.parentId
                      ? (byId.get(detailCategory.parentId)?.name ?? "—")
                      : "— (top level)"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Sort order</p>
                  <p className="tabular-nums">{detailCategory.sortOrder}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Reference #</p>
                <p className="font-mono text-sm">{publicRef(detailCategory.publicCode)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(detailCategory.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p>{new Date(detailCategory.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetailCategory(null)}>
              Close
            </Button>
            {detailCategory ? (
              <Button
                type="button"
                onClick={() => {
                  openEdit(detailCategory);
                  setDetailCategory(null);
                }}
              >
                Edit
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer
        open={formOpen}
        onOpenChange={onFormOpenChange}
        direction="right"
        shouldScaleBackground={false}
      >
        <DrawerContent className="flex h-full max-h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DrawerHeader className="border-border shrink-0 border-b px-4 py-4 text-left">
            <DrawerTitle>{editingId ? "Edit category" : "New category"}</DrawerTitle>
          </DrawerHeader>
          <form
            id="category-form"
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
            onSubmit={(e) => void onSubmit(e)}
          >
            <div className="grid gap-1.5">
              <Label>Image</Label>
              <p className="text-muted-foreground text-xs">
                Upload an image file. Stored in Convex; external URLs are not supported.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {form.imageId ? (
                  <div className="relative">
                    <StorageImagePreview storageId={form.imageId} className="size-20" />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="ring-background absolute -right-1.5 -top-1.5 size-6 rounded-full ring-2"
                      onClick={() => void clearImage()}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-muted-foreground flex size-20 items-center justify-center rounded-md border border-dashed">
                    <ImageIcon className="size-6" />
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  {uploading ? "Uploading…" : "Upload image"}
                </Button>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-end justify-between gap-2">
                <Label htmlFor="c-slug">Slug</Label>
                <Button
                  type="button"
                  variant="link"
                  className="text-muted-foreground h-auto p-0 text-xs"
                  onClick={() => setForm((f) => ({ ...f, slug: slugify(f.name) }))}
                >
                  From name
                </Button>
              </div>
              <Input
                id="c-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-desc">Description</Label>
              <Textarea
                id="c-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="c-parent">Parent</Label>
                <Select
                  value={form.parentId || "__root__"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, parentId: v === "__root__" ? "" : v }))
                  }
                >
                  <SelectTrigger id="c-parent" className="w-full">
                    <SelectValue placeholder="Top level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__root__">Top level</SelectItem>
                    {parentOptions.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-sort">Sort order</Label>
                <Input
                  id="c-sort"
                  inputMode="numeric"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  required
                />
              </div>
            </div>
          </form>
          <DrawerFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onFormOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" form="category-form" disabled={saving || uploading}>
              {saving ? "Saving…" : editingId ? "Save" : "Create"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <BulkAddCategoriesDialog
        open={bulkAddOpen}
        onOpenChange={setBulkAddOpen}
        sessionToken={sessionToken}
        categories={all?.map((c) => ({ _id: c._id, name: c.name }))}
      />

      <Dialog open={parentBulkOpen} onOpenChange={setParentBulkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set parent for {selectedCategoryIds.length} categories</DialogTitle>
            <DialogDescription>
              Selected categories will be moved under the chosen parent, or to top level.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-parent">Parent</Label>
            <Select value={parentBulk} onValueChange={setParentBulk}>
              <SelectTrigger id="bulk-parent" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">Top level</SelectItem>
                {all
                  ?.filter((c) => !selectedCategoryIds.includes(c._id))
                  .map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setParentBulkOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onApplyBulkParent()}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConfirmDeleteDialog
        open={deletePrompt !== null}
        onOpenChange={(o) => !o && setDeletePrompt(null)}
        title={
          deletePrompt?.kind === "bulk"
            ? `Delete ${selectedCategoryIds.length} categories?`
            : "Delete this category?"
        }
        description={
          deletePrompt?.kind === "bulk"
            ? `This will permanently remove ${selectedCategoryIds.length} categories. Child categories may be affected depending on server rules. This cannot be undone.`
            : "This will permanently remove this category. This cannot be undone."
        }
        onConfirm={async () => {
          if (!sessionToken || !deletePrompt) {
            return;
          }
          setErr(null);
          try {
            if (deletePrompt.kind === "single") {
              const id = deletePrompt.id;
              await removeMut({ sessionToken, categoryId: id });
              setRowSelection((prev) => {
                const p = { ...prev };
                delete p[id as string];
                return p;
              });
            } else {
              await bulkRemoveMut({ sessionToken, categoryIds: selectedCategoryIds });
              setRowSelection({});
            }
          } catch (caught) {
            setErr(caught instanceof Error ? caught.message : "Delete failed.");
            throw caught;
          }
        }}
      />
    </div>
  );
}
