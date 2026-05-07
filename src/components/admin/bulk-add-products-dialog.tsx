"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { DEFAULT_STORE_CURRENCY } from "@/lib/currency";
import { parseMoneyToCents } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { useConvexFileUpload } from "@/hooks/use-convex-file-upload";
import { StorageImagePreview } from "./storage-image-preview";
import { productStatusLabel } from "./labels";
import type { Doc } from "@convex/_generated/dataModel";

type ProductStatus = Doc<"products">["status"];
const STATUSES: ProductStatus[] = ["draft", "active", "archived"];

function newRow() {
  return {
    key: globalThis.crypto?.randomUUID?.() ?? String(Math.random()),
    name: "",
    slug: "",
    description: "",
    cost: "",
    price: "",
    stock: "0",
    sku: "",
    imageIds: [] as Id<"_storage">[],
  };
}

type Row = ReturnType<typeof newRow>;

type CategoryLite = { _id: Id<"categories">; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionToken: string;
  categories: CategoryLite[] | undefined;
  onSuccess?: () => void;
};

export function BulkAddProductsDialog({
  open,
  onOpenChange,
  sessionToken,
  categories,
  onSuccess,
}: Props) {
  const { upload, remove: removeStored } = useConvexFileUpload(sessionToken);
  const bulkCreate = useMutation(api.products.bulkCreate);
  const generateProductCopy = useAction(api.productAi.generateProductDescription);
  const sessionUploads = useRef<Set<Id<"_storage">>>(new Set());

  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [defaultStatus, setDefaultStatus] = useState<ProductStatus>("draft");
  const [defaultCategory, setDefaultCategory] = useState<string>("__none__");
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [aiRowKey, setAiRowKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reset = useCallback(() => {
    for (const id of sessionUploads.current) {
      void removeStored(id);
    }
    sessionUploads.current = new Set();
    setRows([newRow()]);
    setDefaultStatus("draft");
    setDefaultCategory("__none__");
    setErr(null);
  }, [removeStored]);

  const onDialogChange = (next: boolean) => {
    if (!next) {
      reset();
    }
    onOpenChange(next);
  };

  const addRow = () => {
    setRows((r) => [...r, newRow()]);
  };

  const removeRow = (key: string) => {
    setRows((r) => {
      const row = r.find((x) => x.key === key);
      if (row) {
        for (const id of row.imageIds) {
          if (sessionUploads.current.has(id)) {
            sessionUploads.current.delete(id);
            void removeStored(id);
          }
        }
      }
      return r.length <= 1 ? r : r.filter((x) => x.key !== key);
    });
  };

  const pickForRow = async (key: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      setErr("Only image files are allowed.");
      return;
    }
    setErr(null);
    setUploadingKey(key);
    try {
      const id = await upload(file);
      sessionUploads.current.add(id);
      setRows((rows) =>
        rows.map((r) =>
          r.key === key ? { ...r, imageIds: [...r.imageIds, id] } : r,
        ),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingKey(null);
    }
  };

  const removeImage = (rowKey: string, storageId: Id<"_storage">) => {
    if (sessionUploads.current.has(storageId)) {
      sessionUploads.current.delete(storageId);
      void removeStored(storageId);
    }
    setRows((rows) =>
      rows.map((r) =>
        r.key === rowKey
          ? { ...r, imageIds: r.imageIds.filter((i) => i !== storageId) }
          : r,
      ),
    );
  };

  const fillRowWithAi = useCallback(
    async (rowKey: string) => {
      const r = rows.find((x) => x.key === rowKey);
      if (!r) {
        return;
      }
      const priceCents = parseMoneyToCents(r.price || "0");
      if (priceCents === null) {
        const msg = "Enter a valid selling price for this row.";
        setErr(msg);
        toast.error(msg);
        return;
      }
      const hasContext =
        r.name.trim().length > 0 ||
        Boolean(r.sku.trim()) ||
        Boolean(r.imageIds[0]) ||
        defaultCategory !== "__none__";
      if (!hasContext) {
        const msg = "Add an image, name, SKU, or choose a default category.";
        setErr(msg);
        toast.error(msg);
        return;
      }
      setErr(null);
      setAiRowKey(rowKey);
      try {
        const categoryName =
          defaultCategory !== "__none__"
            ? categories?.find((c) => c._id === defaultCategory)?.name
            : undefined;
        const { name, description } = await generateProductCopy({
          sessionToken,
          name: r.name.trim(),
          sku: r.sku.trim() || undefined,
          categoryName,
          priceCents,
          currency: DEFAULT_STORE_CURRENCY,
          existingDescription: r.description.trim() || undefined,
          primaryImageStorageId: r.imageIds[0],
        });
        const nextName = name.trim().slice(0, 200);
        setRows((prev) =>
          prev.map((x) =>
            x.key === rowKey
              ? {
                  ...x,
                  name: nextName,
                  description,
                  slug: x.slug.trim() === "" ? slugify(nextName) : x.slug,
                }
              : x,
          ),
        );
        toast.success("Name & specs filled — review the row.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "AI failed";
        setErr(msg);
        toast.error(msg);
      } finally {
        setAiRowKey(null);
      }
    },
    [rows, defaultCategory, categories, sessionToken, generateProductCopy],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const out: {
      name: string;
      slug: string;
      description?: string;
      sku?: string;
      priceCents: number;
      costPriceCents: number;
      currency: string;
      imageIds?: Id<"_storage">[];
      status: ProductStatus;
      stock: number;
      categoryId?: Id<"categories">;
    }[] = [];

    for (const r of rows) {
      if (!r.name.trim()) {
        setErr("Each row must have a name, or remove empty rows.");
        return;
      }
      const priceCents = parseMoneyToCents(r.price || "0");
      if (priceCents === null) {
        setErr(`Invalid selling price for “${r.name}”.`);
        return;
      }
      const costPriceCents = parseMoneyToCents(r.cost.trim() === "" ? "0" : r.cost);
      if (costPriceCents === null) {
        setErr(`Invalid cost for “${r.name}”.`);
        return;
      }
      const stock = Number.parseInt(r.stock, 10);
      if (Number.isNaN(stock) || stock < 0) {
        setErr(`Invalid stock for “${r.name}”.`);
        return;
      }
      const slug = (r.slug.trim() && slugify(r.slug.trim())) || slugify(r.name.trim());
      if (!slug) {
        setErr(`Invalid slug for “${r.name}”.`);
        return;
      }
      const cat =
        defaultCategory === "__none__" ? undefined : (defaultCategory as Id<"categories">);
      out.push({
        name: r.name.trim(),
        slug,
        description: r.description.trim() || undefined,
        priceCents,
        costPriceCents,
        stock,
        sku: r.sku.trim() || undefined,
        imageIds: r.imageIds.length ? r.imageIds : undefined,
        status: defaultStatus,
        currency: DEFAULT_STORE_CURRENCY,
        categoryId: cat,
      });
    }

    setSaving(true);
    try {
      await bulkCreate({ sessionToken, items: out });
      sessionUploads.current.clear();
      onSuccess?.();
      onOpenChange(false);
      reset();
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Bulk create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onDialogChange}
      direction="right"
      shouldScaleBackground={false}
    >
      <DrawerContent className="flex h-full max-h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DrawerHeader className="border-border shrink-0 space-y-1 border-b px-4 py-4 text-left">
          <DrawerTitle>Bulk add products</DrawerTitle>
          <DrawerDescription>
            Create many products in one request. Per-row image uploads; shared defaults for
            status and category. Use the sparkles button to generate a name and specification
            bullets from the row’s image, prices, SKU, and default category. Amounts are Ghana
            Cedis (GHS). No URL fields.
          </DrawerDescription>
        </DrawerHeader>
        <form
          id="bulk-products-form"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
          onSubmit={(e) => void onSubmit(e)}
        >
          {err && (
            <p className="text-destructive text-sm" role="alert">
              {err}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Default status</Label>
              <Select
                value={defaultStatus}
                onValueChange={(v) => setDefaultStatus(v as ProductStatus)}
              >
                <SelectTrigger>
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
            <div className="grid gap-1.5">
              <Label>Default category</Label>
              <Select value={defaultCategory} onValueChange={setDefaultCategory}>
                <SelectTrigger>
                  <SelectValue />
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
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Images</TableHead>
                  <TableHead>Name * / specs</TableHead>
                  <TableHead className="hidden w-32 md:table-cell">Slug</TableHead>
                  <TableHead className="w-20 min-w-16">Cost</TableHead>
                  <TableHead className="w-20 min-w-16">Selling</TableHead>
                  <TableHead className="w-20">Stock</TableHead>
                  <TableHead className="hidden w-24 sm:table-cell">SKU</TableHead>
                  <TableHead className="w-9 px-1 text-center">
                    <Sparkles className="text-muted-foreground mx-auto size-3.5" aria-hidden />
                    <span className="sr-only">AI generate</span>
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {r.imageIds.map((id) => (
                          <div key={id} className="relative">
                            <StorageImagePreview storageId={id} className="size-10" />
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="ring-background absolute -right-1 -top-1 size-5 rounded-full p-0 ring-1"
                              onClick={() => removeImage(r.key, id)}
                            >
                              <X className="size-2.5" />
                            </Button>
                          </div>
                        ))}
                        <label>
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            disabled={uploadingKey === r.key}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (f) {
                                void pickForRow(r.key, f);
                              }
                            }}
                          />
                          <span className="text-muted-foreground border-input hover:bg-muted inline-flex size-8 cursor-pointer items-center justify-center rounded-md border">
                            {uploadingKey === r.key ? (
                              "…"
                            ) : (
                              <Upload className="size-3.5" />
                            )}
                          </span>
                        </label>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[11rem] align-top">
                      <Input
                        value={r.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((rows) =>
                            rows.map((x) => (x.key === r.key ? { ...x, name: v } : x)),
                          );
                        }}
                        placeholder="Product name"
                        required
                        className="text-sm"
                      />
                      <Textarea
                        className="mt-1 min-h-[3.25rem] text-xs"
                        rows={2}
                        placeholder="Specifications (optional)"
                        value={r.description}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((rows) =>
                            rows.map((x) =>
                              x.key === r.key ? { ...x, description: v } : x,
                            ),
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Input
                        className="font-mono text-xs"
                        value={r.slug}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((rows) =>
                            rows.map((x) => (x.key === r.key ? { ...x, slug: v } : x)),
                          );
                        }}
                        placeholder="auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        inputMode="decimal"
                        className="tabular-nums w-full min-w-0"
                        value={r.cost}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((rows) =>
                            rows.map((x) => (x.key === r.key ? { ...x, cost: v } : x)),
                          );
                        }}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        inputMode="decimal"
                        className="tabular-nums w-full min-w-0"
                        value={r.price}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((rows) =>
                            rows.map((x) => (x.key === r.key ? { ...x, price: v } : x)),
                          );
                        }}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        inputMode="numeric"
                        className="tabular-nums"
                        value={r.stock}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((rows) =>
                            rows.map((x) => (x.key === r.key ? { ...x, stock: v } : x)),
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Input
                        value={r.sku}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((rows) =>
                            rows.map((x) => (x.key === r.key ? { ...x, sku: v } : x)),
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="p-1 align-top">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-8 shrink-0"
                        disabled={aiRowKey !== null || uploadingKey === r.key || saving}
                        aria-label="Generate name and specifications with AI"
                        title="Generate name & specs"
                        onClick={() => void fillRowWithAi(r.key)}
                      >
                        {aiRowKey === r.key ? (
                          <span className="text-muted-foreground text-xs" aria-hidden>
                            …
                          </span>
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="align-top">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => removeRow(r.key)}
                        disabled={rows.length <= 1}
                        aria-label="Remove row"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="size-3.5" />
            Add row
          </Button>
        </form>
        <DrawerFooter className="border-border shrink-0 border-t">
          <Button type="button" variant="outline" onClick={() => onDialogChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="bulk-products-form" disabled={saving}>
            {saving ? "Creating…" : "Create all"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
