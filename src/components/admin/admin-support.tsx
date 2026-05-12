"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";

import { AdminConfirmDeleteDialog } from "@/components/admin/admin-confirm-delete-dialog";
import { conversationStatusLabel, conversationTypeLabel } from "@/components/admin/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/providers/auth-provider";

const STATUSES: Array<"all" | Doc<"conversations">["status"]> = ["all", "open", "closed"];

export function AdminSupport() {
  const { sessionToken, user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | Doc<"conversations">["status"]>("open");
  const [selectedId, setSelectedId] = useState<Id<"conversations"> | null>(null);
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [convSelection, setConvSelection] = useState<Set<Id<"conversations">>>(() => new Set());
  const [deleteConvPrompt, setDeleteConvPrompt] = useState<
    null | { kind: "single"; conversationId: Id<"conversations"> } | { kind: "bulk" }
  >(null);

  const rows = useQuery(
    api.conversations.adminListWithDetails,
    sessionToken
      ? {
          sessionToken,
          status: statusFilter === "all" ? undefined : statusFilter,
          limit: 200,
        }
      : "skip",
  );

  const messages = useQuery(
    api.messages.listByConversation,
    sessionToken && selectedId
      ? { sessionToken, conversationId: selectedId }
      : "skip",
  );

  const admins = useQuery(
    api.users.list,
    sessionToken ? { sessionToken, role: "admin", limit: 100 } : "skip",
  );

  const postMut = useMutation(api.messages.post);
  const updateConvMut = useMutation(api.conversations.update);
  const removeConvMut = useMutation(api.conversations.remove);
  const bulkRemoveConvMut = useMutation(api.conversations.bulkRemove);

  const selectedRow = useMemo(
    () => rows?.find((r) => r.conversation._id === selectedId),
    [rows, selectedId],
  );

  useEffect(() => {
    if (rows && rows.length > 0 && selectedId === null) {
      setSelectedId(rows[0].conversation._id);
    }
  }, [rows, selectedId]);

  const sendReply = useCallback(async () => {
    if (!sessionToken || !selectedId) {
      return;
    }
    const text = body.trim();
    if (!text) {
      return;
    }
    setErr(null);
    try {
      await postMut({ sessionToken, conversationId: selectedId, body: text });
      setBody("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Send failed.");
    }
  }, [body, postMut, selectedId, sessionToken]);

  const onUpdateConversation = useCallback(
    async (patch: {
      status?: Doc<"conversations">["status"];
      assignedAdminId?: Id<"users">;
      clearAssignedAdmin?: boolean;
    }) => {
      if (!sessionToken || !selectedId) {
        return;
      }
      setErr(null);
      try {
        await updateConvMut({ sessionToken, conversationId: selectedId, ...patch });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Update failed.");
      }
    },
    [selectedId, sessionToken, updateConvMut],
  );

  if (!sessionToken) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Support</h1>
        <p className="text-muted-foreground text-sm">
          Open support and direct threads; reply as your admin account.
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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as typeof statusFilter);
            setSelectedId(null);
            setConvSelection(new Set());
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All statuses" : conversationStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedRow && (
          <div className="text-muted-foreground flex flex-wrap gap-2 text-sm">
            <span>
              {conversationTypeLabel(selectedRow.conversation.type)} ·{" "}
              {conversationStatusLabel(selectedRow.conversation.status)}
            </span>
            <span className="max-w-[200px] truncate" title={selectedRow.customerEmail}>
              {selectedRow.customerName ?? selectedRow.customerEmail}
            </span>
          </div>
        )}
      </div>

      {convSelection.size > 0 && (
        <div className="bg-muted/40 flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">{convSelection.size} thread(s) selected</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setConvSelection(new Set())}>
              Clear selection
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => setDeleteConvPrompt({ kind: "bulk" })}>
              Delete selected threads
            </Button>
          </div>
        </div>
      )}

      {rows === undefined ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No conversations match the filter.</p>
      ) : (
        <div className="grid min-h-[420px] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="border rounded-md">
            <ScrollArea className="h-[420px]">
              <ul className="divide-y p-0">
                {rows.map((r) => {
                  const c = r.conversation;
                  const active = c._id === selectedId;
                  return (
                    <li key={c._id} className="flex">
                      <div
                        className="flex shrink-0 items-start pt-3 pl-2"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={convSelection.has(c._id)}
                          onCheckedChange={(v) => {
                            setConvSelection((prev) => {
                              const n = new Set(prev);
                              if (v) {
                                n.add(c._id);
                              } else {
                                n.delete(c._id);
                              }
                              return n;
                            });
                          }}
                          aria-label={`Select thread ${c.subject}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c._id)}
                        className={
                          active
                            ? "bg-primary/5 hover:bg-primary/8 min-w-0 flex-1 px-3 py-3 text-left text-sm"
                            : "hover:bg-muted/50 min-w-0 flex-1 px-3 py-3 text-left text-sm"
                        }
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">
                            {conversationTypeLabel(c.type)}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {conversationStatusLabel(c.status)}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 font-medium">{c.subject}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {r.customerEmail}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[10px]">
                          {new Date(c.lastMessageAt).toLocaleString()}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </div>

          <div className="flex min-h-0 flex-col border rounded-md">
            {selectedRow && (
              <>
                <div className="bg-muted/30 flex flex-col gap-2 border-b p-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Select
                    value={selectedRow.conversation.status}
                    onValueChange={(v) =>
                      void onUpdateConversation({
                        status: v as Doc<"conversations">["status"],
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-full sm:w-36" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">{conversationStatusLabel("open")}</SelectItem>
                      <SelectItem value="closed">{conversationStatusLabel("closed")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedRow.conversation.assignedAdminId ?? "none"}
                    onValueChange={(v) => {
                      if (v === "none") {
                        void onUpdateConversation({ clearAssignedAdmin: true });
                      } else {
                        void onUpdateConversation({ assignedAdminId: v as Id<"users"> });
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-full min-w-0 sm:max-w-[200px]" size="sm">
                      <SelectValue placeholder="Assign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {admins?.map((a) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.name || a.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/users">Users</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      setDeleteConvPrompt({ kind: "single", conversationId: selectedRow.conversation._id })
                    }
                  >
                    Delete thread
                  </Button>
                </div>
                <ScrollArea className="min-h-[200px] flex-1 p-3">
                  <ul className="space-y-3">
                    {messages === undefined ? (
                      <li className="text-muted-foreground text-sm">Loading messages…</li>
                    ) : messages.length === 0 ? (
                      <li className="text-muted-foreground text-sm">No messages yet.</li>
                    ) : (
                      messages.map((m) => {
                        const mine = m.senderId === user?._id;
                        return (
                          <li
                            key={m._id}
                            className={
                              mine
                                ? "ml-6 rounded-md border bg-card px-3 py-2 text-sm"
                                : "mr-6 rounded-md border bg-muted/40 px-3 py-2 text-sm"
                            }
                          >
                            <p className="text-muted-foreground mb-1 text-[10px]">
                              {mine ? "You" : "Customer"}{" "}
                              · {new Date(m.createdAt).toLocaleString()}
                            </p>
                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </ScrollArea>
                <div className="mt-auto space-y-2 border-t p-3">
                  <Textarea
                    placeholder="Type a reply…"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="min-h-[80px] resize-y"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void sendReply();
                      }
                    }}
                  />
                  <div className="flex justify-end">
                    <Button type="button" onClick={() => void sendReply()} disabled={!body.trim()}>
                      Send
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-[10px]">⌃/⌘ + Enter to send</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <AdminConfirmDeleteDialog
        open={deleteConvPrompt !== null}
        onOpenChange={(o) => !o && setDeleteConvPrompt(null)}
        title={
          deleteConvPrompt?.kind === "bulk"
            ? `Delete ${convSelection.size} support thread(s)?`
            : "Delete this support thread?"
        }
        description={
          deleteConvPrompt?.kind === "bulk"
            ? "This will permanently remove the selected conversations and all of their messages. This cannot be undone."
            : "This will permanently remove this conversation and all of its messages. This cannot be undone."
        }
        onConfirm={async () => {
          if (!sessionToken || !deleteConvPrompt || !rows) {
            return;
          }
          setErr(null);
          try {
            if (deleteConvPrompt.kind === "single") {
              const conversationId = deleteConvPrompt.conversationId;
              await removeConvMut({ sessionToken, conversationId });
              setConvSelection((prev) => {
                const n = new Set(prev);
                n.delete(conversationId);
                return n;
              });
              const nextId =
                rows
                  .map((x) => x.conversation._id)
                  .find((id) => id !== conversationId) ?? null;
              setSelectedId((cur) => (cur === conversationId ? nextId : cur));
            } else {
              const conversationIds = [...convSelection];
              await bulkRemoveConvMut({ sessionToken, conversationIds });
              const idSet = new Set(conversationIds);
              setConvSelection(new Set());
              setSelectedId((cur) => {
                if (cur && idSet.has(cur)) {
                  const next = rows.find((x) => !idSet.has(x.conversation._id))?.conversation._id;
                  return next ?? null;
                }
                return cur;
              });
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
