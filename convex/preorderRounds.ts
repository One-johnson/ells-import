import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { requireAdmin } from "./lib/sessionAuth";
import {
  closesAtUtcForMonthKey,
  currentMonthKey,
  nextMonthKey,
  roundLabelForMonthKey,
} from "./lib/preorderTime";
import type { Doc, Id } from "./_generated/dataModel";
import { preorderRoundStatus } from "./schema";

/** Storefront: open rounds soonest deadline first. */
export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("preorderRounds")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
    rows.sort((a, b) => a.closesAt - b.closesAt);
    return rows;
  },
});

export const listAll = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit = 120 }) => {
    await requireAdmin(ctx, sessionToken);
    const rows = await ctx.db.query("preorderRounds").order("desc").take(limit);
    return rows;
  },
});

export const createForMonth = mutation({
  args: {
    sessionToken: v.string(),
    monthKey: v.string(),
  },
  handler: async (ctx, { sessionToken, monthKey }) => {
    await requireAdmin(ctx, sessionToken);
    const mk = monthKey.trim();
    if (!/^\d{4}-\d{2}$/.test(mk)) {
      throw new Error("monthKey must be YYYY-MM");
    }
    const dup = await ctx.db
      .query("preorderRounds")
      .withIndex("by_monthKey", (q) => q.eq("monthKey", mk))
      .first();
    if (dup) {
      throw new Error(`A round for ${mk} already exists.`);
    }
    const now = Date.now();
    const id = await ctx.db.insert("preorderRounds", {
      label: roundLabelForMonthKey(mk),
      monthKey: mk,
      status: "open",
      closesAt: closesAtUtcForMonthKey(mk),
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const closeRoundManual = mutation({
  args: {
    sessionToken: v.string(),
    roundId: v.id("preorderRounds"),
  },
  handler: async (ctx, { sessionToken, roundId }) => {
    const admin = await requireAdmin(ctx, sessionToken);
    const round = await ctx.db.get(roundId);
    if (round === null) {
      throw new Error("Round not found");
    }
    if (round.status !== "open") {
      throw new Error("Round is not open");
    }
    const now = Date.now();
    await ctx.db.patch(roundId, {
      status: "closed",
      closedAt: now,
      closedByUserId: admin.userId,
      closedReason: "manual",
      updatedAt: now,
    });
    await advanceOrdersAfterRoundClose(ctx, roundId, now);
    await ensureNextOpenRound(ctx, round.monthKey, now);
    return { ok: true as const };
  },
});

export const setRoundStatus = mutation({
  args: {
    sessionToken: v.string(),
    roundId: v.id("preorderRounds"),
    status: preorderRoundStatus,
  },
  handler: async (ctx, { sessionToken, roundId, status }) => {
    await requireAdmin(ctx, sessionToken);
    const round = await ctx.db.get(roundId);
    if (round === null) {
      throw new Error("Round not found");
    }
    const now = Date.now();
    const patch: Partial<Doc<"preorderRounds">> = { status, updatedAt: now };
    if (status === "ordered" && round.supplierOrderedAt === undefined) {
      patch.supplierOrderedAt = now;
    }
    if (status === "arrived" && round.arrivedAt === undefined) {
      patch.arrivedAt = now;
    }
    await ctx.db.patch(roundId, patch);
    return { ok: true as const };
  },
});

async function advanceOrdersAfterRoundClose(ctx: MutationCtx, roundId: Id<"preorderRounds">, now: number) {
  for (const o of await ctx.db
    .query("orders")
    .withIndex("by_preorder_round", (q) => q.eq("preorderRoundId", roundId))
    .collect()) {
    if (o.fulfillmentMode !== "preorder") {
      continue;
    }
    if (o.preorderStage === "awaiting_round_close") {
      await ctx.db.patch(o._id, {
        preorderStage: "round_closed",
        updatedAt: now,
      });
    }
  }
}

async function ensureNextOpenRound(ctx: MutationCtx, closedMonthKey: string, now: number) {
  const nk = nextMonthKey(closedMonthKey);
  const existingNext = await ctx.db
    .query("preorderRounds")
    .withIndex("by_monthKey", (q) => q.eq("monthKey", nk))
    .first();
  if (existingNext) {
    if (existingNext.status === "open") {
      return;
    }
    return;
  }
  await ctx.db.insert("preorderRounds", {
    label: roundLabelForMonthKey(nk),
    monthKey: nk,
    status: "open",
    closesAt: closesAtUtcForMonthKey(nk),
    createdAt: now,
    updatedAt: now,
  });
}

export const bootstrapCurrentMonth = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    const now = Date.now();
    const mk = currentMonthKey(now);
    const existing = await ctx.db
      .query("preorderRounds")
      .withIndex("by_monthKey", (q) => q.eq("monthKey", mk))
      .first();
    if (existing) {
      return { roundId: existing._id, created: false as const };
    }
    const id = await ctx.db.insert("preorderRounds", {
      label: roundLabelForMonthKey(mk),
      monthKey: mk,
      status: "open",
      closesAt: closesAtUtcForMonthKey(mk),
      createdAt: now,
      updatedAt: now,
    });
    return { roundId: id, created: true as const };
  },
});

export const runDailyCloseAndReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const mk = currentMonthKey(now);
    await (async () => {
      const cur = await ctx.db
        .query("preorderRounds")
        .withIndex("by_monthKey", (q) => q.eq("monthKey", mk))
        .first();
      if (!cur) {
        await ctx.db.insert("preorderRounds", {
          label: roundLabelForMonthKey(mk),
          monthKey: mk,
          status: "open",
          closesAt: closesAtUtcForMonthKey(mk),
          createdAt: now,
          updatedAt: now,
        });
      }
    })();

    const open = await ctx.db
      .query("preorderRounds")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
    for (const r of open) {
      if (r.closesAt <= now) {
        await ctx.db.patch(r._id, {
          status: "closed",
          closedAt: now,
          closedReason: "auto",
          updatedAt: now,
        });
        await advanceOrdersAfterRoundClose(ctx, r._id, now);
        await ensureNextOpenRound(ctx, r.monthKey, now);
      }
    }

    const reminderGapMs = 7 * 24 * 60 * 60 * 1000;
    for (const o of await ctx.db.query("orders").order("desc").take(400)) {
      if (o.fulfillmentMode !== "preorder") {
        continue;
      }
      if (o.preorderStage !== "shipping_billed") {
        continue;
      }
      if (o.shippingCents <= 0) {
        continue;
      }
      const pendingShip = await ctx.db
        .query("payments")
        .withIndex("by_order", (q) => q.eq("orderId", o._id))
        .collect()
        .then((ps) => ps.some((p) => (p.kind ?? "full") === "shipping" && p.status === "pending"));
      if (!pendingShip) {
        continue;
      }
      const last = o.shippingReminderLastAt ?? 0;
      if (now - last < reminderGapMs) {
        continue;
      }
      const count = (o.shippingReminderCount ?? 0) + 1;
      await ctx.db.patch(o._id, {
        shippingReminderLastAt: now,
        shippingReminderCount: count,
        updatedAt: now,
      });
      await ctx.db.insert("notifications", {
        userId: o.userId,
        type: "order",
        title: "Shipping fee due",
        body: o.publicCode
          ? `Pre-order #${o.publicCode}: pay your shipping fee (${(o.shippingCents / 100).toFixed(2)} ${o.currency}) so we can dispatch.`
          : `Pay your shipping fee (${(o.shippingCents / 100).toFixed(2)} ${o.currency}) so we can dispatch your pre-order.`,
        dataJson: JSON.stringify({ orderId: o._id }),
        read: false,
        createdAt: now,
      });
    }

    return { ok: true as const };
  },
});
