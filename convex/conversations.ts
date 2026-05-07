import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireAuthed, resolveSession } from "./lib/sessionAuth";
import { conversationStatus, conversationType } from "./schema";

export const get = query({
  args: {
    conversationId: v.id("conversations"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { conversationId, sessionToken }) => {
    const a = await resolveSession(ctx, sessionToken);
    const c = await ctx.db.get(conversationId);
    if (c === null) {
      return null;
    }
    if (a === null) {
      return null;
    }
    if (a.user.role !== "admin" && c.customerId !== a.userId) {
      throw new Error("Forbidden");
    }
    return c;
  },
});

export const myConversations = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const a = await requireAuthed(ctx, sessionToken);
    if (a.user.role === "admin") {
      return await ctx.db
        .query("conversations")
        .withIndex("by_status", (q) => q.eq("status", "open"))
        .order("desc")
        .take(200);
    }
    return await ctx.db
      .query("conversations")
      .withIndex("by_customer", (q) => q.eq("customerId", a.userId))
      .order("desc")
      .take(100);
  },
});

export const list = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(conversationStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, status, limit = 200 }) => {
    await requireAdmin(ctx, sessionToken);
    if (status !== undefined) {
      return await ctx.db
        .query("conversations")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(limit);
    }
    return await ctx.db.query("conversations").order("desc").take(limit);
  },
});

export const adminListWithDetails = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(conversationStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, status, limit = 200 }) => {
    await requireAdmin(ctx, sessionToken);
    const rows: Doc<"conversations">[] =
      status !== undefined
        ? await ctx.db
            .query("conversations")
            .withIndex("by_status", (q) => q.eq("status", status))
            .order("desc")
            .take(limit)
        : await ctx.db.query("conversations").order("desc").take(limit);
    const out: {
      conversation: Doc<"conversations">;
      customerEmail: string;
      customerName: string | undefined;
      assignedAdminEmail: string | undefined;
    }[] = [];
    for (const c of rows) {
      const customer = await ctx.db.get(c.customerId);
      const assigned = c.assignedAdminId
        ? await ctx.db.get(c.assignedAdminId)
        : null;
      out.push({
        conversation: c,
        customerEmail: customer?.email ?? "—",
        customerName: customer?.name,
        assignedAdminEmail: assigned?.email,
      });
    }
    return out;
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    type: conversationType,
    subject: v.string(),
    status: v.optional(conversationStatus),
    customerId: v.optional(v.id("users")),
    assignedAdminId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const a = await requireAuthed(ctx, args.sessionToken);
    const { sessionToken, customerId, type, subject, status, assignedAdminId } = args;
    void sessionToken;
    const now = Date.now();
    const customer = customerId ?? a.userId;
    if (a.user.role !== "admin" && customer !== a.userId) {
      throw new Error("Forbidden");
    }
    return await ctx.db.insert("conversations", {
      type,
      status: status ?? "open",
      customerId: customer,
      subject: subject.slice(0, 200),
      assignedAdminId,
      lastMessageAt: now,
      createdAt: now,
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    conversationId: v.id("conversations"),
    subject: v.optional(v.string()),
    status: v.optional(conversationStatus),
    assignedAdminId: v.optional(v.id("users")),
    clearAssignedAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const a = await requireAuthed(ctx, args.sessionToken);
    const c = await ctx.db.get(args.conversationId);
    if (c === null) {
      throw new Error("Not found");
    }
    if (a.user.role !== "admin" && c.customerId !== a.userId) {
      throw new Error("Forbidden");
    }
    if (a.user.role !== "admin") {
      if (
        args.status !== undefined ||
        args.assignedAdminId !== undefined ||
        args.clearAssignedAdmin
      ) {
        throw new Error("Only admins can change that");
      }
    }
    const p: Record<string, unknown> = {};
    if (args.subject !== undefined) {
      p.subject = args.subject.slice(0, 200);
    }
    if (args.status !== undefined) {
      p.status = args.status;
    }
    if (args.assignedAdminId !== undefined) {
      p.assignedAdminId = args.assignedAdminId;
    }
    if (args.clearAssignedAdmin && a.user.role === "admin") {
      p.assignedAdminId = undefined;
    }
    if (Object.keys(p).length) {
      await ctx.db.patch(args.conversationId, p);
    }
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), conversationId: v.id("conversations") },
  handler: async (ctx, { sessionToken, conversationId }) => {
    await requireAdmin(ctx, sessionToken);
    for (const m of await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect()) {
      await ctx.db.delete(m._id);
    }
    await ctx.db.delete(conversationId);
  },
});

export const bulkSetStatus = mutation({
  args: {
    sessionToken: v.string(),
    conversationIds: v.array(v.id("conversations")),
    status: conversationStatus,
  },
  handler: async (ctx, { sessionToken, conversationIds, status }) => {
    await requireAdmin(ctx, sessionToken);
    for (const id of conversationIds) {
      await ctx.db.patch(id, { status });
    }
    return { updated: conversationIds.length };
  },
});
