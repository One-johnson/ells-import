"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
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
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { shouldIgnoreRowOpenDetails } from "@/lib/admin-table-row-details";
import { publicRef } from "@/lib/public-ref";
import { DEFAULT_STORE_CURRENCY } from "@/lib/currency";
import { formatCents, parseMoneyToCents } from "@/lib/money";
import { descriptionToSpecLines } from "@/lib/product-specs";
import { slugify } from "@/lib/slug";
import { useAuth } from "@/providers/auth-provider";
import { useConvexFileUpload } from "@/hooks/use-convex-file-upload";

import { BulkAddProductsDialog } from "./bulk-add-products-dialog";
import { StorageImagePreview } from "./storage-image-preview";
import { productStatusLabel } from "./labels";

type ProductStatus = Doc<"products">["status"];

const STATUSES: ProductStatus[] = ["draft", "active", "archived"];

type ProductRow = Doc<"products"> & { thumbnailUrl: string | null };

type ProductFormState = {
  name: string;
  slug: string;
  description: string;
  sku: string;
  costPrice: string;
  sellingPrice: string;
  imageIds: Id<"_storage">[];
  status: ProductStatus;
  stock: string;
  categoryId: string;
};

function emptyForm(): ProductFormState {
  return {
    name: "",
    slug: "",
    description: "",
    sku: "",
    costPrice: "",
    sellingPrice: "",
    imageIds: [],
    status: "draft",
    stock: "0",
    categoryId: "",
  };
}

function docToForm(p: Doc<"products">): ProductFormState {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description ?? "",
    sku: p.sku ?? "",
    costPrice: ((p.costPriceCents ?? 0) / 100).toFixed(2),
    sellingPrice: (p.priceCents / 100).toFixed(2),
    imageIds: [...(p.imageIds ?? [])],
    status: p.status,
    stock: String(p.stock),
    categoryId: p.categoryId ?? "",
  };
}

const columnIdLabel: Record<string, string> = {
  image: "Image",
  ref: "Ref",
  name: "Product",
  sku: "SKU",
  cost: "Cost",
  selling: "Selling",
  profit: "Profit",
  stock: "Stock",
  status: "Status",
  category: "Category",
};

function DataTableHeader({ id }: { id: string }) {
  if (id === "select" || id === "actions") {
    return null;
  }
  return <span>{columnIdLabel[id] ?? id}</span>;
}

