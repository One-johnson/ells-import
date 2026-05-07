import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { STORE_SETTING } from "@/lib/store-settings-keys";
import { useAuth } from "@/providers/auth-provider";

const EXAMPLE = `[
  {
    "title": "New season imports",
    "subtitle": "Hand-picked products with fast fulfillment.",
    "imageUrl": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop",
    "href": "/shop",
    "ctaLabel": "Shop now"
  },
  {
    "title": "Featured collection",
    "subtitle": "Every slide needs an imageUrl so the hero keeps a consistent height.",
    "imageUrl": "https://images.unsplash.com/photo-1555529733-0e670560f7e1?w=1600&auto=format&fit=crop",
    "href": "/shop",
    "ctaLabel": "Browse"
  }
]`;

export function AdminHeroSlidesHint() {
  const { sessionToken } = useAuth();
  const rows = useQuery(api.settings.listApp, sessionToken ? { sessionToken } : "skip");
  const setMut = useMutation(api.settings.setApp);
  const removeMut = useMutation(api.settings.removeApp);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rowId, setRowId] = useState<Id<"appSettings"> | null>(null);

  useEffect(() => {
    if (!rows) {
      return;
    }
    const row = rows.find((r) => r.key === STORE_SETTING.heroSlidesJson);
    setRowId(row?._id ?? null);
    setValue(row?.value ?? "");
  }, [rows]);

  const onSave = useCallback(async () => {
    if (!sessionToken) {
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      if (value.trim() === "") {
        if (rowId) {
          await removeMut({ sessionToken, settingId: rowId });
        }
        return;
      }
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array of slide objects.");
      }
      await setMut({ sessionToken, key: STORE_SETTING.heroSlidesJson, value: value.trim() });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid JSON or save failed.");
    } finally {
      setSaving(false);
    }
  }, [value, sessionToken, setMut, removeMut, rowId]);

  if (!sessionToken) {
    return null;
  }

  return (
    <div className="bg-card rounded-md border p-4">
      <h2 className="text-foreground text-sm font-semibold">Home hero carousel</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Optional. Set <code className="font-mono text-xs">{STORE_SETTING.heroSlidesJson}</code> to a
        JSON array of <strong>image</strong> slides. Each object should include{" "}
        <code className="font-mono text-xs">imageUrl</code> (gradient-only slides are ignored). Leave empty
        to rely on auto-filled product slides only. Images: <code className="font-mono text-xs">https://</code>{" "}
        URLs, or a path like <code className="font-mono text-xs">/hero.jpg</code> (files in{" "}
        <code className="font-mono text-xs">public/</code>). Optional <code className="font-mono text-xs">href</code> +{" "}
        <code className="font-mono text-xs">ctaLabel</code> for a button. After your slides, the storefront appends{" "}
        <strong>newest active products that have an image</strong> until the carousel reaches eight slides total. Add
        app setting <code className="font-mono text-xs">hero_category_slug</code> (a category{" "}
        <code className="font-mono text-xs">slug</code>) to only pull products from that category; omit it to use all
        active products.
      </p>
      {err && (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {err}
        </p>
      )}
      <Textarea
        className="mt-3 min-h-[180px] font-mono text-xs"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="[ ]"
        spellCheck={false}
        aria-label="Hero slides JSON"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => void onSave()} disabled={saving || rows === undefined}>
          {saving ? "Saving…" : "Save hero slides"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setValue(EXAMPLE);
            setErr(null);
          }}
        >
          Load example
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setValue("");
            setErr(null);
          }}
        >
          Clear (product slides only)
        </Button>
      </div>
    </div>
  );
}
