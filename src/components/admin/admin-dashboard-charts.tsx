"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Doc } from "@convex/_generated/dataModel";

import { orderStatusLabel, productStatusLabel } from "./labels";

const ORDER_STATUS_KEYS: Doc<"orders">["status"][] = [
  "pending",
  "processing",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
  "var(--muted-foreground)",
] as const;

const PRODUCT_KEYS = ["draft", "active", "archived"] as const satisfies readonly Doc<"products">["status"][];

export type AdminDashboardChartData = {
  productsByStatus: { draft: number; active: number; archived: number };
  ordersByStatus: Record<string, number>;
  usersByRole: { admin: number; customer: number };
  orderCount: number;
  productCount: number;
  userCount: number;
  totalProfitCents: number;
  profitCurrency: string;
};

export type AdminProfitSeriesPoint = {
  key: string;
  label: string;
  profitCents: number;
};

export type AdminProfitByPeriodData = {
  groupBy: "week" | "month" | "year";
  currency: string;
  series: AdminProfitSeriesPoint[];
  periodTotalCents: number;
  orderCount: number;
  averageProfitPerOrderCents: number;
};

function ChartTooltip() {
  return (
    <Tooltip
      contentStyle={{
        backgroundColor: "var(--popover)",
        color: "var(--popover-foreground)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        fontSize: "12px",
      }}
    />
  );
}

export function ProductsStatusPie({ data }: { data: AdminDashboardChartData }) {
  const pieData: { name: string; value: number; fill: string }[] = PRODUCT_KEYS.map((k, i) => ({
    name: productStatusLabel(k),
    value: data.productsByStatus[k],
    fill: CHART_COLORS[i % CHART_COLORS.length]!,
  })).filter((d) => d.value > 0);

  if (data.productCount === 0) {
    return (
      <p className="text-muted-foreground flex h-52 items-center justify-center text-sm">No products yet</p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Pie
            data={pieData.length ? pieData : [{ name: "—", value: 1, fill: "var(--muted)" }]}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={80}
            paddingAngle={2}
            stroke="var(--border)"
            strokeWidth={1}
          >
            {(pieData.length ? pieData : [{ name: "—", value: 1, fill: "var(--muted)" }]).map(
              (entry, index) => (
                <Cell key={entry.name + String(index)} fill={entry.fill} />
              ),
            )}
          </Pie>
          {pieData.length > 0 && <ChartTooltip />}
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: "12px" }}
            formatter={(value) => <span className="text-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildOrdersBarData(ordersByStatus: Record<string, number>) {
  const known = new Set<string>(ORDER_STATUS_KEYS);
  const rows: { name: string; value: number }[] = [];
  for (const k of ORDER_STATUS_KEYS) {
    const v = ordersByStatus[k] ?? 0;
    if (v > 0) {
      rows.push({ name: orderStatusLabel(k), value: v });
    }
  }
  for (const k of Object.keys(ordersByStatus)) {
    if (known.has(k)) continue;
    const v = ordersByStatus[k] ?? 0;
    if (v > 0) {
      rows.push({ name: k, value: v });
    }
  }
  return rows;
}

export function OrdersStatusBar({ data }: { data: AdminDashboardChartData }) {
  const barData = buildOrdersBarData(data.ordersByStatus);

  if (data.orderCount === 0) {
    return (
      <p className="text-muted-foreground flex h-52 items-center justify-center text-sm">No orders yet</p>
    );
  }

  return (
    <div className="h-60 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={barData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal />
          <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
          <YAxis
            dataKey="name"
            type="category"
            width={88}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <ChartTooltip />
          <Bar
            dataKey="value"
            name="Orders"
            radius={[0, 4, 4, 0]}
            maxBarSize={28}
          >
            {barData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]!} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProfitPeriodBar({ data }: { data: AdminProfitByPeriodData }) {
  const barData = data.series.map((s) => ({
    name: s.label,
    value: s.profitCents / 100,
  }));

  if (data.series.length === 0) {
    return (
      <p className="text-muted-foreground flex h-52 items-center justify-center text-sm">
        No profit data in this range
      </p>
    );
  }

  const hasNonZero = data.series.some((s) => s.profitCents !== 0);
  if (!hasNonZero) {
    return (
      <p className="text-muted-foreground flex h-52 items-center justify-center text-sm">
        No orders in this period yet
      </p>
    );
  }

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barData} margin={{ top: 8, right: 8, left: 4, bottom: 48 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={56}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(x) =>
              new Intl.NumberFormat("en-GH", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(x)
            }
            width={44}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              color: "var(--popover-foreground)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: "12px",
            }}
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value);
              return [
                new Intl.NumberFormat("en-GH", {
                  style: "currency",
                  currency: data.currency,
                }).format(Number.isFinite(n) ? n : 0),
                "Profit",
              ];
            }}
          />
          <Bar dataKey="value" name="Profit" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {barData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]!} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function UsersRoleBar({ data }: { data: AdminDashboardChartData }) {
  const barData = [
    { name: "Admins", value: data.usersByRole.admin },
    { name: "Customers", value: data.usersByRole.customer },
  ];

  if (data.userCount === 0) {
    return (
      <p className="text-muted-foreground flex h-40 items-center justify-center text-sm">No users yet</p>
    );
  }

  return (
    <div className="h-44 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            allowDecimals={false}
            width={32}
          />
          <ChartTooltip />
          <Bar dataKey="value" name="Users" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {barData.map((_, i) => (
              <Cell key={i} fill={i === 0 ? "var(--chart-1)" : "var(--chart-2)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
