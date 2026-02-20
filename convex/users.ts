import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireUser, requireAdmin, SESSION_DURATION_MS } from "./lib/auth";
import { hashSync, compareSync } from "bcryptjs";
import type { Doc } from "./_generated/dataModel";

const userRole = v.union(v.literal("admin"), v.literal("customer"));

/** Register: creates customer account and session. Returns sessionToken + user (same as login). */
export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { email, password, name, image, phone }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .unique();
    if (existing) throw new Error("Email already registered");
    const passwordHash = hashSync(password, 10);
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: email.toLowerCase(),
      name,
      role: "customer",
      passwordHash,
      image,
      phone,
      createdAt: now,
      updatedAt: now,
    });
    const token = crypto.randomUUID();
    await ctx.db.insert("sessions", {
      userId,
      sessionId: token,
      expiresAt: now + SESSION_DURATION_MS,
      createdAt: now,
    });
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const { passwordHash: _, ...safe } = user;
    return { sessionToken: token, user: safe as Omit<Doc<"users">, "passwordHash"> };
  },
});

/** Login: returns sessionToken and user (without passwordHash). */
export const login = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .unique();
    if (!user) throw new Error("Invalid email or password");
    if (!compareSync(password, user.passwordHash)) throw new Error("Invalid email or password");
    const token = crypto.randomUUID();
    const now = Date.now();
    await ctx.db.insert("sessions", {
      userId: user._id,
      sessionId: token,
      expiresAt: now + SESSION_DURATION_MS,
      createdAt: now,
    });
    const { passwordHash: _, ...safe } = user;
    return { sessionToken: token, user: safe as Omit<Doc<"users">, "passwordHash"> };
  },
});

/** Logout: invalidate session. */
export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionToken))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

/** Current user (no password). */
export const getMe = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    const user = await getCurrentUser(ctx, sessionToken ?? null);
    if (!user) return null;
    const { passwordHash: _, ...safe } = user;
    return safe as Omit<Doc<"users">, "passwordHash">;
  },
});

/** List users (admin only). */
export const list = query({
  args: {
    sessionToken: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, limit = 50, cursor }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    const result = await ctx.db
      .query("users")
      .order("desc")
      .paginate({ numItems: limit, cursor: cursor ?? null });
    const safe = result.page.map(({ passwordHash: _, ...u }) => u);
    return { items: safe, nextCursor: result.continueCursor };
  },
});

/** Get user by id (admin or self). */
export const get = query({
  args: { sessionToken: v.optional(v.string()), userId: v.id("users") },
  handler: async (ctx, { sessionToken, userId }) => {
    const me = await requireUser(ctx, sessionToken ?? null);
    if (me.role !== "admin" && me._id !== userId) throw new Error("Forbidden");
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const { passwordHash: _, ...safe } = user;
    return safe as Omit<Doc<"users">, "passwordHash">;
  },
});

/** Update user (admin or self). Admin can set role. */
export const update = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    userId: v.id("users"),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(userRole),
  },
  handler: async (ctx, { sessionToken, userId, name, image, phone, role }) => {
    const me = await requireUser(ctx, sessionToken ?? null);
    if (me._id !== userId && me.role !== "admin") throw new Error("Forbidden");
    if (role !== undefined && me.role !== "admin") throw new Error("Forbidden");
    const patch: Partial<Doc<"users">> = { updatedAt: Date.now() };
    if (name !== undefined) patch.name = name;
    if (image !== undefined) patch.image = image;
    if (phone !== undefined) patch.phone = phone;
    if (role !== undefined) patch.role = role;
    await ctx.db.patch(userId, patch);
    return userId;
  },
});

/** Change password (self only). */
export const changePassword = mutation({
  args: {
    sessionToken: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { sessionToken, currentPassword, newPassword }) => {
    const user = await requireUser(ctx, sessionToken);
    const doc = await ctx.db.get(user._id);
    if (!doc || !compareSync(currentPassword, doc.passwordHash)) throw new Error("Current password is wrong");
    await ctx.db.patch(user._id, {
      passwordHash: hashSync(newPassword, 10),
      updatedAt: Date.now(),
    });
  },
});

/** Delete user (admin only, or self). */
export const remove = mutation({
  args: { sessionToken: v.optional(v.string()), userId: v.id("users") },
  handler: async (ctx, { sessionToken, userId }) => {
    const me = await requireUser(ctx, sessionToken ?? null);
    if (me._id !== userId && me.role !== "admin") throw new Error("Forbidden");
    await ctx.db.delete(userId);
    return userId;
  },
});

/** Bulk delete users (admin only). */
export const bulkDelete = mutation({
  args: { sessionToken: v.optional(v.string()), userIds: v.array(v.id("users")) },
  handler: async (ctx, { sessionToken, userIds }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    for (const id of userIds) await ctx.db.delete(id);
    return userIds.length;
  },
});
