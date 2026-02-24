"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import type { Id } from "convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCheck,
  Trash2,
  CircleDot,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminNotificationsPage() {
  const { sessionToken } = useAuth();
  const result = useQuery(
    api.notifications.list,
    sessionToken ? { sessionToken, limit: 100 } : "skip"
  );
  const unreadCount = useQuery(
    api.notifications.unreadCount,
    sessionToken ? { sessionToken } : "skip"
  );

  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const remove = useMutation(api.notifications.remove);
  const removeAll = useMutation(api.notifications.removeAll);

  const isLoading = result === undefined;
  const notifications = result?.items ?? [];
  const hasUnread = (unreadCount ?? 0) > 0;
  const hasAny = notifications.length > 0;

  async function handleMarkRead(notificationId: Id<"notifications">) {
    if (!sessionToken) return;
    try {
      await markRead({ sessionToken, notificationId });
      toast.success("Marked as read");
    } catch {
      toast.error("Failed to mark as read");
    }
  }

  async function handleMarkAllRead() {
    if (!sessionToken) return;
    try {
      await markAllRead({ sessionToken });
      toast.success("All marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  }

  async function handleDelete(notificationId: Id<"notifications">) {
    if (!sessionToken) return;
    try {
      await remove({ sessionToken, notificationId });
      toast.success("Notification deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function handleDeleteAll() {
    if (!sessionToken || !hasAny) return;
    if (!confirm("Delete all notifications? This cannot be undone.")) return;
    try {
      await removeAll({ sessionToken });
      toast.success("All notifications deleted");
    } catch {
      toast.error("Failed to delete all");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Notifications sent to you (e.g. payment confirmations). Mark as read
            or delete to keep the list tidy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={!hasUnread}
            className="gap-1.5"
          >
            <CheckCheck className="size-4" />
            Mark all as read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAll}
            disabled={!hasAny}
            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Delete all
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading…
        </div>
      ) : !hasAny ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
          <Bell className="size-10 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">
            No notifications yet
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            When customers get payment confirmations or other alerts, your copy
            will show here.
          </p>
        </div>
      ) : (
        <ul className="space-y-0 overflow-hidden rounded-xl border border-border bg-card">
          {notifications.map((n) => (
            <li
              key={n._id}
              className={cn(
                "group flex flex-col gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4",
                !n.read && "bg-primary/5 dark:bg-primary/10"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {!n.read && (
                    <span
                      className="inline-flex shrink-0"
                      title="Unread"
                      aria-hidden
                    >
                      <CircleDot className="size-4 text-primary" />
                    </span>
                  )}
                  <Badge variant="muted" className="shrink-0 capitalize">
                    {n.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="mt-1 font-medium text-foreground">{n.title}</p>
                {n.body && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                    {n.body}
                  </p>
                )}
              </div>
              <div className="mt-2 flex shrink-0 items-center gap-1 sm:mt-0">
                {n.link && (
                  <Button variant="ghost" size="icon-sm" asChild>
                    <Link href={n.link}>
                      <ExternalLink className="size-4" aria-label="Open link" />
                    </Link>
                  </Button>
                )}
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleMarkRead(n._id)}
                  >
                    <CheckCheck className="size-4" />
                    Mark read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(n._id)}
                  aria-label="Delete notification"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
