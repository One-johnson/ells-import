"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SkeletonTable } from "@/components/skeletons";
import Image from "next/image";
import type { Id } from "convex/_generated/dataModel";

type UserRow = {
  _id: Id<"users">;
  name: string;
  email: string;
  image?: string;
  role: string;
  createdAt: number;
};

const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "image",
    header: "Photo",
    cell: ({ row }) => {
      const u = row.original;
      if (u.image) {
        return (
          <Image
            src={u.image}
            alt=""
            width={36}
            height={36}
            className="size-9 rounded-full object-cover"
          />
        );
      }
      return (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
          {u.name?.charAt(0)?.toUpperCase() ?? "?"}
        </span>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <span className="capitalize">{row.original.role}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("en-US", {
        dateStyle: "medium",
      }),
  },
];

export default function AdminCustomersPage() {
  const { sessionToken } = useAuth();
  const result = useQuery(
    api.users.list,
    sessionToken ? { sessionToken, limit: 100 } : "skip"
  );

  const isLoading = result === undefined;
  const users = result?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-muted-foreground mt-1">
          Manage customer accounts.
        </p>
      </div>
      {isLoading ? (
        <SkeletonTable rows={8} cols={4} />
      ) : (
        <DataTable
          columns={columns}
          data={users.map((u) => ({
            _id: u._id,
            name: u.name,
            email: u.email,
            image: u.image,
            role: u.role,
            createdAt: u.createdAt,
          }))}
          initialSorting={[{ id: "createdAt", desc: true }]}
        />
      )}
    </div>
  );
}
