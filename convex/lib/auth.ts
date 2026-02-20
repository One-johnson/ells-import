import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

/** Context with db (session-based auth; no Convex identity). */
type DbCtx = Pick<QueryCtx, "db">;

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Get current user from session token. Returns null if token missing, invalid, or expired.
 */
export async function getCurrentUser(
  ctx: DbCtx,
  sessionToken: string | null
): Promise<Doc<"users"> | null> {
  if (!sessionToken?.trim()) return null;
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionToken))
    .unique();
  if (!session || session.expiresAt < Date.now()) return null;
  const user = await ctx.db.get(session.userId);
  return user ?? null;
}

/**
 * Require current user; throws if not authenticated.
 */
export async function requireUser(
  ctx: DbCtx,
  sessionToken: string | null
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx, sessionToken);
  if (!user) throw new Error("Unauthorized");
  return user;
}

/**
 * Require admin; throws if not authenticated or not admin.
 */
export async function requireAdmin(
  ctx: DbCtx,
  sessionToken: string | null
): Promise<Doc<"users">> {
  const user = await requireUser(ctx, sessionToken);
  if (user.role !== "admin") throw new Error("Forbidden: admin required");
  return user;
}

export { SESSION_DURATION_MS };
