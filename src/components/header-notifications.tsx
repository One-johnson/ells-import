"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

type HeaderNotificationsProps = {
  sessionToken: string;
};

function formatTime(createdAt: number) {
  const d = new Date(createdAt);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function HeaderNotifications({ sessionToken }: HeaderNotificationsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const list = useQuery(api.notifications.listMine, {
    sessionToken,
    limit: 20,
  });
  const unread = useQuery(api.notifications.listMine, {
    sessionToken,
    unreadOnly: true,
    limit: 100,
  });
  const markReadMut = useMutation(api.notifications.markRead);
  const bulkMarkReadMut = useMutation(api.notifications.bulkMarkRead);
  const removeMut = useMutation(api.notifications.remove);
  const bulkRemoveMut = useMutation(api.notifications.bulkRemove);

  const unreadCount = unread?.length ?? 0;
  const hasUnread = unreadCount > 0;
  const loading = list === undefined;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const onOpenNotification = async (n: NonNullable<typeof list>[number]) => {
    if (!n.read) {
      try {
        await markReadMut({ sessionToken, notificationId: n._id });
      } catch {
        return;
      }
    }
    setOpen(false);
    if (n.dataJson) {
      try {
        const data = JSON.parse(n.dataJson) as { orderId?: string };
        if (data.orderId) {
          router.push(`/account?order=${data.orderId}`);
          return;
        }
      } catch {
        // ignore
      }
    }
    if (n.type === "order") {
      router.push("/account#orders");
    }
  };

  const markAllRead = async () => {
    if (!unread?.length) {
      return;
    }
    setMarking(true);
    try {
      await bulkMarkReadMut({
        sessionToken,
        notificationIds: unread.map((n) => n._id),
      });
    } finally {
      setMarking(false);
    }
  };

  const deleteOne = async (notificationId: Id<"notifications">) => {
    setDeletingId(notificationId);
    try {
      await removeMut({ sessionToken, notificationId });
    } finally {
      setDeletingId(null);
    }
  };

  const deleteAll = async () => {
    if (!list?.length) {
      return;
    }
    setDeletingAll(true);
    try {
      await bulkRemoveMut({
        sessionToken,
        notificationIds: list.map((n) => n._id),
      });
    } finally {
      setDeletingAll(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      direction="right"
      shouldScaleBackground={false}
      modal={false}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground border-border relative shrink-0 rounded-full border"
        aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"}
        onClick={() => setOpen(true)}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] font-semibold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
      <DrawerContent className="flex h-full w-full max-w-md flex-col gap-0 overflow-hidden p-0 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <DrawerHeader className="border-border shrink-0 border-b px-4 py-4 text-left">
          <DrawerTitle>Notifications</DrawerTitle>
          <DrawerDescription>Recent activity and updates for your account.</DrawerDescription>
        </DrawerHeader>
        <div className="border-border flex shrink-0 items-center justify-end gap-2 border-b px-4 py-2">
          {hasUnread && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-green-600 hover:bg-green-500/10 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-500/15 dark:hover:text-green-300"
              disabled={marking}
              onClick={() => void markAllRead()}
            >
              {marking ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
              Mark all read
            </Button>
          )}
          {(list?.length ?? 0) > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:text-destructive h-7 gap-1 text-xs"
              disabled={deletingAll}
              onClick={() => void deleteAll()}
            >
              {deletingAll ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Delete all
            </Button>
          )}
        </div>
        {loading ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center py-8 text-sm">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (list?.length ?? 0) === 0 ? (
          <p className="text-muted-foreground flex flex-1 items-center justify-center py-8 text-center text-sm">
            No notifications yet.
          </p>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <ul className="p-2">
              {list!.map((n) => (
                <li key={n._id} className="mb-1 last:mb-0">
                  <div
                    className={cn(
                      "flex items-start gap-2 rounded-md border px-2 py-2",
                      !n.read && "bg-muted/50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void onOpenNotification(n)}
                      className="hover:bg-accent/70 flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-sm px-1 py-1 text-left text-sm transition-colors"
                    >
                      <span className="w-full min-w-0">
                        <span className="font-medium leading-tight break-words">{n.title}</span>
                      </span>
                      {n.body ? <span className="text-muted-foreground line-clamp-2 text-xs">{n.body}</span> : null}
                      <span className="text-muted-foreground text-[10px]">{formatTime(n.createdAt)}</span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:text-destructive size-7 shrink-0"
                      aria-label="Delete notification"
                      disabled={deletingId === n._id}
                      onClick={() => void deleteOne(n._id)}
                    >
                      {deletingId === n._id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
        <DrawerFooter className="border-border border-t">
          <Button variant="outline" asChild>
            <Link href="/account#notifications" onClick={() => setOpen(false)}>
              View account
            </Link>
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
