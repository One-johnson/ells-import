"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function AdminPreorderOrderPanel({
  sessionToken,
  order,
}: {
  sessionToken: string;
  order: Doc<"orders">;
}) {
  const preorderSetStage = useMutation(api.orders.preorderSetFulfillmentStage);
  const preorderInvoice = useMutation(api.orders.preorderInvoiceShipping);
  const preorderShipPaid = useMutation(api.orders.preorderMarkShippingPaid);
  const [overrideShip, setOverrideShip] = useState("");

  async function toStage(stage: "supplier_ordered" | "in_transit" | "arrived_gh") {
    try {
      await preorderSetStage({ sessionToken, orderId: order._id, stage });
      toast.success("Stage updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function invoice() {
    const raw = overrideShip.trim();
    const overrideShippingCents =
      raw === "" ? undefined : Math.round(Number.parseFloat(raw) * 100);
    if (raw !== "" && (Number.isNaN(overrideShippingCents!) || overrideShippingCents! < 0)) {
      toast.error("Override must be a valid GHS amount (e.g. 45.50).");
      return;
    }
    try {
      await preorderInvoice({
        sessionToken,
        orderId: order._id,
        overrideShippingCents,
      });
      toast.success("Shipping invoiced");
      setOverrideShip("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invoice failed");
    }
  }

  async function markShipPaid() {
    try {
      await preorderShipPaid({ sessionToken, orderId: order._id });
      toast.success("Shipping marked paid");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const st = order.preorderStage ?? "—";

  return (
    <div className="bg-muted/20 space-y-3 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Pre-order</p>
      <p className="text-xs">
        <span className="text-muted-foreground">Stage:</span> <span className="font-medium">{st}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => void toStage("supplier_ordered")}>
          → Supplier ordered
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void toStage("in_transit")}>
          → In transit
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void toStage("arrived_gh")}>
          → Arrived (GH)
        </Button>
      </div>
      <div className="space-y-2 border-t pt-2">
        <p className="text-muted-foreground text-xs">Invoice CBM shipping (after “Arrived (GH)”). Optional override in GHS.</p>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            placeholder="Override GHS (optional)"
            className="h-8 max-w-[10rem] text-xs"
            value={overrideShip}
            onChange={(e) => setOverrideShip(e.target.value)}
          />
          <Button type="button" size="sm" variant="secondary" onClick={() => void invoice()}>
            Invoice shipping
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void markShipPaid()}>
            Mark shipping paid
          </Button>
        </div>
      </div>
    </div>
  );
}
