"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import { formatCurrency, cn } from "@/lib/utils";
import { SkeletonTable } from "@/components/skeletons";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableAdvanced } from "@/components/ui/data-table-advanced";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Id } from "convex/_generated/dataModel";
import { Plus, Pencil, Trash2, MoreHorizontal, Upload, Check, Flame, Clock, Download, X, Eye, Archive, Hash, Tag, Link2, FileText, DollarSign, Package, Barcode, FolderOpen, Calendar } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";

const PRODUCT_STATUSES = ["available", "new", "low_stock", "pre_order", "sold_out", "archived"] as const;
const PRODUCT_STATUS_CONFIG: Record<string, { label: string; variant: "success" | "info" | "warning" | "accent" | "muted"; icon?: React.ReactNode }> = {
  available: { label: "Available", variant: "success", icon: <Check className="size-3 mr-0.5" /> },
  new: { label: "New", variant: "info" },
  low_stock: { label: "Low Stock", variant: "warning", icon: <Flame className="size-3 mr-0.5" /> },
  pre_order: { label: "Pre-Order", variant: "accent", icon: <Clock className="size-3 mr-0.5" /> },
  sold_out: { label: "Sold Out", variant: "muted" },
  archived: { label: "Archived", variant: "muted" },
};

type ProductDoc = {
  _id: Id<"products">;
  productId?: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  status: string;
  stock: number;
  sku?: string;
  categoryIds?: string[];
  createdAt: number;
  updatedAt: number;
};

