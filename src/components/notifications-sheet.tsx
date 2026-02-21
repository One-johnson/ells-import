"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useAuth } from "@/components/providers";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NotificationsSheet({ open, onOpenChange }: NotificationsSheetProps) {
  const { sessionToken } = useAuth();
  const list = useQuery(
    api.notifications.list,
    sessionToken ? { sessionToken, limit: 50 } : "skip"
  );
  const markAllReadMutation = useMutation(api.notifications.markAllRead);

  const notifications = list?.items ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleMarkAllRead() {
    if (!sessionToken) return;
    await markAllReadMutation({ sessionToken });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-left">Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="size-4" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="size-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <NotificationItem
                  key={n._id}
                  id={n._id}
                  type={n.type}
                  title={n.title}
                  body={n.body}
                  read={n.read}
                  link={n.link}
                  createdAt={n.createdAt}
                  sessionToken={sessionToken ?? ""}
                  onOpenChange={onOpenChange}
                />
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border p-3">
          <Link
            href="/notifications"
            onClick={() => onOpenChange(false)}
            className="block w-full rounded-lg border border-border bg-muted/50 py-2 text-center text-sm font-medium text-foreground hover:bg-muted"
          >
            View all notifications
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NotificationItem({
  id,
  title,
  body,
  read,
  link,
  createdAt,
  sessionToken,
  onOpenChange,
}: {
  id: Id<"notifications">;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  link?: string;
  createdAt: number;
  sessionToken: string;
  onOpenChange: (open: boolean) => void;
}) {
  const markRead = useMutation(api.notifications.markRead);
  const content = (
    <div className="px-4 py-3 text-left">
      <p className={cn("font-medium text-sm", !read && "text-foreground")}>
        {title}
      </p>
      {body && (
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {body}
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {new Date(createdAt).toLocaleDateString("en-US", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </p>
    </div>
  );

  async function handleClick() {
    if (!read) await markRead({ sessionToken, notificationId: id });
    onOpenChange(false);
  }

  const wrapperClass = cn(
    "block w-full transition-colors hover:bg-muted/50",
    !read && "bg-muted/30"
  );

  if (link) {
    return (
      <li>
        <Link href={link} className={wrapperClass} onClick={handleClick}>
          {content}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button type="button" className={wrapperClass} onClick={handleClick}>
        {content}
      </button>
    </li>
  );
}
