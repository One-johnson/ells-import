"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonTable } from "@/components/skeletons";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { sessionToken } = useAuth();
  const list = useQuery(
    api.notifications.list,
    sessionToken ? { sessionToken, limit: 50 } : "skip"
  );
  const markAllRead = useMutation(api.notifications.markAllRead);
  const markRead = useMutation(api.notifications.markRead);

  const notifications = list?.items ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const isLoading = list === undefined;

  if (!sessionToken) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to view your notifications.
        </p>
        <Link
          href="/sign-in?redirect=/notifications"
          className="mt-4 inline-block text-sm font-medium text-[#5c4033] hover:underline dark:text-[#c9a227]"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "You're all caught up."}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 w-fit"
            onClick={() => markAllRead({ sessionToken })}
          >
            <CheckCheck className="size-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="mt-8">
        {isLoading ? (
          <SkeletonTable rows={6} cols={2} showHeader={false} />
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
            <Bell className="size-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No notifications yet.</p>
            <Link
              href="/"
              className="mt-4 text-sm font-medium text-[#5c4033] hover:underline dark:text-[#c9a227]"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
            {notifications.map((n) => (
              <li key={n._id}>
                {n.link ? (
                  <Link
                    href={n.link}
                    className={cn(
                      "block px-4 py-4 text-left transition-colors hover:bg-muted/50",
                      !n.read && "bg-muted/20"
                    )}
                    onClick={() =>
                      !n.read && markRead({ sessionToken, notificationId: n._id })
                    }
                  >
                    <NotificationContent n={n} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={cn(
                      "block w-full px-4 py-4 text-left transition-colors hover:bg-muted/50",
                      !n.read && "bg-muted/20"
                    )}
                    onClick={() =>
                      !n.read && markRead({ sessionToken, notificationId: n._id })
                    }
                  >
                    <NotificationContent n={n} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NotificationContent({
  n,
}: {
  n: { type: string; title: string; body?: string; read: boolean; createdAt: number };
}) {
  return (
    <>
      <p className={cn("font-medium text-sm", !n.read && "text-foreground")}>
        {n.title}
      </p>
      {n.body && (
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
          {n.body}
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground capitalize">
        {n.type} ·{" "}
        {new Date(n.createdAt).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>
    </>
  );
}
