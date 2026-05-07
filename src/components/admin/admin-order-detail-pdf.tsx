"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";

import type { Doc } from "@convex/_generated/dataModel";
import { orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/components/admin/labels";
import { InvoicePdfDocument } from "@/components/account/order-invoice-pdf";
import { publicRef } from "@/lib/public-ref";

type Ship = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
};

function isCurrencySymbolLikelySafe(code: string) {
  return ["USD", "EUR", "GBP"].includes(code);
}

function formatPricePdf(priceCents: number, currency: string): string {
  const code = (currency || "GHS").toUpperCase();
  const currencyDisplay = isCurrencySymbolLikelySafe(code) ? "symbol" : "code";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: code,
    currencyDisplay,
  }).format(priceCents / 100);
}

function formatDateLong(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { dateStyle: "long" });
}

function shippingLines(ship: Ship | undefined): string[] {
  if (!ship) return ["—"];
  const cityState = [ship.city, ship.state].filter(Boolean).join(", ");
  return [ship.name, ship.line1, ship.line2, cityState, `${ship.postalCode} ${ship.country}`.trim(), ship.phone].filter(
    Boolean,
  ) as string[];
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  storeName: { fontSize: 16, fontWeight: 700 },
  muted: { color: "#6B7280" },
  title: { fontSize: 18, fontWeight: 700, textAlign: "right" },
  rightMeta: { alignItems: "flex-end", gap: 3 },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginBottom: 6 },
  blockRow: { flexDirection: "row", justifyContent: "space-between", gap: 18, marginBottom: 14 },
  col: { width: "48%" },
  metaLine: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 4 },
  metaLabel: { color: "#6B7280" },
  table: { borderTopWidth: 1, borderTopColor: "#E5E7EB", marginTop: 10 },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    fontWeight: 700,
    backgroundColor: "#F9FAFB",
  },
  row: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  colItem: { width: "52%", paddingRight: 10 },
  colQty: { width: "12%", textAlign: "right" },
  colUnit: { width: "18%", textAlign: "right" },
  colAmount: { width: "18%", textAlign: "right", fontWeight: 700 },
  footer: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  pageFooter: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#6B7280",
    fontSize: 9,
  },
});

export function AdminOrderDetailPdfDocument({
  storeName,
  supportEmail,
  order,
  items,
  latestPayment,
  customer,
}: {
  storeName: string;
  supportEmail: string | null;
  order: Doc<"orders">;
  items: Doc<"orderItems">[];
  latestPayment: Doc<"payments"> | null;
  customer: { email: string; name?: string | null } | null;
}) {
  const ship = order.shippingAddress as Ship | undefined;
  const orderRef = publicRef(order.publicCode);

  return (
    <Document title={`Order ${orderRef}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.storeName}>{storeName}</Text>
            <Text style={styles.muted}>Support: {supportEmail ?? "—"}</Text>
          </View>
          <View style={styles.rightMeta}>
            <Text style={styles.title}>ORDER DETAILS</Text>
            <Text style={styles.muted}>Order #: {orderRef}</Text>
            {order.invoiceNumber ? (
              <Text style={styles.muted}>Invoice #: {publicRef(order.invoiceNumber)}</Text>
            ) : null}
            <Text style={styles.muted}>Date: {formatDateLong(order.createdAt)}</Text>
            <Text style={styles.muted}>Status: {orderStatusLabel(order.status)}</Text>
          </View>
        </View>

        <View style={styles.blockRow}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <Text style={styles.muted}>{customer?.name || "—"}</Text>
            <Text style={styles.muted}>{customer?.email ?? "—"}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Totals</Text>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Subtotal</Text>
              <Text>{formatPricePdf(order.subtotalCents, order.currency)}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Tax</Text>
              <Text>{formatPricePdf(order.taxCents, order.currency)}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Delivery</Text>
              <Text>{order.shippingCents > 0 ? formatPricePdf(order.shippingCents, order.currency) : "—"}</Text>
            </View>
            <View style={{ height: 6 }} />
            <View style={styles.metaLine}>
              <Text style={{ fontWeight: 700 }}>Total</Text>
              <Text style={{ fontWeight: 700 }}>{formatPricePdf(order.totalCents, order.currency)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.blockRow}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Ship to</Text>
            {shippingLines(ship).map((l) => (
              <Text key={l} style={styles.muted}>
                {l}
              </Text>
            ))}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Payment</Text>
            {latestPayment ? (
              <Text style={styles.muted}>
                {paymentStatusLabel(latestPayment.status)} · {paymentMethodLabel(latestPayment.method)} ·{" "}
                {formatPricePdf(latestPayment.amountCents, latestPayment.currency)}
              </Text>
            ) : (
              <Text style={styles.muted}>—</Text>
            )}
          </View>
        </View>

        {order.notes ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Customer notes</Text>
            <Text style={styles.muted}>{order.notes}</Text>
          </View>
        ) : null}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colItem}>Item</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colUnit}>Unit</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>
          {items.map((row) => (
            <View key={row._id} style={styles.row}>
              <Text style={styles.colItem}>{row.productName}</Text>
              <Text style={styles.colQty}>{String(row.quantity)}</Text>
              <Text style={styles.colUnit}>{formatPricePdf(row.unitPriceCents, order.currency)}</Text>
              <Text style={styles.colAmount}>{formatPricePdf(row.unitPriceCents * row.quantity, order.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.muted}>Generated from admin · {new Date().toISOString().slice(0, 10)}</Text>
        </View>

        <View style={styles.pageFooter} fixed>
          <Text>Order {orderRef}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function downloadAdminOrderDetailPdf(args: {
  storeName: string;
  supportEmail: string | null;
  order: Doc<"orders">;
  items: Doc<"orderItems">[];
  latestPayment: Doc<"payments"> | null;
  customer: { email: string; name?: string | null } | null;
}) {
  const doc = (
    <AdminOrderDetailPdfDocument
      storeName={args.storeName}
      supportEmail={args.supportEmail}
      order={args.order}
      items={args.items}
      latestPayment={args.latestPayment}
      customer={args.customer}
    />
  );
  const blob = await pdf(doc).toBlob();
  const orderRef = publicRef(args.order.publicCode);
  const filename = `order-${orderRef}-${args.order._id.slice(-6)}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadInvoicePdfFromData(args: {
  storeName: string;
  supportEmail: string | null;
  order: Doc<"orders">;
  items: Doc<"orderItems">[];
  latestPayment: Doc<"payments"> | null;
}) {
  const doc = (
    <InvoicePdfDocument
      storeName={args.storeName}
      supportEmail={args.supportEmail}
      order={args.order}
      items={args.items}
      latestPayment={args.latestPayment}
    />
  );
  const blob = await pdf(doc).toBlob();
  const filename = `invoice-${args.order.invoiceNumber ?? args.order.publicCode ?? args.order._id}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