type CategoryDoc = {
  _id: Id<"categories">;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  createdAt: number;
  updatedAt: number;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function AdminProductsPage() {
  const { sessionToken } = useAuth();
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDoc | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryDoc | null>(null);
  const [productStatusFilter, setProductStatusFilter] = useState<string>("all");
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>("all");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkCategoriesOpen, setBulkCategoriesOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<ProductDoc | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<ProductDoc[]>([]);
  const [productRowSelection, setProductRowSelection] = useState<Record<string, boolean>>({});

  const productsResult = useQuery(api.products.list, { limit: 500 });
  const categoriesResult = useQuery(api.categories.list, { limit: 200 });
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const removeProduct = useMutation(api.products.remove);
  const bulkCreateProduct = useMutation(api.products.bulkCreate);
  const bulkUpdateStatus = useMutation(api.products.bulkUpdateStatus);
  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);
  const removeCategory = useMutation(api.categories.remove);
  const bulkCreateCategories = useMutation(api.categories.bulkCreate);

  const allProducts = productsResult?.items ?? [];
  const products = allProducts.filter((p) => {
    if (productStatusFilter !== "all" && p.status !== productStatusFilter) return false;
    if (productCategoryFilter !== "all" && !p.categoryIds?.includes(productCategoryFilter)) return false;
    return true;
  });
  const categories = categoriesResult?.items ?? [];
  const isLoading = productsResult === undefined || categoriesResult === undefined;

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductDialogOpen(true);
  };
  const openEditProduct = (p: ProductDoc) => {
    setEditingProduct(p);
    setProductDialogOpen(true);
  };
  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };
  const openEditCategory = (c: CategoryDoc) => {
    setEditingCategory(c);
    setCategoryDialogOpen(true);
  };

  const productColumns: ColumnDef<ProductDoc>[] = [
    {
      accessorKey: "productId",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.productId ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium max-w-[180px] truncate block" title={row.original.name}>
          {row.original.name}
        </span>
      ),
    },
    {
      id: "image",
      header: "Image",
      cell: ({ row }) => {
        const src = row.original.images?.[0];
        return (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
            {src ? (
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">—</div>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.slug}</span>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => {
        const names = row.original.categoryIds
          ?.map((id) => categories.find((c) => c._id === id)?.name)
          .filter(Boolean) ?? [];
        return (
          <span className="text-muted-foreground text-sm">
            {names.length ? names.join(", ") : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => formatCurrency(row.original.price / 100),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = PRODUCT_STATUS_CONFIG[row.original.status] ?? { label: row.original.status, variant: "muted" as const };
        return (
          <Badge variant={config.variant} className="rounded-full">
            {config.icon}
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "stock",
      header: "Stock",
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString("en-US", { dateStyle: "short" }),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setViewProduct(row.original)}>
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditProduct(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                if (confirm("Delete this product?"))
                  removeProduct({ sessionToken: sessionToken ?? undefined, productId: row.original._id })
                    .then(() => toast.success("Product deleted"))
                    .catch((e) => toast.error(e?.message ?? "Failed"));
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ];

  const categoryColumns: ColumnDef<CategoryDoc>[] = [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.slug}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString("en-US", { dateStyle: "short" }),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditCategory(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                if (confirm("Delete this category?"))
                  removeCategory({
                    sessionToken: sessionToken ?? undefined,
                    categoryId: row.original._id,
                  })
                    .then(() => toast.success("Category deleted"))
                    .catch((e) => toast.error(e?.message ?? "Failed"));
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Products &amp; Categories</h1>
        <p className="text-muted-foreground mt-1">
          Manage products and categories with full CRUD.
        </p>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={productStatusFilter} onValueChange={setProductStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {PRODUCT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PRODUCT_STATUS_CONFIG[s]?.label ?? s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Bulk import CSV
              </Button>
              <Button onClick={openNewProduct}>
                <Plus className="mr-2 h-4 w-4" />
                Add product
              </Button>
            </div>
          </div>
          {isLoading ? (
            <SkeletonTable rows={8} cols={6} />
          ) : (
            <DataTableAdvanced
              columns={productColumns}
              data={products}
              filterPlaceholder="Filter products..."
              initialSorting={[{ id: "createdAt", desc: true }]}
              enableRowSelection
              getRowId={(row) => row._id}
              rowSelection={productRowSelection}
              onRowSelectionChange={setProductRowSelection}
              onSelectionChange={setSelectedProducts}
              bulkActions={
                <>
                  <Select
                    onValueChange={async (status) => {
                      if (!selectedProducts.length || !status) return;
                      try {
                        await bulkUpdateStatus({
                          sessionToken: sessionToken ?? undefined,
                          productIds: selectedProducts.map((p) => p._id),
                          status: status as (typeof PRODUCT_STATUSES)[number],
                        });
                        toast.success(`Status updated for ${selectedProducts.length} product(s)`);
                        setSelectedProducts([]);
                        setProductRowSelection({});
                      } catch (e: any) {
                        toast.error(e?.message ?? "Update failed");
                      }
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {PRODUCT_STATUS_CONFIG[s]?.label ?? s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!selectedProducts.length) return;
                      if (!confirm(`Archive ${selectedProducts.length} product(s)? They will be hidden from the store.`)) return;
                      try {
                        await bulkUpdateStatus({
                          sessionToken: sessionToken ?? undefined,
                          productIds: selectedProducts.map((p) => p._id),
                          status: "archived",
                        });
                        toast.success(`${selectedProducts.length} product(s) archived`);
                        setSelectedProducts([]);
                        setProductRowSelection({});
                      } catch (e: any) {
                        toast.error(e?.message ?? "Failed");
                      }
                    }}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Soft delete (archive)
                  </Button>
                </>
              }
            />
          )}
        </TabsContent>
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkCategoriesOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Bulk add categories
            </Button>
            <Button onClick={openNewCategory}>
              <Plus className="mr-2 h-4 w-4" />
              Add category
            </Button>
          </div>
          {isLoading ? (
            <SkeletonTable rows={8} cols={4} />
          ) : (
            <DataTableAdvanced
              columns={categoryColumns}
              data={categories}
              filterPlaceholder="Filter categories..."
              initialSorting={[{ id: "createdAt", desc: true }]}
            />
          )}
        </TabsContent>
      </Tabs>

      <ProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        product={editingProduct}
        categories={categories}
        sessionToken={sessionToken ?? undefined}
        onSuccess={() => {
          setProductDialogOpen(false);
          setEditingProduct(null);
          toast.success(editingProduct ? "Product updated" : "Product created");
        }}
        createProduct={createProduct}
        updateProduct={updateProduct}
      />

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
        sessionToken={sessionToken ?? undefined}
        onSuccess={() => {
          setCategoryDialogOpen(false);
          setEditingCategory(null);
          toast.success(editingCategory ? "Category updated" : "Category created");
        }}
        createCategory={createCategory}
        updateCategory={updateCategory}
      />

      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        categories={categories}
        sessionToken={sessionToken ?? undefined}
        bulkCreate={bulkCreateProduct}
        onSuccess={() => {
          setBulkImportOpen(false);
          toast.success("Products imported");
        }}
      />

      {viewProduct && (
        <ProductDetailsDialog
          product={viewProduct}
          categories={categories}
          onClose={() => setViewProduct(null)}
        />
      )}

      <BulkCategoriesDialog
        open={bulkCategoriesOpen}
        onOpenChange={setBulkCategoriesOpen}
        sessionToken={sessionToken ?? undefined}
        bulkCreate={bulkCreateCategories}
        onSuccess={() => {
          setBulkCategoriesOpen(false);
          toast.success("Categories created");
        }}
      />
    </div>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  product,
  categories,
  sessionToken,
  onSuccess,
  createProduct,
  updateProduct,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductDoc | null;
  categories: CategoryDoc[];
  sessionToken?: string;
  onSuccess: () => void;
  createProduct: (args: any) => Promise<Id<"products">>;
  updateProduct: (args: any) => Promise<Id<"products">>;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<string>("new");
  const [stock, setStock] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [sku, setSku] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.products.generateUploadUrl);
  const resolveImageUrl = useMutation(api.products.resolveImageUrl);

  const reset = useCallback(() => {
    if (product) {
      setName(product.name);
      setSlug(product.slug);
      setDescription(product.description);
      setPrice(String(product.price / 100));
      setStatus(product.status);
      setStock(String(product.stock));
      setImages(product.images?.length ? [...product.images] : []);
      setSku(product.sku ?? "");
      setCategoryIds(product.categoryIds ?? []);
    } else {
      setName("");
      setSlug("");
      setDescription("");
      setPrice("");
      setStatus("new");
      setStock("0");
      setImages([]);
      setSku("");
      setCategoryIds([]);
    }
  }, [product]);

  useEffect(() => {
    if (open) reset();
  }, [open, product?._id, reset]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!product) setSlug(slugify(v));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({ sessionToken });
      const result = await fetch(uploadUrl, { method: "POST", body: file });
      if (!result.ok) throw new Error("Upload failed");
      const { storageId } = (await result.json()) as { storageId: string };
      const url = await resolveImageUrl({ storageId: storageId as Id<"_storage"> });
      if (url) setImages((prev) => [...prev, url]);
      else toast.error("Could not get image URL");
    } catch (err: any) {
      toast.error(err?.message ?? "Image upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = Math.round(parseFloat(price || "0") * 100);
    const stockNum = parseInt(stock || "0", 10);
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }
    const validStatus = PRODUCT_STATUSES.includes(status as (typeof PRODUCT_STATUSES)[number])
      ? (status as (typeof PRODUCT_STATUSES)[number])
      : "new";
    try {
      if (product) {
        await updateProduct({
          sessionToken,
          productId: product._id,
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          price: priceNum,
          status: validStatus,
          stock: stockNum,
          images,
          sku: sku.trim() || undefined,
          categoryIds: categoryIds.length ? categoryIds : undefined,
        });
      } else {
        await createProduct({
          sessionToken,
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          price: priceNum,
          status: validStatus,
          stock: stockNum,
          images: images.length ? images : [""],
          sku: sku.trim() || undefined,
          categoryIds: categoryIds.length ? categoryIds : undefined,
        });
      }
      onSuccess();
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save product");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>Fill in the product details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {product?.productId && (
            <div>
              <label className="text-sm font-medium">Product ID</label>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{product.productId}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Product name"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Slug</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="product-slug"
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Price (GHS)</label>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Stock</label>
              <Input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PRODUCT_STATUS_CONFIG[s]?.label ?? s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Category</label>
            <div className="mt-2 flex flex-wrap gap-3">
              {categories.map((c) => (
                <label key={c._id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={categoryIds.includes(c._id)}
                    onChange={() => toggleCategory(c._id)}
                    className="rounded border-input"
                  />
                  {c.name}
                </label>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground">No categories yet.</p>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">SKU (optional)</label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="SKU"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Images</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Upload image"}
              </Button>
            </div>
            {images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted"
                  >
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                      aria-label="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{product ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({
  open,
  onOpenChange,
  category,
  sessionToken,
  onSuccess,
  createCategory,
  updateCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryDoc | null;
  sessionToken?: string;
  onSuccess: () => void;
  createCategory: (args: any) => Promise<Id<"categories">>;
  updateCategory: (args: any) => Promise<Id<"categories">>;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const reset = useCallback(() => {
    if (category) {
      setName(category.name);
      setSlug(category.slug);
      setDescription(category.description ?? "");
    } else {
      setName("");
      setSlug("");
      setDescription("");
    }
  }, [category]);

  useEffect(() => {
    if (open) reset();
  }, [open, category?._id, reset]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!category) setSlug(slugify(v));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }
    try {
      if (category) {
        await updateCategory({
          sessionToken,
          categoryId: category._id,
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
        });
      } else {
        await createCategory({
          sessionToken,
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
        });
      }
      onSuccess();
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save category");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Category name and slug.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Category name"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Slug</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="category-slug"
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{category ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProductDetailsDialog({
  product,
  categories,
  onClose,
}: {
  product: ProductDoc;
  categories: CategoryDoc[];
  onClose: () => void;
}) {
  const categoryNames = product.categoryIds
    ?.map((id) => categories.find((c) => c._id === id)?.name)
    .filter(Boolean) ?? [];
  const statusConfig = PRODUCT_STATUS_CONFIG[product.status] ?? { label: product.status, variant: "muted" as const };
  const mainImage = product.images?.[0];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product details</DialogTitle>
          <DialogDescription>{product.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Image and ID at top, centered */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-40 w-40 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
              {mainImage ? (
                <img src={mainImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">No image</div>
              )}
            </div>
            {product.productId && (
              <div className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground">
                <Hash className="h-4 w-4" />
                <span>{product.productId}</span>
              </div>
            )}
          </div>

          {/* Name – Slug – then rest with icons */}
          <div className="space-y-3 border-t border-border pt-4">
            <DetailRow icon={Tag} label="Name" value={product.name} />
            <DetailRow icon={Link2} label="Slug" value={product.slug} mono />
            <DetailRow icon={FileText} label="Description" value={product.description || "—"} className="text-left whitespace-pre-wrap text-sm" />
            <DetailRow icon={DollarSign} label="Price" value={formatCurrency(product.price / 100)} />
            <DetailRow
              icon={Package}
              label="Status"
              value={<Badge variant={statusConfig.variant} className="rounded-full">{statusConfig.label}</Badge>}
            />
            <DetailRow icon={Package} label="Stock" value={String(product.stock)} />
            <DetailRow icon={Barcode} label="SKU" value={product.sku || "—"} mono />
            <DetailRow icon={FolderOpen} label="Category" value={categoryNames.length ? categoryNames.join(", ") : "—"} />
            <DetailRow icon={Calendar} label="Created" value={new Date(product.createdAt).toLocaleString("en-US")} className="text-muted-foreground text-sm" />
            <DetailRow icon={Calendar} label="Updated" value={new Date(product.updatedAt).toLocaleString("en-US")} className="text-muted-foreground text-sm" />
          </div>

          {/* Additional images if any */}
          {product.images && product.images.length > 1 && (
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">More images</p>
              <div className="flex flex-wrap justify-center gap-2">
                {product.images.slice(1).map((url, i) => (
                  <div key={i} className="h-16 w-16 overflow-hidden rounded-md border border-border">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-0 py-1.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="min-w-0 text-right">
        {typeof value === "string" ? (
          <p className={cn(mono && "font-mono text-sm", className)}>{value}</p>
        ) : (
          <div className={cn("flex justify-end", className)}>{value}</div>
        )}
      </div>
    </div>
  );
}

const BULK_IMPORT_CSV_TEMPLATE = `name,slug,description,price,status,stock,category,images
"Sample Product",sample-product,"Short description",29.99,new,100,electronics,https://example.com/image.jpg
"Another Item",another-item,"Another description",15.00,available,50,,`;

function downloadTemplate() {
  const blob = new Blob([BULK_IMPORT_CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    header.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function BulkImportDialog({
  open,
  onOpenChange,
  categories,
  sessionToken,
  bulkCreate,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryDoc[];
  sessionToken?: string;
  bulkCreate: (args: any) => Promise<Id<"products">[]>;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ name: string; slug: string; status: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const rows = parseCSV(text);
      const mapped = rows.slice(0, 50).map((r) => ({
        name: r.name ?? r.title ?? "",
        slug: (r.slug ?? slugify(r.name ?? r.title ?? "item")).slice(0, 80),
        status: (r.status ?? "new").toLowerCase().replace(/\s+/g, "_"),
      }));
      setPreview(mapped);
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const slugToId = (slug: string) => categories.find((c) => c.slug === slug)?._id;
      const products = rows
        .filter((r) => (r.name ?? r.title ?? "").trim())
        .map((r) => {
          const name = (r.name ?? r.title ?? "").trim();
          const slug = (r.slug ?? slugify(name)).trim().slice(0, 80) || slugify(name);
          const price = Math.round(parseFloat(r.price ?? "0") * 100);
          const statusRaw = (r.status ?? "new").toLowerCase().replace(/\s+/g, "_");
          const status = PRODUCT_STATUSES.includes(statusRaw as (typeof PRODUCT_STATUSES)[number])
            ? (statusRaw as (typeof PRODUCT_STATUSES)[number])
            : "new";
          const categorySlugs = (r.category ?? r.categories ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
          const categoryIds = categorySlugs.map((s) => slugToId(s)).filter(Boolean) as string[];
          const images = (r.images ?? r.image ?? "").split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
          return {
            name,
            slug,
            description: (r.description ?? "").trim().slice(0, 5000),
            price: isNaN(price) ? 0 : price,
            status,
            stock: parseInt(r.stock ?? "0", 10) || 0,
            images: images.length ? images : [""],
            categoryIds: categoryIds.length ? categoryIds : undefined,
          };
        });
      if (products.length === 0) {
        toast.error("No valid rows in CSV");
        return;
      }
      await bulkCreate({ sessionToken, products });
      onSuccess();
      setFile(null);
      setPreview([]);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk import products</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: name, slug, description, price, status, stock, category, images. Header row required.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={downloadTemplate}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            Download CSV template
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onFileChange}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            {file ? file.name : "Choose CSV file"}
          </Button>
          {preview.length > 0 && (
            <div className="max-h-48 overflow-auto rounded border border-border p-2 text-sm">
              <p className="mb-2 font-medium">Preview ({preview.length} rows)</p>
              <ul className="space-y-1">
                {preview.slice(0, 10).map((p, i) => (
                  <li key={i} className="flex gap-2 font-mono text-xs">
                    <span className="text-muted-foreground">{p.slug || "—"}</span>
                    <span>{p.name || "—"}</span>
                    <Badge variant="muted" className="rounded-full text-[10px]">{p.status}</Badge>
                  </li>
                ))}
                {preview.length > 10 && <li className="text-muted-foreground">… and {preview.length - 10} more</li>}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const BULK_CATEGORIES_CSV_TEMPLATE = `name,slug,description
"Electronics",electronics,"Tech and gadgets"
"Clothing",clothing,"Apparel"`;

function downloadCategoriesTemplate() {
  const blob = new Blob([BULK_CATEGORIES_CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "categories-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function BulkCategoriesDialog({
  open,
  onOpenChange,
  sessionToken,
  bulkCreate,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionToken?: string;
  bulkCreate: (args: any) => Promise<Id<"categories">[]>;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ name: string; slug: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const rows = parseCSV(text);
      setPreview(rows.slice(0, 50).map((r) => ({
        name: (r.name ?? r.title ?? "").trim(),
        slug: (r.slug ?? slugify(r.name ?? r.title ?? "")).slice(0, 80),
      })));
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const categories = rows
        .filter((r) => (r.name ?? r.title ?? "").trim())
        .map((r) => {
          const name = (r.name ?? r.title ?? "").trim();
          const slug = (r.slug ?? slugify(name)).trim().slice(0, 80) || slugify(name);
          return {
            name,
            slug,
            description: (r.description ?? "").trim().slice(0, 2000) || undefined,
          };
        });
      if (categories.length === 0) {
        toast.error("No valid rows in CSV");
        return;
      }
      await bulkCreate({ sessionToken, categories });
      onSuccess();
      setFile(null);
      setPreview([]);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk add categories</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: name, slug, description. Header row required.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={downloadCategoriesTemplate}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            Download CSV template
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onFileChange}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            {file ? file.name : "Choose CSV file"}
          </Button>
          {preview.length > 0 && (
            <div className="max-h-48 overflow-auto rounded border border-border p-2 text-sm">
              <p className="mb-2 font-medium">Preview ({preview.length} rows)</p>
              <ul className="space-y-1">
                {preview.slice(0, 10).map((p, i) => (
                  <li key={i} className="flex gap-2 font-mono text-xs">
                    <span className="text-muted-foreground">{p.slug || "—"}</span>
                    <span>{p.name || "—"}</span>
                  </li>
                ))}
                {preview.length > 10 && <li className="text-muted-foreground">… and {preview.length - 10} more</li>}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
