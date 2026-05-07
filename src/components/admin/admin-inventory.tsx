"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/lib/money";
import { publicRef } from "@/lib/public-ref";
import { useAuth } from "@/providers/auth-provider";

export function AdminInventory() {
  const { sessionToken } = useAuth();
  const [maxStock, setMaxStock] = useState(10);

  const rows = useQuery(
    api.products.adminLowStockList,
    sessionToken
      ? { sessionToken, maxStock, limit: 500 }
      : "skip",
  );

  if (!sessionToken) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Low stock</h1>
        <p className="text-muted-foreground text-sm">
          Active products with on-hand quantity between 1 and the threshold (same signal as the dashboard list).
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="max-stock">Max stock (alert if ≤ this)</Label>
          <div className="flex gap-2">
            <Input
              id="max-stock"
              type="number"
              min={1}
              max={99999}
              className="w-28"
              value={String(maxStock)}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                if (Number.isFinite(n) && n >= 1) {
                  setMaxStock(n);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setMaxStock(10)}
            >
              Reset to 10
            </Button>
          </div>
        </div>
      </div>

      {rows === undefined ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No products match this threshold.</p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="w-24 text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {publicRef(p.publicCode)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href="/admin/products"
                      className="text-primary font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {p.sku ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(p.priceCents, p.currency)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{p.stock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
