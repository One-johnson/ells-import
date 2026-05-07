import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type Authed = {
  userId: Id<"users">;
  user: Doc<"users">;
  sessionId: Id<"sessions">;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function resolveSession(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string | undefined,
): Promise<Authed | null> {
  if (!sessionToken?.trim()) {
    return null;
  }
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", sessionToken))
    .unique();
  if (session === null) {
    return null;
  }
  if (session.expiresAt < Date.now()) {
    return null;
  }
  const user = await ctx.db.get(session.userId);
  if (user === null) {
    return null;
  }
  return { userId: user._id, user, sessionId: session._id };
}

export async function requireAuthed(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string | undefined,
): Promise<Authed> {
  const a = await resolveSession(ctx, sessionToken);
  if (a === null) {
    throw new Error("Not authenticated");
  }
  return a;
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string | undefined,
): Promise<Authed> {
  const a = await requireAuthed(ctx, sessionToken);
  if (a.user.role !== "admin") {
    throw new Error("Admin only");
  }
  return a;
}
