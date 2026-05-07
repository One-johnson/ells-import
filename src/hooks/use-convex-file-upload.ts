"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export function useConvexFileUpload(sessionToken: string | null) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const removeStored = useMutation(api.files.removeStored);

  const upload = useCallback(
    async (file: File): Promise<Id<"_storage">> => {
      if (!sessionToken) {
        throw new Error("Not signed in");
      }
      const postUrl = await generateUploadUrl({ sessionToken });
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) {
        throw new Error("Upload failed");
      }
      const data = (await res.json()) as { storageId: Id<"_storage"> };
      return data.storageId;
    },
    [sessionToken, generateUploadUrl],
  );

  const remove = useCallback(
    async (storageId: Id<"_storage">) => {
      if (!sessionToken) {
        return;
      }
      await removeStored({ sessionToken, storageId });
    },
    [sessionToken, removeStored],
  );

  return { upload, remove };
}
