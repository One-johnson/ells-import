import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireAdmin } from "./lib/sessionAuth";

const DEFAULT_PROFIT_CURRENCY = "GHS";

function profitOrderStatus(status: Doc<"orders">["status"]): boolean {
  return status !== "cancelled" && status !== "refunded";
}

function lineProfitCents(line: Doc<"orderItems">): number {
  const unitCost = line.unitCostCents ?? 0;
  return (line.unitPriceCents - unitCost) * line.quantity;
}

function startOfUTCWeek(ts: number): number {
  const d = new Date(ts);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfUTCMonth(ts: number): number {
  const d = new Date(ts);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const mi = Number.parseInt(m ?? "1", 10) - 1;
  return `${monthNames[mi] ?? m} ${y}`;
}

const groupByValidator = v.union(
  v.literal("week"),
  v.literal("month"),
  v.literal("year"),
);

/**
 * Single round-trip for the admin home overview. Uses full collection
 * for counts — suitable for typical catalog sizes; revisit if tables grow very large.
 */
export const adminDashboard = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);

    const [products, orders, users, categories, orderItems, openConversations] =
      await Promise.all([
        ctx.db.query("products").collect(),
        ctx.db.query("orders").collect(),
        ctx.db.query("users").collect(),
        ctx.db.query("categories").collect(),
        ctx.db.query("orderItems").collect(),
        ctx.db
          .query("conversations")
          .withIndex("by_status", (q) => q.eq("status", "open"))
          .collect(),
      ]);

    const productsByStatus = { draft: 0, active: 0, archived: 0 };
    for (const p of products) {
      if (p.status === "draft") {
        productsByStatus.draft++;
      } else if (p.status === "active") {
        productsByStatus.active++;
      } else if (p.status === "archived") {
        productsByStatus.archived++;
      }
    }

    const ordersByStatus: Record<string, number> = {};
    for (const o of orders) {
      ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
    }

    const orderById = new Map(orders.map((o) => [o._id, o]));
    let totalProfitCents = 0;
    for (const line of orderItems) {
      const order = orderById.get(line.orderId);
      if (!order || !profitOrderStatus(order.status)) {
        continue;
      }
      totalProfitCents += lineProfitCents(line);
    }

    const lowStock = products
      .filter((p) => p.stock > 0 && p.stock < 10 && p.status === "active")
      .map((p) => ({
        _id: p._id,
        name: p.name,
        stock: p.stock,
        publicCode: p.publicCode,
      }))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8);

    const recentOrdersRaw = orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
    const recentOrders = [];
    for (const o of recentOrdersRaw) {
      const u = await ctx.db.get(o.userId);
      recentOrders.push({
        _id: o._id,
        publicCode: o.publicCode,
        status: o.status,
        totalCents: o.totalCents,
        currency: o.currency,
        createdAt: o.createdAt,
        customerEmail: u?.email ?? "—",
      });
    }

    return {
      productCount: products.length,
      productsByStatus,
      orderCount: orders.length,
      ordersByStatus,
      userCount: users.length,
      usersByRole: {
        admin: users.filter((u) => u.role === "admin").length,
        customer: users.filter((u) => u.role === "customer").length,
      },
      categoryCount: categories.length,
      totalProfitCents,
      profitCurrency: DEFAULT_PROFIT_CURRENCY,
      openConversationCount: openConversations.length,
      lowStock,
      recentOrders,
    };
  },
});

export const adminProfitByPeriod = query({
  args: {
    sessionToken: v.string(),
    groupBy: groupByValidator,
  },
  handler: async (ctx, { sessionToken, groupBy }) => {
    await requireAdmin(ctx, sessionToken);
    const [orders, orderItems] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db.query("orderItems").collect(),
    ]);
    const orderById = new Map(orders.map((o) => [o._id, o]));
    const now = Date.now();

    const seriesKeys: string[] = [];
    const keyToStart = new Map<string, number>();

    if (groupBy === "week") {
      let t = startOfUTCWeek(now);
      for (let i = 0; i < 12; i++) {
        const key = `w:${t}`;
        seriesKeys.push(key);
        keyToStart.set(key, t);
        t -= 7 * 24 * 60 * 60 * 1000;
      }
    } else if (groupBy === "month") {
      const d = new Date(now);
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      for (let i = 0; i < 12; i++) {
        const key = monthKey(d.getTime());
        seriesKeys.push(key);
        keyToStart.set(key, startOfUTCMonth(d.getTime()));
        d.setUTCMonth(d.getUTCMonth() - 1);
      }
    } else {
      const y0 = new Date(now).getUTCFullYear();
      for (let i = 0; i < 5; i++) {
        const year = y0 - i;
        const key = `y:${year}`;
        seriesKeys.push(key);
        keyToStart.set(key, Date.UTC(year, 0, 1));
      }
    }

    const keysOrdered = [...seriesKeys].reverse();
    const profitByKey = new Map<string, number>();
    for (const k of keysOrdered) {
      profitByKey.set(k, 0);
    }

    const ordersInWindow = new Set<Id<"orders">>();

    for (const line of orderItems) {
      const order = orderById.get(line.orderId);
      if (!order || !profitOrderStatus(order.status)) {
        continue;
      }
      const ts = order.createdAt;
      let bucket: string | undefined;
      if (groupBy === "week") {
        const wk = startOfUTCWeek(ts);
        const k = `w:${wk}`;
        if (keysOrdered.includes(k)) {
          bucket = k;
        }
      } else if (groupBy === "month") {
        const k = monthKey(ts);
        if (keysOrdered.includes(k)) {
          bucket = k;
        }
      } else {
        const y = new Date(ts).getUTCFullYear();
        const k = `y:${y}`;
        if (keysOrdered.includes(k)) {
          bucket = k;
        }
      }
      if (bucket === undefined) {
        continue;
      }
      const p = lineProfitCents(line);
      profitByKey.set(bucket, (profitByKey.get(bucket) ?? 0) + p);
      ordersInWindow.add(order._id);
    }

    const series = keysOrdered.map((key) => {
      let label: string;
      if (key.startsWith("w:")) {
        const t = keyToStart.get(key) ?? Number.parseInt(key.slice(2), 10);
        const a = new Date(t);
        const b = new Date(t + 6 * 24 * 60 * 60 * 1000);
        const fmt = (d: Date) =>
          d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
        label = `${fmt(a)} – ${fmt(b)}`;
      } else if (key.startsWith("y:")) {
        label = key.slice(2);
      } else {
        label = monthLabel(key);
      }
      return {
        key,
        label,
        profitCents: profitByKey.get(key) ?? 0,
      };
    });

    const periodTotalCents = series.reduce((s, x) => s + x.profitCents, 0);
    const orderCount = ordersInWindow.size;
    const averageProfitPerOrderCents =
      orderCount > 0 ? Math.round(periodTotalCents / orderCount) : 0;

    return {
      groupBy,
      currency: DEFAULT_PROFIT_CURRENCY,
      series,
      periodTotalCents,
      orderCount,
      averageProfitPerOrderCents,
    };
  },
});
