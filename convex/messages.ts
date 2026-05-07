import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireAuthed, resolveSession } from "./lib/sessionAuth";

export const get = query({
  args: {
    messageId: v.id("messages"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { messageId, sessionToken }) => {
    const a = await resolveSession(ctx, sessionToken);
    const m = await ctx.db.get(messageId);
    if (m === null) {
      return null;
    }
    const c = await ctx.db.get(m.conversationId);
    if (c === null) {
      return null;
    }
    if (a === null) {
      return null;
    }
    if (a.user.role !== "admin" && c.customerId !== a.userId) {
      throw new Error("Forbidden");
    }
    return m;
  },
});

export const listByConversation = query({
  args: {
    conversationId: v.id("conversations"),
    sessionToken: v.string(),
  },
  handler: async (ctx, { conversationId, sessionToken }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const c = await ctx.db.get(conversationId);
    if (c === null) {
      return [];
    }
    if (a.user.role !== "admin" && c.customerId !== a.userId) {
      throw new Error("Forbidden");
    }
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("asc")
      .collect();
  },
});

export const list = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit = 200 }) => {
    await requireAdmin(ctx, sessionToken);
    return await ctx.db.query("messages").order("desc").take(limit);
  },
});

export const post = mutation({
  args: {
    sessionToken: v.string(),
    conversationId: v.id("conversations"),
    body: v.string(),
  },
  handler: async (ctx, { sessionToken, conversationId, body }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const c = await ctx.db.get(conversationId);
    if (c === null) {
      throw new Error("Conversation not found");
    }
    if (a.user.role !== "admin" && c.customerId !== a.userId) {
      throw new Error("Forbidden");
    }
    const now = Date.now();
    const id = await ctx.db.insert("messages", {
      conversationId,
      senderId: a.userId,
      body: body.slice(0, 8000),
      read: false,
      createdAt: now,
    });
    await ctx.db.patch(conversationId, { lastMessageAt: now });
    return id;
  },
});

export const openOrGetSupport = mutation({
  args: { sessionToken: v.string(), subject: v.string() },
  handler: async (ctx, { sessionToken, subject }) => {
    const { userId } = await requireAuthed(ctx, sessionToken);
    const forUser = await ctx.db
      .query("conversations")
      .withIndex("by_customer", (q) => q.eq("customerId", userId))
      .collect();
    const open = forUser.find((c) => c.status === "open");
    if (open) {
      return open._id;
    }
    const now = Date.now();
    return await ctx.db.insert("conversations", {
      type: "support",
      status: "open",
      customerId: userId,
      subject: subject.slice(0, 200),
      lastMessageAt: now,
      createdAt: now,
    });
  },
});

export const createDirect = mutation({
  args: {
    sessionToken: v.string(),
    otherUserId: v.id("users"),
    subject: v.string(),
  },
  handler: async (ctx, { sessionToken, otherUserId, subject }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const now = Date.now();
    return await ctx.db.insert("conversations", {
      type: "direct",
      status: "open",
      customerId: a.userId,
      subject: subject.slice(0, 200),
      assignedAdminId: otherUserId,
      lastMessageAt: now,
      createdAt: now,
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    messageId: v.id("messages"),
    body: v.optional(v.string()),
    read: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionToken, messageId, body, read }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const m = await ctx.db.get(messageId);
    if (m === null) {
      throw new Error("Not found");
    }
    if (m.senderId !== a.userId && a.user.role !== "admin") {
      throw new Error("Forbidden");
    }
    const patch: Record<string, unknown> = {};
    if (body !== undefined) {
      patch.body = body.slice(0, 8000);
    }
    if (read !== undefined) {
      patch.read = read;
      patch.readAt = read ? Date.now() : undefined;
    }
    if (Object.keys(patch).length) {
      await ctx.db.patch(messageId, patch);
    }
  },
});

export const markRead = mutation({
  args: { sessionToken: v.string(), messageId: v.id("messages") },
  handler: async (ctx, { sessionToken, messageId }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const m = await ctx.db.get(messageId);
    if (m === null) {
      return;
    }
    const c = await ctx.db.get(m.conversationId);
    if (c === null) {
      return;
    }
    if (a.user.role !== "admin" && c.customerId !== a.userId) {
      throw new Error("Forbidden");
    }
    await ctx.db.patch(messageId, { read: true, readAt: Date.now() });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), messageId: v.id("messages") },
  handler: async (ctx, { sessionToken, messageId }) => {
    const a = await requireAuthed(ctx, sessionToken);
    const m = await ctx.db.get(messageId);
    if (m === null) {
      return;
    }
    if (m.senderId !== a.userId && a.user.role !== "admin") {
      throw new Error("Forbidden");
    }
    await ctx.db.delete(messageId);
  },
});

export const bulkRemove = mutation({
  args: { sessionToken: v.string(), messageIds: v.array(v.id("messages")) },
  handler: async (ctx, { sessionToken, messageIds }) => {
    const a = await requireAuthed(ctx, sessionToken);
    for (const id of messageIds) {
      const m = await ctx.db.get(id);
      if (m && (m.senderId === a.userId || a.user.role === "admin")) {
        await ctx.db.delete(id);
      }
    }
    return { removed: messageIds.length };
  },
});
