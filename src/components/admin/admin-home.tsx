"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCents } from "@/lib/money";
import { publicRef } from "@/lib/public-ref";
import { useAuth } from "@/providers/auth-provider";

import {
  OrdersStatusBar,
  ProductsStatusPie,
  ProfitPeriodBar,
  UsersRoleBar,
} from "./admin-dashboard-charts";
import { orderStatusLabel, productStatusLabel } from "./labels";

const tiles = [
  { title: "Products", description: "Catalog, pricing, inventory", href: "/admin/products" },
  { title: "Categories", description: "Organize the catalog", href: "/admin/categories" },
  { title: "Orders", description: "Fulfillment and status", href: "/admin/orders" },
  { title: "Users", description: "Accounts and roles", href: "/admin/users" },
  { title: "Support", description: "Conversations and replies", href: "/admin/support" },
  { title: "Reviews", description: "Moderate product reviews", href: "/admin/reviews" },
  { title: "Low stock", description: "Active SKUs under threshold", href: "/admin/inventory" },
  { title: "Broadcast", description: "Notify users by role", href: "/admin/notify" },
  { title: "Store settings", description: "App key–value config", href: "/admin/settings" },
] as const;

export function AdminHome() {
  const { sessionToken } = useAuth();
  const [profitGroupBy, setProfitGroupBy] = useState<"week" | "month" | "year">("month");
  const data = useQuery(
    api.stats.adminDashboard,
    sessionToken ? { sessionToken } : "skip",
  );
  const profitPeriod = useQuery(
    api.stats.adminProfitByPeriod,
    sessionToken ? { sessionToken, groupBy: profitGroupBy } : "skip",
  );

  if (!sessionToken) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Overview of catalog activity, orders, and customers.
        </p>
      </div>

      {data === undefined ? (
        <p className="text-muted-foreground text-sm">Loading metrics…</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6">
          <li>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Products</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {data.productCount}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground flex flex-wrap gap-1.5 text-xs">
                {(
                  [
                    "draft",
                    "active",
                    "archived",
                  ] as (keyof typeof data.productsByStatus)[]
                ).map((k) => (
                  <Badge key={k} variant="outline">
                    {productStatusLabel(k)}: {data.productsByStatus[k]}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </li>
          <li>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Orders</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {data.orderCount}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-xs">
                Across {Object.keys(data.ordersByStatus).length} statuses
              </CardContent>
            </Card>
          </li>
          <li>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Profit (all time)</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {formatCents(data.totalProfitCents, data.profitCurrency)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-xs">
                From completed sales (excludes cancelled and refunded orders)
              </CardContent>
            </Card>
          </li>
          <li>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Users</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {data.userCount}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground flex flex-wrap gap-1.5 text-xs">
                <Badge variant="outline">Admins: {data.usersByRole.admin}</Badge>
                <Badge variant="outline">Customers: {data.usersByRole.customer}</Badge>
              </CardContent>
            </Card>
          </li>
          <li>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Categories</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {data.categoryCount}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-xs">
                Used to group products in the storefront
              </CardContent>
            </Card>
          </li>
          <li>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Open threads</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {data.openConversationCount}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href="/admin/support"
                  className="text-primary text-xs font-medium hover:underline"
                >
                  Open support →
                </Link>
              </CardContent>
            </Card>
          </li>
        </ul>
      )}

      {data && profitPeriod === undefined && (
        <p className="text-muted-foreground text-sm">Loading profit metrics…</p>
      )}

      {data && profitPeriod && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-medium tracking-tight">Profit by period</h2>
            <Select
              value={profitGroupBy}
              onValueChange={(v) => setProfitGroupBy(v as "week" | "month" | "year")}
            >
              <SelectTrigger className="w-full sm:w-44" size="default">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 12 weeks</SelectItem>
                <SelectItem value="month">Last 12 months</SelectItem>
                <SelectItem value="year">Last 5 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Estimated profit (selling − cost, per line)</CardDescription>
              <CardTitle className="text-base">Gross profit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-muted-foreground grid gap-2 sm:grid-cols-3 sm:gap-4 text-sm">
                <li>
                  <p className="text-foreground text-lg font-semibold tabular-nums">
                    {formatCents(profitPeriod.periodTotalCents, profitPeriod.currency)}
                  </p>
                  <p className="text-xs">In selected window</p>
                </li>
                <li>
                  <p className="text-foreground text-lg font-semibold tabular-nums">
                    {profitPeriod.orderCount}
                  </p>
                  <p className="text-xs">Orders in window (with any profit)</p>
                </li>
                <li>
                  <p className="text-foreground text-lg font-semibold tabular-nums">
                    {formatCents(profitPeriod.averageProfitPerOrderCents, profitPeriod.currency)}
                  </p>
                  <p className="text-xs">Average profit per order</p>
                </li>
              </ul>
              <ProfitPeriodBar data={profitPeriod} />
            </CardContent>
          </Card>
        </div>
      )}

      {data && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium tracking-tight">Breakdowns</h2>
          <ul className="grid min-w-0 gap-4 lg:grid-cols-3">
            <li className="min-w-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Products by status</CardDescription>
                  <CardTitle className="text-base">Catalog mix</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductsStatusPie data={data} />
                </CardContent>
              </Card>
            </li>
            <li className="min-w-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Orders by status</CardDescription>
                  <CardTitle className="text-base">Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <OrdersStatusBar data={data} />
                </CardContent>
              </Card>
            </li>
            <li className="min-w-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Users by role</CardDescription>
                  <CardTitle className="text-base">Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                  <UsersRoleBar data={data} />
                </CardContent>
              </Card>
            </li>
          </ul>
        </div>
      )}

      {data && data.lowStock.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium tracking-tight">Low stock (active)</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-28 text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lowStock.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {publicRef(p.publicCode)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href="/admin/inventory"
                        className="text-primary font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.stock}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {data && data.recentOrders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium tracking-tight">Recent orders</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentOrders.map((o) => (
                  <TableRow key={o._id}>
                    <TableCell className="font-mono text-sm tabular-nums">
                      {publicRef(o.publicCode)}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {new Date(o.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={o.customerEmail}>
                      {o.customerEmail}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{orderStatusLabel(o.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(o.totalCents, o.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium tracking-tight">Sections</h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className="block h-full">
                <Card className="hover:border-primary/50 h-full transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">{t.title}</CardTitle>
                    <CardDescription>{t.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-primary text-sm font-medium">Open →</span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