export function AdminProducts() {
  const { sessionToken } = useAuth();
  const { upload, remove: removeStored } = useConvexFileUpload(sessionToken);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const newSessionUploads = useRef<Set<Id<"_storage">>>(new Set());

  const products = useQuery(
    api.products.list,
    sessionToken ? { sessionToken, limit: 500 } : "skip",
  ) as (ProductRow[] | undefined);

  const categories = useQuery(api.categories.listAll);

  const createMut = useMutation(api.products.create);
  const updateMut = useMutation(api.products.update);
  const removeMut = useMutation(api.products.remove);
  const bulkRemoveMut = useMutation(api.products.bulkRemove);
  const bulkStatusMut = useMutation(api.products.bulkUpdateStatus);
  const bulkCategoryMut = useMutation(api.products.bulkSetCategory);
  const bulkUpdateFieldsMut = useMutation(api.products.bulkUpdateFields);
  const generateDescriptionAction = useAction(api.productAi.generateProductDescription);

  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"products"> | null>(null);
  const [form, setForm] = useState<ProductFormState>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [detailProduct, setDetailProduct] = useState<ProductRow | null>(null);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [priceBulkOpen, setPriceBulkOpen] = useState(false);
  const [priceBulk, setPriceBulk] = useState("");
  const [stockBulkOpen, setStockBulkOpen] = useState(false);
  const [stockBulk, setStockBulk] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const firstImageUrl = useQuery(
    api.files.getUrl,
    form.imageIds[0] ? { storageId: form.imageIds[0] } : "skip",
  );

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    if (categories) {
      for (const c of categories) {
        m.set(c._id, c.name);
      }
    }
    return m;
  }, [categories]);

  const preFiltered = useMemo(() => {
    if (!products) {
      return [] as ProductRow[];
    }
    if (statusFilter === "all") {
      return products;
    }
    return products.filter((p) => p.status === statusFilter);
  }, [products, statusFilter]);

  const formProfitCents = useMemo(() => {
    const cost = parseMoneyToCents(form.costPrice.trim() === "" ? "0" : form.costPrice);
    const sell = parseMoneyToCents(form.sellingPrice);
    if (cost === null || sell === null) {
      return null;
    }
    return sell - cost;
  }, [form.costPrice, form.sellingPrice]);

  const generateAiDescription = useCallback(async () => {
    if (!sessionToken) {
      return;
    }
    const sell = parseMoneyToCents(form.sellingPrice);
    if (sell === null) {
      toast.error("Enter a valid selling price.");
      return;
    }
    const hasContext =
      form.name.trim().length > 0 ||
      Boolean(form.sku.trim()) ||
      Boolean(form.categoryId) ||
      Boolean(form.imageIds[0]);
    if (!hasContext) {
      toast.error("Add a name, image, SKU, or category for context.");
      return;
    }
    setAiGenerating(true);
    try {
      const categoryName = form.categoryId
        ? categoryNameById.get(form.categoryId)
        : undefined;
      const { name, description } = await generateDescriptionAction({
        sessionToken,
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        categoryName,
        priceCents: sell,
        currency: DEFAULT_STORE_CURRENCY,
        existingDescription: form.description.trim() || undefined,
        primaryImageUrl: firstImageUrl ?? undefined,
        primaryImageStorageId: form.imageIds[0],
      });
      setForm((f) => {
        const nextName = name.trim().slice(0, 200);
        const nextSlug = f.slug.trim() === "" ? slugify(nextName) : f.slug;
        return { ...f, name: nextName, description, slug: nextSlug };
      });
      toast.success("Name & specifications generated — review before saving.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setAiGenerating(false);
    }
  }, [
    sessionToken,
    form.name,
    form.sellingPrice,
    form.sku,
    form.categoryId,
    form.description,
    form.imageIds,
    categoryNameById,
    firstImageUrl,
    generateDescriptionAction,
  ]);

  const openCreate = useCallback(() => {
    setErr(null);
    setEditingId(null);
    setForm(emptyForm());
    newSessionUploads.current = new Set();
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((p: ProductRow) => {
    setErr(null);
    setEditingId(p._id);
    setForm(docToForm(p));
    newSessionUploads.current = new Set();
    setFormOpen(true);
  }, []);

  const dropOrphansOnClose = useCallback(() => {
    for (const id of newSessionUploads.current) {
      void removeStored(id);
    }
    newSessionUploads.current = new Set();
  }, [removeStored]);

  const onFormOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (editingId === null) {
          dropOrphansOnClose();
        } else {
          for (const id of newSessionUploads.current) {
            void removeStored(id);
          }
          newSessionUploads.current = new Set();
        }
      }
      setFormOpen(open);
    },
    [editingId, dropOrphansOnClose, removeStored],
  );

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) {
      return;
    }
    setUploading(true);
    setErr(null);
    try {
      const ids: Id<"_storage">[] = [];
      for (const file of list) {
        if (!file.type.startsWith("image/")) {
          setErr("Only image files are allowed.");
          return;
        }
        const id = await upload(file);
        ids.push(id);
        newSessionUploads.current.add(id);
      }
      setForm((f) => ({ ...f, imageIds: [...f.imageIds, ...ids] }));
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImageAt = (id: Id<"_storage">) => {
    setForm((f) => ({ ...f, imageIds: f.imageIds.filter((x) => x !== id) }));
    if (newSessionUploads.current.has(id)) {
      newSessionUploads.current.delete(id);
      void removeStored(id);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) {
      return;
    }
    setErr(null);
    const sellingCents = parseMoneyToCents(form.sellingPrice);
    if (sellingCents === null) {
      setErr("Enter a valid selling price.");
      return;
    }
    const costCents = parseMoneyToCents(form.costPrice.trim() === "" ? "0" : form.costPrice);
    if (costCents === null) {
      setErr("Enter a valid cost price.");
      return;
    }
    const stock = Number.parseInt(form.stock, 10);
    if (Number.isNaN(stock) || stock < 0) {
      setErr("Stock must be a non-negative integer.");
      return;
    }
    const slug = form.slug.trim() || slugify(form.name);
    if (!slug) {
      setErr("Slug is required (or provide a name to derive it).");
      return;
    }
    const categoryId =
      form.categoryId === "" ? undefined : (form.categoryId as Id<"categories">);
    setSaving(true);
    try {
      if (editingId) {
        await updateMut({
          sessionToken,
          productId: editingId,
          name: form.name.trim() || undefined,
          slug: slugify(slug) || undefined,
          description: form.description.trim() || undefined,
          sku: form.sku.trim() || undefined,
          priceCents: sellingCents,
          costPriceCents: costCents,
          currency: DEFAULT_STORE_CURRENCY,
          imageIds: form.imageIds,
          status: form.status,
          stock,
          categoryId: form.categoryId === "" ? null : categoryId,
        });
        newSessionUploads.current.clear();
      } else {
        await createMut({
          sessionToken,
          name: form.name.trim(),
          slug: slugify(slug),
          description: form.description.trim() || undefined,
          sku: form.sku.trim() || undefined,
          priceCents: sellingCents,
          costPriceCents: costCents,
          currency: DEFAULT_STORE_CURRENCY,
          imageIds: form.imageIds.length ? form.imageIds : undefined,
          status: form.status,
          stock,
          categoryId,
        });
        newSessionUploads.current.clear();
      }
      setFormOpen(false);
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = useCallback(
    async (id: Id<"products">) => {
      if (!sessionToken) {
        return;
      }
      if (!window.confirm("Delete this product? This cannot be undone.")) {
        return;
      }
      setErr(null);
      try {
        await removeMut({ sessionToken, productId: id });
      } catch (caught) {
        setErr(caught instanceof Error ? caught.message : "Delete failed.");
      }
    },
    [sessionToken, removeMut],
  );

  const selectedProductIds = useMemo((): Id<"products">[] => {
    return (Object.keys(rowSelection) as Id<"products">[]).filter((k) => rowSelection[k]);
  }, [rowSelection]);

  const onBulkStatus = async (status: ProductStatus) => {
    if (!sessionToken || selectedProductIds.length === 0) {
      return;
    }
    setErr(null);
    try {
      await bulkStatusMut({ sessionToken, productIds: selectedProductIds, status });
      setRowSelection({});
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Bulk update failed.");
    }
  };

  const onBulkCategory = async (cat: string) => {
    if (!sessionToken || selectedProductIds.length === 0) {
      return;
    }
    setErr(null);
    try {
      await bulkCategoryMut({
        sessionToken,
        productIds: selectedProductIds,
        categoryId: cat === "__none__" ? null : (cat as Id<"categories">),
      });
      setRowSelection({});
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Bulk update failed.");
    }
  };

  const onBulkDelete = async () => {
    if (!sessionToken || selectedProductIds.length === 0) {
      return;
    }
    if (!window.confirm(`Delete ${selectedProductIds.length} product(s)?`)) {
      return;
    }
    setErr(null);
    try {
      await bulkRemoveMut({ sessionToken, productIds: selectedProductIds });
      setRowSelection({});
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Bulk delete failed.");
    }
  };

  const onBulkSetPrice = async () => {
    if (!sessionToken || selectedProductIds.length === 0) {
      return;
    }
    const c = parseMoneyToCents(priceBulk);
    if (c === null) {
      setErr("Enter a valid price.");
      return;
    }
    setErr(null);
    try {
      await bulkUpdateFieldsMut({
        sessionToken,
        productIds: selectedProductIds,
        priceCents: c,
      });
      setRowSelection({});
      setPriceBulkOpen(false);
      setPriceBulk("");
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Update failed.");
    }
  };

  const onBulkSetStock = async () => {
    if (!sessionToken || selectedProductIds.length === 0) {
      return;
    }
    const n = Number.parseInt(stockBulk, 10);
    if (Number.isNaN(n) || n < 0) {
      setErr("Enter a non-negative integer for stock.");
      return;
    }
    setErr(null);
    try {
      await bulkUpdateFieldsMut({
        sessionToken,
        productIds: selectedProductIds,
        stock: n,
      });
      setRowSelection({});
      setStockBulkOpen(false);
      setStockBulk("");
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Update failed.");
    }
  };

  const columns = useMemo<ColumnDef<ProductRow>[]>(
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
            aria-label={`Select ${row.original.name}`}
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
          const p = row.original;
          if (p.thumbnailUrl) {
            return (
              <img
                src={p.thumbnailUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-9 rounded-md object-cover"
              />
            );
          }
          if (p.imageIds?.[0]) {
            return <StorageImagePreview storageId={p.imageIds[0]} className="size-9" />;
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
        accessorFn: (row) => row.publicCode ?? "",
        header: "Ref",
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">
            {publicRef(row.original.publicCode)}
          </span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 h-8 px-2 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Product
            <ChevronsUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium leading-tight">{row.original.name}</div>
            <div className="text-muted-foreground text-xs">{row.original.slug}</div>
          </div>
        ),
        sortingFn: "alphanumeric",
        filterFn: (row, _id, value) => {
          const t = String(value).trim().toLowerCase();
          if (!t) {
            return true;
          }
          const p = row.original;
          return (
            p.name.toLowerCase().includes(t) ||
            p.slug.toLowerCase().includes(t) ||
            (p.sku?.toLowerCase().includes(t) ?? false) ||
            (p.publicCode?.toLowerCase().includes(t) ?? false)
          );
        },
      },
      {
        id: "sku",
        accessorFn: (row) => row.sku ?? "",
        header: "SKU",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.sku ?? "—"}</span>
        ),
        sortingFn: "alphanumeric",
      },
      {
        id: "cost",
        accessorFn: (row) => row.costPriceCents ?? 0,
        header: ({ column }) => (
          <div className="text-right">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Cost
              <ChevronsUpDown className="ml-1 size-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCents(row.original.costPriceCents ?? 0, row.original.currency)}
          </div>
        ),
        sortingFn: "basic",
      },
      {
        id: "selling",
        accessorKey: "priceCents",
        header: ({ column }) => (
          <div className="text-right">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Selling
              <ChevronsUpDown className="ml-1 size-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCents(row.original.priceCents, row.original.currency)}
          </div>
        ),
        sortingFn: "basic",
      },
      {
        id: "profit",
        accessorFn: (row) => row.priceCents - (row.costPriceCents ?? 0),
        header: ({ column }) => (
          <div className="text-right">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Profit
              <ChevronsUpDown className="ml-1 size-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const p = row.original;
          const unitProfit = p.priceCents - (p.costPriceCents ?? 0);
          return <div className="text-right tabular-nums">{formatCents(unitProfit, p.currency)}</div>;
        },
        sortingFn: "basic",
      },
      {
        id: "stock",
        accessorKey: "stock",
        header: ({ column }) => (
          <div className="text-right">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Stock
              <ChevronsUpDown className="ml-1 size-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{row.original.stock}</div>
        ),
        sortingFn: "basic",
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="outline">{productStatusLabel(row.original.status)}</Badge>
        ),
        filterFn: (row, id, value) => {
          if (value == null || value === "") {
            return true;
          }
          return row.getValue(id) === value;
        },
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => {
          const cid = row.original.categoryId;
          return (
            <span className="text-muted-foreground hidden max-w-[160px] truncate md:inline">
              {cid ? (categoryNameById.get(cid) ?? "—") : "—"}
            </span>
          );
        },
        enableSorting: false,
        meta: { label: "Category" } as { label: string },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Open menu">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => openEdit(p)}>Edit</DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => void onDelete(p._id)}
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
    [categoryNameById, openEdit, onDelete],
  );

  const table = useReactTable({
    data: preFiltered,
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
    globalFilterFn: (row, _columnId, value) => {
      const t = String(value).trim().toLowerCase();
      if (!t) {
        return true;
      }
      const p = row.original;
      return (
        p.name.toLowerCase().includes(t) ||
        p.slug.toLowerCase().includes(t) ||
        (p.sku?.toLowerCase().includes(t) ?? false) ||
        (p.publicCode?.toLowerCase().includes(t) ?? false)
      );
    },
  });

  if (!sessionToken) {
    return null;
  }

  const nSelected = selectedProductIds.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Products</h1>
          <p className="text-muted-foreground text-sm">Manage catalog, pricing, and inventory.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={openCreate} className="shrink-0">
            <Plus className="size-4" />
            New product
          </Button>
          <Button type="button" variant="secondary" onClick={() => setBulkAddOpen(true)} className="shrink-0">
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
          placeholder="Filter name, slug, SKU…"
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as "all" | ProductStatus);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <SelectTrigger className="w-full md:w-44" size="default">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {productStatusLabel(s)}
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
              .filter((c) => c.getCanHide() && c.id !== "select" && c.id !== "image")
              .map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  className="capitalize"
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
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              {STATUSES.map((s) => (
                <DropdownMenuItem key={s} onClick={() => void onBulkStatus(s)}>
                  Set to {productStatusLabel(s)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Category</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => void onBulkCategory("__none__")}>
                Clear category
              </DropdownMenuItem>
              {categories?.map((c) => (
                <DropdownMenuItem key={c._id} onClick={() => void onBulkCategory(c._id)}>
                  {c.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Price &amp; stock</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setPriceBulkOpen(true)}>Set selling price…</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStockBulkOpen(true)}>Set stock…</DropdownMenuItem>
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

      {products === undefined ? (
        <p className="text-muted-foreground text-sm">Loading products…</p>
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
                    No products match your filters.
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
                      setDetailProduct(r.original);
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

      <Dialog open={detailProduct !== null} onOpenChange={(o) => !o && setDetailProduct(null)}>
        <DialogContent className="max-h-[min(90dvh,56rem)] max-w-lg overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Product details</DialogTitle>
            <DialogDescription>{detailProduct?.name ?? ""}</DialogDescription>
          </DialogHeader>
          {detailProduct && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {detailProduct.imageIds?.length ? (
                  detailProduct.imageIds.map((id, i) =>
                    i === 0 && detailProduct.thumbnailUrl ? (
                      <img
                        key={id}
                        src={detailProduct.thumbnailUrl}
                        alt=""
                        className="size-20 rounded-md object-cover"
                      />
                    ) : (
                      <StorageImagePreview key={id} storageId={id} className="size-20" />
                    ),
                  )
                ) : detailProduct.thumbnailUrl ? (
                  <img
                    src={detailProduct.thumbnailUrl}
                    alt=""
                    className="size-20 rounded-md object-cover"
                  />
                ) : (
                  <div className="text-muted-foreground flex size-20 items-center justify-center rounded-md border border-dashed">
                    <ImageIcon className="size-8" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Slug</p>
                <p className="font-mono text-xs">{detailProduct.slug}</p>
              </div>
              {detailProduct.sku ? (
                <div>
                  <p className="text-muted-foreground text-xs">SKU</p>
                  <p>{detailProduct.sku}</p>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant="outline">{productStatusLabel(detailProduct.status)}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Stock</p>
                  <p className="tabular-nums">{detailProduct.stock}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground text-xs">Cost (GHS)</p>
                  <p className="tabular-nums">
                    {formatCents(detailProduct.costPriceCents ?? 0, detailProduct.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Selling (GHS)</p>
                  <p className="tabular-nums">
                    {formatCents(detailProduct.priceCents, detailProduct.currency)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Profit (per unit)</p>
                  <p className="tabular-nums">
                    {formatCents(
                      detailProduct.priceCents - (detailProduct.costPriceCents ?? 0),
                      detailProduct.currency,
                    )}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Category</p>
                <p>
                  {detailProduct.categoryId
                    ? (categoryNameById.get(detailProduct.categoryId) ?? "—")
                    : "—"}
                </p>
              </div>
              {detailProduct.description ? (
                <div>
                  <p className="text-muted-foreground text-xs">Specifications</p>
                  <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-sm">
                    {(() => {
                      const lines = descriptionToSpecLines(detailProduct.description!);
                      const items = lines.length > 0 ? lines : [detailProduct.description!.trim()];
                      return items.map((line, i) => (
                        <li key={i}>{line}</li>
                      ));
                    })()}
                  </ul>
                </div>
              ) : null}
              <div>
                <p className="text-muted-foreground text-xs">Reference #</p>
                <p className="font-mono text-sm">{publicRef(detailProduct.publicCode)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(detailProduct.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p>{new Date(detailProduct.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetailProduct(null)}>
              Close
            </Button>
            {detailProduct ? (
              <Button
                type="button"
                onClick={() => {
                  openEdit(detailProduct);
                  setDetailProduct(null);
                }}
              >
                Edit
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={onPickFiles}
      />

      <Drawer
        open={formOpen}
        onOpenChange={onFormOpenChange}
        direction="right"
        shouldScaleBackground={false}
      >
        <DrawerContent className="flex h-full max-h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DrawerHeader className="border-border shrink-0 border-b px-4 py-4 text-left">
            <DrawerTitle>{editingId ? "Edit product" : "New product"}</DrawerTitle>
          </DrawerHeader>
          <form
            id="product-form"
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
            onSubmit={(e) => void onSubmit(e)}
          >
            <div className="grid gap-1.5">
              <Label>Images</Label>
              <p className="text-muted-foreground text-xs">
                Upload image files. Stored in Convex; external image URLs are not supported.
              </p>
              <div className="flex flex-wrap items-start gap-2">
                {form.imageIds.map((id) => (
                  <div key={id} className="relative">
                    <StorageImagePreview storageId={id} className="size-16" />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="ring-background absolute -right-1.5 -top-1.5 size-6 rounded-full ring-2"
                      onClick={() => removeImageAt(id)}
                      aria-label="Remove image"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-16 w-20 flex-col gap-1"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4" />
                  {uploading ? "…" : "Add"}
                </Button>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-name">Name</Label>
              <p className="text-muted-foreground text-xs">
                Optional draft—AI can propose a title if you add an image, category, or SKU.
              </p>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-end justify-between gap-2">
                <Label htmlFor="p-slug">Slug</Label>
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
                id="p-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <Label htmlFor="p-desc">Specifications</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  disabled={
                    aiGenerating ||
                    !sessionToken ||
                    saving ||
                    (!!form.imageIds[0] && firstImageUrl === undefined)
                  }
                  onClick={() => void generateAiDescription()}
                  title={
                    form.imageIds[0] && firstImageUrl === undefined
                      ? "Loading image URL…"
                      : undefined
                  }
                >
                  <Sparkles className="size-3.5" aria-hidden />
                  {aiGenerating ? "Generating…" : "Generate name & specs"}
                </Button>
              </div>
              <Textarea
                id="p-desc"
                rows={5}
                placeholder="One bullet per line (e.g. • Material: …)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <p className="text-muted-foreground text-xs">
                One specification per line; optional • prefix. AI suggests bullet-style specs.
              </p>
            </div>
            <p className="text-muted-foreground text-xs">All amounts are Ghana Cedis (GHS).</p>
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="p-cost">Cost price</Label>
                <Input
                  id="p-cost"
                  inputMode="decimal"
                  value={form.costPrice}
                  onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-selling">Selling price</Label>
                <Input
                  id="p-selling"
                  inputMode="decimal"
                  value={form.sellingPrice}
                  onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-profit">Profit (per unit)</Label>
              <Input
                id="p-profit"
                readOnly
                className="bg-muted/50 tabular-nums"
                value={
                  formProfitCents === null
                    ? ""
                    : formatCents(formProfitCents, DEFAULT_STORE_CURRENCY)
                }
                placeholder="—"
              />
            </div>
            <div className="grid gap-1.5 sm:max-w-xs">
              <Label htmlFor="p-stock">Stock</Label>
              <Input
                id="p-stock"
                inputMode="numeric"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="p-sku">SKU</Label>
                <Input
                  id="p-sku"
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as ProductStatus }))}
                >
                  <SelectTrigger id="p-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {productStatusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-cat">Category</Label>
              <Select
                value={form.categoryId || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, categoryId: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger id="p-cat" className="w-full">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No category</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
          <DrawerFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={() => onFormOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="product-form" disabled={saving || uploading}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <BulkAddProductsDialog
        open={bulkAddOpen}
        onOpenChange={setBulkAddOpen}
        sessionToken={sessionToken}
        categories={categories?.map((c) => ({ _id: c._id, name: c.name }))}
      />

      <Dialog open={priceBulkOpen} onOpenChange={setPriceBulkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set selling price for {selectedProductIds.length} product(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-price">New selling price (GHS)</Label>
            <Input
              id="bulk-price"
              inputMode="decimal"
              value={priceBulk}
              onChange={(e) => setPriceBulk(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPriceBulkOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onBulkSetPrice()}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stockBulkOpen} onOpenChange={setStockBulkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set stock for {selectedProductIds.length} product(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-stock">Stock quantity</Label>
            <Input
              id="bulk-stock"
              inputMode="numeric"
              value={stockBulk}
              onChange={(e) => setStockBulk(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStockBulkOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onBulkSetStock()}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
