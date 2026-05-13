import bcrypt from "bcryptjs";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { allocatePublicCode } from "./lib/publicCode";
import { deleteUserDocuments } from "./lib/deleteUser";
import { publicUser } from "./lib/publicUser";
import { requireAdmin, requireAuthed, resolveSession } from "./lib/sessionAuth";
import { userAvatarUrl } from "./lib/userAvatar";
import { userRole } from "./schema";

const SALT_ROUNDS = 10;

export const get = query({
  args: { userId: v.id("users"), sessionToken: v.optional(v.string()) },
  handler: async (ctx, { userId, sessionToken }) => {
    const u = await ctx.db.get(userId);
    if (u === null) {
      return null;
    }
    const a = await resolveSession(ctx, sessionToken);
    if (a !== null && (a.userId === userId || a.user.role === "admin")) {
      return publicUser(u);
    }
    return {
      _id: u._id,
      name: u.name,
      image: u.image,
      role: u.role,
    };
  },
});

export const list = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
    role: v.optional(v.union(v.literal("admin"), v.literal("customer"))),
  },
  handler: async (ctx, { sessionToken, limit = 200, role }) => {
    await requireAdmin(ctx, sessionToken);
    const rows =
      role !== undefined
        ? await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", role))
            .take(limit)
        : await ctx.db.query("users").take(limit);
    const out: (ReturnType<typeof publicUser> & { avatarUrl: string | null })[] = [];
    for (const u of rows) {
      const avatarUrl = await userAvatarUrl(ctx, u);
      out.push({ ...publicUser(u), avatarUrl });
    }
    return out;
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
    role: userRole,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    const normalized = args.email.trim().toLowerCase();
    const dupe = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (dupe) {
      throw new Error("Email already in use");
    }
    const now = Date.now();
    const passwordHash = bcrypt.hashSync(args.password, SALT_ROUNDS);
    const publicCode = await allocatePublicCode(ctx, "users");
    const id = await ctx.db.insert("users", {
      email: normalized,
      passwordHash,
      name: args.name,
      role: args.role,
      publicCode,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.union(v.string(), v.null())),
    /** Set a new uploaded avatar, clear it with `null`, or omit to leave unchanged. */
    profileImageId: v.optional(v.union(v.id("_storage"), v.null())),
    emailVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionToken, userId, email, name, image, profileImageId, emailVerified }) => {
    const a = await requireAuthed(ctx, sessionToken);
    if (a.userId !== userId && a.user.role !== "admin") {
      throw new Error("Forbidden");
    }
    if (email !== undefined && a.user.role !== "admin") {
      throw new Error("Only admins can change email");
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (email !== undefined) {
      const normalized = email.trim().toLowerCase();
      const dupe = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", normalized))
        .unique();
      if (dupe && dupe._id !== userId) {
        throw new Error("Email already in use");
      }
      patch.email = normalized;
    }
    if (name !== undefined) {
      const t = name.trim();
      patch.name = t.length > 0 ? t : undefined;
    }
    if (image !== undefined) {
      if (image === null) {
        patch.image = undefined;
      } else {
        const t = image.trim();
        patch.image = t.length > 0 ? t : undefined;
      }
    }
    if (profileImageId !== undefined) {
      const row = await ctx.db.get(userId);
      if (profileImageId === null) {
        if (row?.profileImageId) {
          await ctx.storage.delete(row.profileImageId);
        }
        patch.profileImageId = undefined;
      } else {
        if (row?.profileImageId && row.profileImageId !== profileImageId) {
          await ctx.storage.delete(row.profileImageId);
        }
        patch.profileImageId = profileImageId;
        patch.image = undefined;
      }
    }
    if (emailVerified !== undefined && a.user.role === "admin") {
      patch.emailVerified = emailVerified;
    }
    await ctx.db.patch(userId, patch);
  },
});

export const setRole = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    role: userRole,
  },
  handler: async (ctx, { sessionToken, userId, role }) => {
    await requireAdmin(ctx, sessionToken);
    await ctx.db.patch(userId, { role, updatedAt: Date.now() });
  },
});

export const bulkSetRole = mutation({
  args: {
    sessionToken: v.string(),
    userIds: v.array(v.id("users")),
    role: userRole,
  },
  handler: async (ctx, { sessionToken, userIds, role }) => {
    await requireAdmin(ctx, sessionToken);
    const now = Date.now();
    for (const userId of userIds) {
      await ctx.db.patch(userId, { role, updatedAt: now });
    }
    return { updated: userIds.length };
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), userId: v.id("users") },
  handler: async (ctx, { sessionToken, userId }) => {
    await requireAdmin(ctx, sessionToken);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (orders !== null) {
      throw new Error("Cannot delete user with existing orders; archive the account instead");
    }
    await deleteUserDocuments(ctx, userId);
  },
});

export const bulkRemove = mutation({
  args: { sessionToken: v.string(), userIds: v.array(v.id("users")) },
  handler: async (ctx, { sessionToken, userIds }) => {
    await requireAdmin(ctx, sessionToken);
    for (const userId of userIds) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (orders !== null) {
        throw new Error(
          `Cannot delete user ${userId}: has orders; remove them from the batch or archive separately`,
        );
      }
    }
    for (const userId of userIds) {
      await deleteUserDocuments(ctx, userId);
    }
    return { removed: userIds.length };
  },
});
