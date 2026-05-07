import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/** Resolve a display URL for a user's profile picture (storage or external http(s) `image`). */
export async function userAvatarUrl(ctx: QueryCtx, u: Doc<"users">): Promise<string | null> {
  if (u.profileImageId) {
    return (await ctx.storage.getUrl(u.profileImageId)) ?? null;
  }
  const img = u.image?.trim();
  if (img && /^https?:\/\//i.test(img)) {
    return img;
  }
  return null;
}
