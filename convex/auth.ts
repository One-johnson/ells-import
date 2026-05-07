import bcrypt from "bcryptjs";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { publicUser } from "./lib/publicUser";
import { allocatePublicCode } from "./lib/publicCode";
import {
  newSessionToken,
  requireAuthed,
  resolveSession,
  SESSION_TTL_MS,
} from "./lib/sessionAuth";

const SALT_ROUNDS = 10;

async function createSessionRecord(ctx: MutationCtx, userId: Id<"users">) {
  const token = newSessionToken();
  const now = Date.now();
  await ctx.db.insert("sessions", {
    token,
    userId,
    expiresAt: now + SESSION_TTL_MS,
    createdAt: now,
  });
  return { token };
}

export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
    profileImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { email, password, name, profileImageId }) => {
    const normalized = email.trim().toLowerCase();
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (existing) {
      throw new Error("Email already registered");
    }
    const anyUser = await ctx.db.query("users").first();
    const role = anyUser === null ? "admin" : "customer";
    const now = Date.now();
    const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
    const publicCode = await allocatePublicCode(ctx, "users");
    const userId = await ctx.db.insert("users", {
      email: normalized,
      passwordHash,
      name,
      role,
      publicCode,
      profileImageId,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    });
    const { token } = await createSessionRecord(ctx, userId);
    const doc = await ctx.db.get(userId);
    if (doc === null) {
      throw new Error("User creation failed");
    }
    return { sessionToken: token, user: publicUser(doc) };
  },
});

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    const normalized = email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (user === null) {
      throw new Error("Invalid email or password");
    }
    if (!bcrypt.compareSync(password, user.passwordHash)) {
      throw new Error("Invalid email or password");
    }
    const now = Date.now();
    await ctx.db.patch(user._id, { lastSeenAt: now, updatedAt: now });
    const { token } = await createSessionRecord(ctx, user._id);
    return { sessionToken: token, user: publicUser({ ...user, lastSeenAt: now, updatedAt: now }) };
  },
});

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const s = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", sessionToken))
      .unique();
    if (s) {
      await ctx.db.delete(s._id);
    }
    return { ok: true as const };
  },
});

export const logoutAll = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }
    return { ok: true as const };
  },
});

export const listSessions = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const a = await requireAuthed(ctx, sessionToken);
    return await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .collect();
  },
});

export const revokeSession = mutation({
  args: {
    sessionToken: v.string(),
    targetSessionId: v.id("sessions"),
  },
  handler: async (ctx, { sessionToken, targetSessionId }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const s = await ctx.db.get(targetSessionId);
    if (s === null || s.userId !== a.userId) {
      throw new Error("Session not found");
    }
    await ctx.db.delete(targetSessionId);
    return { ok: true as const };
  },
});

export const changePassword = mutation({
  args: {
    sessionToken: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { sessionToken, currentPassword, newPassword }) => {
    const a = await requireAuthed(ctx, sessionToken);
    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    if (!bcrypt.compareSync(currentPassword, a.user.passwordHash)) {
      throw new Error("Current password is incorrect");
    }
    const passwordHash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
    await ctx.db.patch(a.userId, {
      passwordHash,
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

export const me = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    const a = await resolveSession(ctx, sessionToken);
    if (a === null) {
      return null;
    }
    return { user: publicUser(a.user), sessionId: a.sessionId };
  },
});
