"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

export function AdminPreorderRounds() {
  const { sessionToken } = useAuth();
  const rounds = useQuery(api.preorderRounds.listAll, sessionToken ? { sessionToken, limit: 60 } : "skip");
  const closeMut = useMutation(api.preorderRounds.closeRoundManual);
  const bootstrapMut = useMutation(api.preorderRounds.bootstrapCurrentMonth);
  const createMut = useMutation(api.preorderRounds.createForMonth);
  const [monthKey, setMonthKey] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const onClose = useCallback(
    async (id: Doc<"preorderRounds">["_id"]) => {
      if (!sessionToken) {
        return;
      }
      setBusy(id);
      try {
        await closeMut({ sessionToken, roundId: id });
        toast.success("Round closed");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      } finally {
        setBusy(null);
      }
    },
    [sessionToken, closeMut],
  );

  const onBootstrap = useCallback(async () => {
    if (!sessionToken) {
      return;
    }
    setBusy("boot");
    try {
      const r = await bootstrapMut({ sessionToken });
      toast.success(r.created ? "Created open round for this month" : "Current month round already exists");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }, [sessionToken, bootstrapMut]);

  const onCreateMonth = useCallback(async () => {
    if (!sessionToken) {
      return;
    }
    const mk = monthKey.trim();
    if (!/^\d{4}-\d{2}$/.test(mk)) {
      toast.error("Use YYYY-MM (e.g. 2026-06)");
      return;
    }
    setBusy("create");
    try {
      await createMut({ sessionToken, monthKey: mk });
      toast.success(`Round ${mk} created`);
      setMonthKey("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }, [sessionToken, createMut, monthKey]);

  if (!sessionToken) {
    return <p className="text-muted-foreground text-sm">Sign in as admin.</p>;
  }

  if (rounds === undefined) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
        <Button type="button" size="sm" onClick={() => void onBootstrap()} disabled={busy !== null}>
          {busy === "boot" ? "…" : "Ensure this month’s round"}
        </Button>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="mk">New month (YYYY-MM)</Label>
            <Input
              id="mk"
              placeholder="2026-06"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              className="h-9 w-36 font-mono text-sm"
            />
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => void onCreateMonth()} disabled={busy !== null}>
            Create round
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Open rounds accept new pre-orders until 23:59:59 UTC on the 28th. The daily job auto-closes due rounds and opens
        the next month. You can close early manually.
      </p>
      <ul className="divide-y rounded-lg border">
        {rounds.map((r) => (
          <li key={r._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
            <div>
              <p className="font-medium">{r.label}</p>
              <p className="text-muted-foreground text-xs">
                {r.monthKey} · {r.status} · closes {new Date(r.closesAt).toLocaleString()}
              </p>
            </div>
            {r.status === "open" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy === r._id}
                onClick={() => void onClose(r._id)}
              >
                Close now
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
