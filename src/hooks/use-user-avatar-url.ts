import { useQuery } from "convex/react";
import { useMemo } from "react";

import { api } from "@convex/_generated/api";
import type { PublicUser } from "@convex/lib/publicUser";

type AvatarUser = Pick<PublicUser, "image" | "profileImageId"> | null;

/** Resolved http(s) URL for avatar: Convex storage first, then legacy `image` URL. */
export function useUserAvatarUrl(user: AvatarUser): string | null {
  const storageUrl = useQuery(
    api.files.getUrl,
    user?.profileImageId ? { storageId: user.profileImageId } : "skip",
  );

  return useMemo(() => {
    if (!user) {
      return null;
    }
    if (storageUrl) {
      return storageUrl;
    }
    const img = user.image?.trim();
    if (img && /^https?:\/\//i.test(img)) {
      return img;
    }
    return null;
  }, [user, storageUrl]);
}
