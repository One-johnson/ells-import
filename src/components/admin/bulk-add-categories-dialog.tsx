"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Plus, Trash2, Upload, X } from "lucide-react";

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
import { slugify } from "@/lib/slug";
import { useConvexFileUpload } from "@/hooks/use-convex-file-upload";
import { StorageImagePreview } from "./storage-image-preview";

type CategoryLite = { _id: Id<"categories">; name: string };

type Row = {
  key: string;
  name: string;
  slug: string;
  parentId: string;
  sort: string;
  imageId: Id<"_storage"> | null;
};

function newRow(): Row {
  return {
    key: globalThis.crypto?.randomUUID?.() ?? String(Math.random()),
    name: "",
    slug: "",
    parentId: "__root__",
    sort: "0",
    imageId: null,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionToken: string;
  categories: CategoryLite[] | undefined;
  onSuccess?: () => void;
};

export function BulkAddCategoriesDialog({
  open,
  onOpenChange,
  sessionToken,
  categories,
  onSuccess,
}: Props) {
  const { upload, remove: removeStored } = useConvexFileUpload(sessionToken);
  const bulkCreate = useMutation(api.categories.bulkCreate);
  const sessionUploads = useRef<Set<Id<"_storage">>>(new Set());

  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reset = useCallback(() => {
    for (const id of sessionUploads.current) {
      void removeStored(id);
    }
    sessionUploads.current = new Set();
    setRows([newRow()]);
    setErr(null);
  }, [removeStored]);

  const onDialogChange = (next: boolean) => {
    if (!next) {
      reset();
    }
    onOpenChange(next);
  };

  const addRow = () => setRows((r) => [...r, newRow()]);

  const removeRow = (key: string) => {
    setRows((r) => {
      const row = r.find((x) => x.key === key);
      if (row?.imageId && sessionUploads.current.has(row.imageId)) {
        sessionUploads.current.delete(row.imageId);
        void removeStored(row.imageId);
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
      setRows((rows) => {
        const cur = rows.find((x) => x.key === key);
        if (cur?.imageId && sessionUploads.current.has(cur.imageId)) {
          sessionUploads.current.delete(cur.imageId);
          void removeStored(cur.imageId);
        }
        return rows;
      });
      const id = await upload(file);
      sessionUploads.current.add(id);
      setRows((rows) => rows.map((r) => (r.key === key ? { ...r, imageId: id } : r)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingKey(null);
    }
  };

  const clearImage = (rowKey: string) => {
    setRows((rows) => {
      const r = rows.find((x) => x.key === rowKey);
      if (r?.imageId) {
        if (sessionUploads.current.has(r.imageId)) {
          sessionUploads.current.delete(r.imageId);
          void removeStored(r.imageId);
        }
      }
      return rows.map((x) => (x.key === rowKey ? { ...x, imageId: null } : x));
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const out: {
      name: string;
      slug: string;
      description?: string;
      imageId?: Id<"_storage">;
      parentId?: Id<"categories">;
      sortOrder: number;
    }[] = [];

    for (const r of rows) {
      if (!r.name.trim()) {
        setErr("Each row must have a name, or remove empty rows.");
        return;
      }
      const sort = Number.parseInt(r.sort, 10);
      if (Number.isNaN(sort)) {
        setErr(`Invalid sort for “${r.name}”.`);
        return;
      }
      const slug = (r.slug.trim() && slugify(r.slug.trim())) || slugify(r.name.trim());
      if (!slug) {
        setErr(`Invalid slug for “${r.name}”.`);
        return;
      }
      out.push({
        name: r.name.trim(),
        slug,
        parentId:
          r.parentId === "__root__" ? undefined : (r.parentId as Id<"categories">),
        sortOrder: sort,
        imageId: r.imageId ?? undefined,
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
      <DrawerContent className="flex h-full max-h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DrawerHeader className="border-border shrink-0 space-y-1 border-b px-4 py-4 text-left">
          <DrawerTitle>Bulk add categories</DrawerTitle>
          <DrawerDescription>
            Add many categories at once. One image per row (upload). Slugs must be unique
            project-wide.
          </DrawerDescription>
        </DrawerHeader>
        <form
          id="bulk-cat-form"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
          onSubmit={(e) => void onSubmit(e)}
        >
          {err && (
            <p className="text-destructive text-sm" role="alert">
              {err}
            </p>
          )}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Image</TableHead>
                  <TableHead>Name *</TableHead>
                  <TableHead className="hidden w-32 md:table-cell">Slug</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead className="w-20">Order</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {r.imageId ? (
                          <div className="relative">
                            <StorageImagePreview storageId={r.imageId} className="size-10" />
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="ring-background absolute -right-1 -top-1 size-5 rounded-full p-0 ring-1"
                              onClick={() => clearImage(r.key)}
                            >
                              <X className="size-2.5" />
                            </Button>
                          </div>
                        ) : (
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
                              {uploadingKey === r.key ? "…" : <Upload className="size-3.5" />}
                            </span>
                          </label>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={r.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((rows) =>
                            rows.map((x) => (x.key === r.key ? { ...x, name: v } : x)),
                          );
                        }}
                        placeholder="Name"
                        required
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
                      <Select
                        value={r.parentId}
                        onValueChange={(v) => {
                          setRows((rows) =>
                            rows.map((x) => (x.key === r.key ? { ...x, parentId: v } : x)),
                          );
                        }}
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__root__">Top level</SelectItem>
                          {categories?.map((c) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        inputMode="numeric"
                        className="h-8 w-14 tabular-nums"
                        value={r.sort}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((rows) =>
                            rows.map((x) => (x.key === r.key ? { ...x, sort: v } : x)),
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => removeRow(r.key)}
                        disabled={rows.length <= 1}
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
        <DrawerFooter className="shrink-0">
          <Button type="button" variant="outline" onClick={() => onDialogChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="bulk-cat-form" disabled={saving}>
            {saving ? "Creating…" : "Create all"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
