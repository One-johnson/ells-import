"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  storageId: Id<"_storage">;
  className?: string;
  alt?: string;
};

export function StorageImagePreview({ storageId, className, alt = "" }: Props) {
  const url = useQuery(api.files.getUrl, { storageId });
  if (url === undefined) {
    return <Skeleton className={cn("size-12 shrink-0 rounded-md", className)} />;
  }
  if (url === null) {
    return null;
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("size-12 shrink-0 rounded-md object-cover", className)}
    />
  );
}
