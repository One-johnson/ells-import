import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/** Dashboard stats (admin only): orders, revenue, customers, and time-series for charts. */
export const getDashboardStats = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken ?? null);

    const orders = await ctx.db.query("orders").collect();
    const users = await ctx.db.query("users").collect();
    const products = await ctx.db.query("products").collect();

    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    const customerCount = users.filter((u) => u.role === "customer").length;

    // Group orders by day (last 30 days) for chart
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const days: { date: string; orders: number; revenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const start = new Date(now - i * dayMs);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + dayMs);
      const dayOrders = orders.filter(
        (o) => o.createdAt >= start.getTime() && o.createdAt < end.getTime()
      );
      days.push({
        date: start.toISOString().slice(0, 10),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      });
    }

    return {
      totalOrders,
      pendingOrders,
      revenue,
      customerCount,
      productCount: products.length,
      ordersByDay: days,
    };
  },
});
