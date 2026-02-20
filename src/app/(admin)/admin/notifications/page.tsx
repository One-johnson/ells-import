"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import { SkeletonTable } from "@/components/skeletons";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import type { Id } from "convex/_generated/dataModel";

type NotificationRow = {
  _id: Id<"notifications">;
  type: string;
  title: string;
  read: boolean;
  createdAt: number;
};

const columns: ColumnDef<NotificationRow>[] = [
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <span className="capitalize">{row.original.type}</span>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "read",
    header: "Read",
    cell: ({ row }) => (row.original.read ? "Yes" : "No"),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("en-US", {
        dateStyle: "short",
      }),
  },
];

export default function AdminNotificationsPage() {
  const { sessionToken } = useAuth();
  const result = useQuery(
    api.notifications.list,
    sessionToken ? { sessionToken, limit: 50 } : "skip"
  );

  const isLoading = result === undefined;
  const notifications = result?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Your notifications. Use Convex mutations to send notifications to customers (admin only).
        </p>
      </div>
      {isLoading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : (
        <DataTable
          columns={columns}
          data={notifications.map((n) => ({
            _id: n._id,
            type: n.type,
            title: n.title,
            read: n.read,
            createdAt: n.createdAt,
          }))}
          initialSorting={[{ id: "createdAt", desc: true }]}
        />
      )}
    </div>
  );
}
