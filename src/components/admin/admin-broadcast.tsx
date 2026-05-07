"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";

import { notificationTypeLabel } from "@/components/admin/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/providers/auth-provider";

const ROLES: Doc<"users">["role"][] = ["customer", "admin"];
const TYPES: Doc<"notifications">["type"][] = [
  "system",
  "promo",
  "order",
  "message",
  "other",
];

export function AdminBroadcast() {
  const { sessionToken } = useAuth();
  const broadcastMut = useMutation(api.notifications.broadcastToRole);

  const [targetRole, setTargetRole] = useState<Doc<"users">["role"]>("customer");
  const [type, setType] = useState<Doc<"notifications">["type"]>("system");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dataJson, setDataJson] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = useCallback(async () => {
    if (!sessionToken) {
      return;
    }
    const t = title.trim();
    if (!t) {
      setErr("Title is required.");
      return;
    }
    let parsedData: string | undefined;
    if (dataJson.trim()) {
      try {
        JSON.parse(dataJson);
        parsedData = dataJson.trim();
      } catch {
        setErr("Data JSON must be valid JSON.");
        return;
      }
    }
    setErr(null);
    setLastResult(null);
    setPending(true);
    try {
      const res = await broadcastMut({
        sessionToken,
        targetRole,
        type,
        title: t,
        body: body.trim() || undefined,
        dataJson: parsedData,
      });
      if (res.isComplete) {
        setLastResult(
          res.firstBatch === 0
            ? "No users with that role."
            : `Delivered to ${res.firstBatch} user(s) (all in one batch).`,
        );
      } else {
        setLastResult(
          `First batch: ${res.firstBatch} user(s) notified. More recipients are being processed in the background; wait a few seconds if the audience is very large.`,
        );
      }
      setBody("");
      setDataJson("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Broadcast failed.");
    } finally {
      setPending(false);
    }
  }, [body, broadcastMut, dataJson, sessionToken, targetRole, title, type]);

  if (!sessionToken) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Broadcast</h1>
        <p className="text-muted-foreground text-sm">
          Create an in-app notification for every account with the selected role. Large audiences are sent in the background in batches to stay within server limits.
        </p>
      </div>

      {err && (
        <div
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          {err}
        </div>
      )}

      {lastResult && (
        <div className="bg-muted/40 rounded-md border px-3 py-2 text-sm">{lastResult}</div>
      )}

      <div className="max-w-lg space-y-4">
        <div className="space-y-2">
          <Label>Audience</Label>
          <Select
            value={targetRole}
            onValueChange={(v) => setTargetRole(v as Doc<"users">["role"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r === "admin" ? "All admins" : "All customers"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as Doc<"notifications">["type"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((x) => (
                <SelectItem key={x} value={x}>
                  {notificationTypeLabel(x)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bc-title">Title</Label>
          <Input
            id="bc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short headline"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bc-body">Body (optional)</Label>
          <Textarea
            id="bc-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[100px] resize-y"
            placeholder="Longer message shown in the notification panel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bc-json">Data JSON (optional)</Label>
          <Textarea
            id="bc-json"
            value={dataJson}
            onChange={(e) => setDataJson(e.target.value)}
            className="font-mono min-h-[72px] resize-y text-sm"
            placeholder='{"key":"value"}'
          />
        </div>

        <Button type="button" onClick={() => void onSubmit()} disabled={pending || !title.trim()}>
          {pending ? "Sending…" : "Send broadcast"}
        </Button>
      </div>
    </div>
  );
}
