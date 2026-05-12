"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { AdminConfirmDeleteDialog } from "@/components/admin/admin-confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminHeroSlidesHint } from "@/components/admin/admin-hero-slides-hint";
import { useAuth } from "@/providers/auth-provider";
import { STORE_SETTING } from "@/lib/store-settings-keys";

export function AdminAppSettings() {
  const { sessionToken } = useAuth();
  const rows = useQuery(api.settings.listApp, sessionToken ? { sessionToken } : "skip");
  const setMut = useMutation(api.settings.setApp);
  const updateMut = useMutation(api.settings.updateApp);
  const removeMut = useMutation(api.settings.removeApp);
  const bulkRemoveAppMut = useMutation(api.settings.bulkRemoveApp);

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<Id<"appSettings"> | null>(null);
  const [editValue, setEditValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [deletePrompt, setDeletePrompt] = useState<
    null | { kind: "single"; id: Id<"appSettings"> } | { kind: "bulk" }
  >(null);

  const sorted = useMemo(() => {
    if (!rows) {
      return [];
    }
    return [...rows].sort((a, b) => a.key.localeCompare(b.key));
  }, [rows]);

  const onAdd = useCallback(async () => {
    if (!sessionToken) {
      return;
    }
    const key = newKey.trim();
    if (!key) {
      return;
    }
    setErr(null);
    try {
      await setMut({ sessionToken, key, value: newValue });
      setNewKey("");
      setNewValue("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    }
  }, [newKey, newValue, sessionToken, setMut]);

  const startEdit = (id: Id<"appSettings">, value: string) => {
    setEditingId(id);
    setEditValue(value);
  };

  const onSaveEdit = useCallback(
    async (id: Id<"appSettings">) => {
      if (!sessionToken) {
        return;
      }
      setErr(null);
      try {
        await updateMut({ sessionToken, settingId: id, value: editValue });
        setEditingId(null);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Update failed.");
      }
    },
    [editValue, sessionToken, updateMut],
  );

  const requestRemoveSetting = useCallback((id: Id<"appSettings">) => {
    setDeletePrompt({ kind: "single", id });
  }, []);

  const selectedSettingIds = useMemo((): Id<"appSettings">[] => {
    return (Object.keys(rowSelection) as Id<"appSettings">[]).filter((k) => rowSelection[k]);
  }, [rowSelection]);

  const toggleSelectAll = useCallback(() => {
    if (!sorted.length) {
      return;
    }
    const allSelected = sorted.every((s) => rowSelection[s._id as string]);
    if (allSelected) {
      setRowSelection({});
    } else {
      const next: Record<string, boolean> = {};
      for (const s of sorted) {
        next[s._id as string] = true;
      }
      setRowSelection(next);
    }
  }, [sorted, rowSelection]);

  if (!sessionToken) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Store settings</h1>
        <p className="text-muted-foreground text-sm">
          Key–value app configuration. The storefront reads these keys when present.
        </p>
      </div>

      <AdminHeroSlidesHint />

      <div className="bg-muted/30 rounded-md border px-4 py-3 text-sm">
        <p className="font-medium">Storefront (wired)</p>
        <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 font-mono text-xs sm:text-sm">
          <li>
            <code>{STORE_SETTING.storeName}</code> — site title in header and footer
          </li>
          <li>
            <code>{STORE_SETTING.storeTagline}</code> — home “Shop” section blurb
          </li>
          <li>
            <code>{STORE_SETTING.supportEmail}</code> — footer contact link
          </li>
          <li>
            <code>{STORE_SETTING.announcementText}</code> — dismissible bar under the safe area (× stores
            this version in the browser)
          </li>
          <li>
            <code>{STORE_SETTING.heroSlidesJson}</code> — home hero (JSON); see editor above. Active products with images
            are appended automatically (see hero hint).
          </li>
          <li>
            <code>{STORE_SETTING.heroCategorySlug}</code> — optional category slug to limit which products appear in the
            hero after manual slides
          </li>
          <li>
            <code>{STORE_SETTING.whatsappNumber}</code> — WhatsApp handoff (digits with country code; used for Pay on
            WhatsApp)
          </li>
          <li>
            <code>{STORE_SETTING.paymentInstructions}</code> — MoMo / bank instructions shown on checkout
          </li>
          <li>
            <code>{STORE_SETTING.checkoutPaymentChannel}</code> — <span className="font-mono">whatsapp</span> (default)
            or <span className="font-mono">paystack</span> once implemented
          </li>
          <li>
            <code>{STORE_SETTING.deliveryFeeCents}</code> — flat delivery in minor units (e.g. pesewas), added at
            checkout
          </li>
        </ul>
      </div>

      {err && (
        <div
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          {err}
        </div>
      )}

      {selectedSettingIds.length > 0 && (
        <div className="bg-muted/40 flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">{selectedSettingIds.length} selected</span>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => setDeletePrompt({ kind: "bulk" })}
          >
            Delete selected
          </Button>
        </div>
      )}

      <div className="bg-muted/30 flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <label className="text-xs font-medium">Key</label>
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="e.g. support_email"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1 sm:min-w-[200px]">
          <label className="text-xs font-medium">Value</label>
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Value"
          />
        </div>
        <Button type="button" onClick={() => void onAdd()}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {rows === undefined ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm">No app settings yet.</p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      sorted.length > 0 && sorted.every((s) => rowSelection[s._id as string])
                    }
                    onCheckedChange={() => toggleSelectAll()}
                    aria-label="Select all settings"
                  />
                </TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="w-[1%]">Updated</TableHead>
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="w-10">
                    <Checkbox
                      checked={!!rowSelection[s._id as string]}
                      onCheckedChange={(v) =>
                        setRowSelection((prev) => ({
                          ...prev,
                          [s._id as string]: !!v,
                        }))
                      }
                      aria-label={`Select ${s.key}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{s.key}</TableCell>
                  <TableCell>
                    {editingId === s._id ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8"
                      />
                    ) : (
                      <span className="max-w-md truncate" title={s.value}>
                        {s.value}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                    {new Date(s.updatedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {editingId === s._id ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => void onSaveEdit(s._id)}
                        >
                          Save
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => startEdit(s._id, s.value)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive size-8"
                        onClick={() => requestRemoveSetting(s._id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AdminConfirmDeleteDialog
        open={deletePrompt !== null}
        onOpenChange={(o) => !o && setDeletePrompt(null)}
        title={
          deletePrompt?.kind === "bulk"
            ? `Delete ${selectedSettingIds.length} settings?`
            : "Delete this setting?"
        }
        description={
          deletePrompt?.kind === "bulk"
            ? `This will permanently remove ${selectedSettingIds.length} key–value rows. The storefront may fall back to defaults where keys disappear. This cannot be undone.`
            : "This will permanently remove this key–value row. This cannot be undone."
        }
        onConfirm={async () => {
          if (!sessionToken || !deletePrompt) {
            return;
          }
          setErr(null);
          try {
            if (deletePrompt.kind === "single") {
              const id = deletePrompt.id;
              await removeMut({ sessionToken, settingId: id });
              if (editingId === id) {
                setEditingId(null);
              }
              setRowSelection((prev) => {
                const p = { ...prev };
                delete p[id as string];
                return p;
              });
            } else {
              await bulkRemoveAppMut({ sessionToken, settingIds: selectedSettingIds });
              setRowSelection({});
              setEditingId((e) => (e && selectedSettingIds.includes(e) ? null : e));
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
