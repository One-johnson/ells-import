import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, requireAdmin } from "./lib/auth";
import { notificationType } from "./schema";

/** List notifications for current user. */
export const list = query({
  args: {
    sessionToken: v.optional(v.string()),
    read: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, read, limit = 50, cursor }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const base = read !== undefined
      ? ctx.db
          .query("notifications")
          .withIndex("by_user_read_created", (q) => q.eq("userId", user._id).eq("read", read))
      : ctx.db
          .query("notifications")
          .withIndex("by_user_created", (q) => q.eq("userId", user._id));
    const result = cursor ? await base.paginate({ numItems: limit, cursor }) : await base.take(limit);
    const items = Array.isArray(result) ? result : result.page;
    const nextCursor = Array.isArray(result) ? null : result.continueCursor;
    return { items, nextCursor };
  },
});

/** Unread count for current user (e.g. for badge). */
export const unreadCount = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const list = await ctx.db
      .query("notifications")
      .withIndex("by_user_read_created", (q) => q.eq("userId", user._id).eq("read", false))
      .collect();
    return list.length;
  },
});

/** Get notification by id. */
export const get = query({
  args: { sessionToken: v.optional(v.string()), notificationId: v.id("notifications") },
  handler: async (ctx, { sessionToken, notificationId }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const n = await ctx.db.get(notificationId);
    if (!n || n.userId !== user._id) return null;
    return n;
  },
});

/** Mark as read. */
export const markRead = mutation({
  args: { sessionToken: v.optional(v.string()), notificationId: v.id("notifications") },
  handler: async (ctx, { sessionToken, notificationId }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const n = await ctx.db.get(notificationId);
    if (!n || n.userId !== user._id) throw new Error("Forbidden");
    await ctx.db.patch(notificationId, { read: true });
    return notificationId;
  },
});

/** Mark all as read. */
export const markAllRead = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const list = await ctx.db
      .query("notifications")
      .withIndex("by_user_read_created", (q) => q.eq("userId", user._id).eq("read", false))
      .collect();
    for (const n of list) await ctx.db.patch(n._id, { read: true });
    return list.length;
  },
});

/** Create notification (admin only, or system). */
export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    userId: v.id("users"),
    type: notificationType,
    title: v.string(),
    body: v.optional(v.string()),
    link: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken ?? null);
    const now = Date.now();
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
      read: false,
      link: args.link,
      metadata: args.metadata,
      createdAt: now,
    });
  },
});

/** Bulk create notifications (admin only). */
export const bulkCreate = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    notifications: v.array(
      v.object({
        userId: v.id("users"),
        type: notificationType,
        title: v.string(),
        body: v.optional(v.string()),
        link: v.optional(v.string()),
        metadata: v.optional(v.record(v.string(), v.any())),
      })
    ),
  },
  handler: async (ctx, { sessionToken, notifications }) => {
    await requireAdmin(ctx, sessionToken ?? null);
    const now = Date.now();
    const ids = [];
    for (const n of notifications) {
      ids.push(
        await ctx.db.insert("notifications", {
          ...n,
          read: false,
          createdAt: now,
        })
      );
    }
    return ids;
  },
});

/** Delete notification (admin or owner). */
export const remove = mutation({
  args: { sessionToken: v.optional(v.string()), notificationId: v.id("notifications") },
  handler: async (ctx, { sessionToken, notificationId }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const n = await ctx.db.get(notificationId);
    if (!n) throw new Error("Not found");
    if (n.userId !== user._id && user.role !== "admin") throw new Error("Forbidden");
    await ctx.db.delete(notificationId);
    return notificationId;
  },
});

/** Delete all notifications for current user. */
export const removeAll = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken ?? null);
    const list = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .collect();
    for (const n of list) await ctx.db.delete(n._id);
    return list.length;
  },
});
