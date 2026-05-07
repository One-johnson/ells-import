import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin, requireAuthed, resolveSession } from "./lib/sessionAuth";
import { notificationType, userRole } from "./schema";

const BROADCAST_PAGE_SIZE = 64;

export const get = query({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    return await ctx.db.get(notificationId);
  },
});

export const listMine = query({
  args: {
    sessionToken: v.optional(v.string()),
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, unreadOnly = false, limit = 50 }) => {
    const a = await resolveSession(ctx, sessionToken);
    if (a === null) {
      return [];
    }
    if (unreadOnly) {
      return await ctx.db
        .query("notifications")
        .withIndex("by_user_unread", (q) =>
          q.eq("userId", a.userId).eq("read", false),
        )
        .order("desc")
        .take(limit);
    }
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .order("desc")
      .take(limit);
  },
});

export const listForUser = query({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, userId, limit = 100 }) => {
    await requireAdmin(ctx, sessionToken);
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

export const list = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit = 200 }) => {
    await requireAdmin(ctx, sessionToken);
    return await ctx.db.query("notifications").order("desc").take(limit);
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    type: notificationType,
    title: v.string(),
    body: v.optional(v.string()),
    dataJson: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...row }) => {
    await requireAdmin(ctx, sessionToken);
    return await ctx.db.insert("notifications", {
      ...row,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    notificationId: v.id("notifications"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    dataJson: v.optional(v.string()),
    read: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionToken, notificationId, ...patch }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const n = await ctx.db.get(notificationId);
    if (n === null) {
      throw new Error("Not found");
    }
    if (n.userId !== a.userId && a.user.role !== "admin") {
      throw new Error("Forbidden");
    }
    const p: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(patch)) {
      if (val !== undefined) {
        p[k] = val;
      }
    }
    if (p.read === true) {
      p.readAt = Date.now();
    }
    await ctx.db.patch(notificationId, p);
  },
});

export const markRead = mutation({
  args: { sessionToken: v.string(), notificationId: v.id("notifications") },
  handler: async (ctx, { sessionToken, notificationId }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const n = await ctx.db.get(notificationId);
    if (n === null || n.userId !== a.userId) {
      throw new Error("Not found");
    }
    await ctx.db.patch(notificationId, {
      read: true,
      readAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), notificationId: v.id("notifications") },
  handler: async (ctx, { sessionToken, notificationId }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const n = await ctx.db.get(notificationId);
    if (n === null) {
      return;
    }
    if (n.userId !== a.userId && a.user.role !== "admin") {
      throw new Error("Forbidden");
    }
    await ctx.db.delete(notificationId);
  },
});

export const bulkMarkRead = mutation({
  args: { sessionToken: v.string(), notificationIds: v.array(v.id("notifications")) },
  handler: async (ctx, { sessionToken, notificationIds }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const now = Date.now();
    for (const id of notificationIds) {
      const n = await ctx.db.get(id);
      if (n && n.userId === a.userId) {
        await ctx.db.patch(id, { read: true, readAt: now });
      }
    }
    return { updated: notificationIds.length };
  },
});

export const bulkRemove = mutation({
  args: { sessionToken: v.string(), notificationIds: v.array(v.id("notifications")) },
  handler: async (ctx, { sessionToken, notificationIds }) => {
    const a = await requireAuthed(ctx, sessionToken);
    for (const id of notificationIds) {
      const n = await ctx.db.get(id);
      if (n && (n.userId === a.userId || a.user.role === "admin")) {
        await ctx.db.delete(id);
      }
    }
    return { removed: notificationIds.length };
  },
});

export const adminNotifyUser = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    type: notificationType,
    title: v.string(),
    body: v.optional(v.string()),
    dataJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
      dataJson: args.dataJson,
      read: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Paged internal worker: one transaction per page, then schedules the next
 * so large role-based broadcasts stay within mutation limits.
 */
export const processBroadcastPage = internalMutation({
  args: {
    targetRole: userRole,
    type: notificationType,
    title: v.string(),
    body: v.optional(v.string()),
    dataJson: v.optional(v.string()),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const { targetRole, type, title, body, dataJson, cursor } = args;
    const pageResult = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", targetRole))
      .order("asc")
      .paginate({ numItems: BROADCAST_PAGE_SIZE, cursor });
    const now = Date.now();
    for (const u of pageResult.page) {
      await ctx.db.insert("notifications", {
        userId: u._id,
        type,
        title,
        body,
        dataJson,
        read: false,
        createdAt: now,
      });
    }
    if (!pageResult.isDone) {
      await ctx.scheduler.runAfter(0, internal.notifications.processBroadcastPage, {
        targetRole,
        type,
        title,
        body,
        dataJson,
        cursor: pageResult.continueCursor,
      });
    }
    return {
      sent: pageResult.page.length,
      isDone: pageResult.isDone,
    };
  },
});

/**
 * Inserts an in-app notification for every user with the given role.
 * Work is chunked: the first page runs in this call; any remainder is scheduled
 * in the background (same payload, cursor-based pagination on `by_role`).
 */
export const broadcastToRole = mutation({
  args: {
    sessionToken: v.string(),
    targetRole: userRole,
    type: notificationType,
    title: v.string(),
    body: v.optional(v.string()),
    dataJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const { sessionToken, ...rest } = args;
    void sessionToken;
    const first: { sent: number; isDone: boolean } = await ctx.runMutation(
      internal.notifications.processBroadcastPage,
      {
        targetRole: rest.targetRole,
        type: rest.type,
        title: rest.title,
        body: rest.body,
        dataJson: rest.dataJson,
        cursor: null,
      },
    );
    return {
      firstBatch: first.sent,
      isComplete: first.isDone,
      morePending: !first.isDone,
    };
  },
});
