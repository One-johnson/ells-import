"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  Document,
  Font,
  Page,
  PDFViewer,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { AccountPageSkeleton } from "@/components/account/account-page-skeleton";
import { orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/components/admin/labels";
import { Button } from "@/components/ui/button";
import { publicRef } from "@/lib/public-ref";
import { useAuth } from "@/providers/auth-provider";

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

function isInvoiceEligibleStatus(status: Doc<"orders">["status"]) {
  return status === "paid" || status === "shipped" || status === "delivered";
}

function isCurrencySymbolLikelySafe(code: string) {
  // Conservative allow-list for built-in fonts / common glyph coverage.
  // Everything else falls back to currency code to avoid missing glyphs in PDFs.
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

function shippingAddressLines(ship: Ship | undefined): string[] {
  if (!ship) return ["—"];
  const cityState = [ship.city, ship.state].filter(Boolean).join(", ");
  return [ship.name, ship.line1, ship.line2, cityState, `${ship.postalCode} ${ship.country}`.trim(), ship.phone].filter(
    Boolean,
  ) as string[];
}

// Note: avoid registering remote web fonts here.
// This component renders PDFs in the browser (via `PDFViewer`), so any `Font.register`
// URLs will be fetched client-side and can fail (e.g. stale Google Fonts URLs).

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
  title: { fontSize: 20, fontWeight: 700, textAlign: "right" },
  rightMeta: { alignItems: "flex-end", gap: 3 },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginBottom: 6 },
  blockRow: { flexDirection: "row", justifyContent: "space-between", gap: 18, marginBottom: 16 },
  address: { width: "58%" },
  meta: { width: "42%", alignItems: "flex-end" },
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
  row: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  colItem: { width: "52%", paddingRight: 10, lineHeight: 1.25 },
  colQty: { width: "12%", textAlign: "right" },
  colUnit: { width: "18%", textAlign: "right" },
  colAmount: { width: "18%", textAlign: "right", fontWeight: 700 },
  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 14 },
  totalsBox: { width: 240, borderWidth: 1, borderColor: "#E5E7EB", padding: 12, borderRadius: 8, backgroundColor: "#FAFAFA" },
  totalsLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 8 },
  footer: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB", textAlign: "center" },
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

export function InvoicePdfDocument({
  storeName,
  supportEmail,
  order,
  items,
  latestPayment,
}: {
  storeName: string;
  supportEmail: string | null;
  order: Doc<"orders">;
  items: Doc<"orderItems">[];
  latestPayment: Doc<"payments"> | null;
}) {
  const ship = order.shippingAddress as Ship | undefined;
  const invoiceNo = order.invoiceNumber ? publicRef(order.invoiceNumber) : "—";
  const orderRef = publicRef(order.publicCode);
  const issuedDate = formatDateLong(order.createdAt);

  return (
    <Document title={`Invoice ${invoiceNo}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.storeName}>{storeName}</Text>
            <Text style={styles.muted}>Support: {supportEmail ?? "—"}</Text>
          </View>
          <View style={styles.rightMeta}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.muted}>Invoice #: {invoiceNo}</Text>
            <Text style={styles.muted}>Order ref: {orderRef}</Text>
            <Text style={styles.muted}>Date: {issuedDate}</Text>
            <Text style={styles.muted}>Status: {orderStatusLabel(order.status)}</Text>
          </View>
        </View>

        <View style={styles.blockRow}>
          <View style={styles.address}>
            <Text style={styles.sectionTitle}>Bill to / Ship to</Text>
            {shippingAddressLines(ship).map((l) => (
              <Text key={l} style={styles.muted}>
                {l}
              </Text>
            ))}
          </View>
          <View style={styles.meta}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Subtotal</Text>
              <Text>{formatPricePdf(order.subtotalCents, order.currency)}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Delivery</Text>
              <Text>{order.shippingCents > 0 ? formatPricePdf(order.shippingCents, order.currency) : "—"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.metaLine}>
              <Text style={{ fontWeight: 700 }}>Total</Text>
              <Text style={{ fontWeight: 700 }}>{formatPricePdf(order.totalCents, order.currency)}</Text>
            </View>
          </View>
        </View>

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

        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsLine}>
              <Text style={styles.metaLabel}>Subtotal</Text>
              <Text>{formatPricePdf(order.subtotalCents, order.currency)}</Text>
            </View>
            <View style={styles.totalsLine}>
              <Text style={styles.metaLabel}>Delivery</Text>
              <Text>{order.shippingCents > 0 ? formatPricePdf(order.shippingCents, order.currency) : "—"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalsLine}>
              <Text style={{ fontWeight: 700 }}>Total</Text>
              <Text style={{ fontWeight: 700 }}>{formatPricePdf(order.totalCents, order.currency)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          {latestPayment ? (
            <Text style={styles.muted}>
              Payment: {paymentStatusLabel(latestPayment.status)} · {paymentMethodLabel(latestPayment.method)} ·{" "}
              {formatPricePdf(latestPayment.amountCents, latestPayment.currency)}
            </Text>
          ) : (
            <Text style={styles.muted}>Payment: —</Text>
          )}
          <Text style={{ marginTop: 6 }}>Thank you for your order.</Text>
        </View>

        <View style={styles.pageFooter} fixed>
          <Text>Invoice {invoiceNo}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export function OrderInvoicePdfContent() {
  const params = useParams();
  const pathname = usePathname();
  const orderId = typeof params.orderId === "string" ? (params.orderId as Id<"orders">) : null;
  const { isLoading, isAuthenticated, sessionToken } = useAuth();
  const router = useRouter();

  const storefront = useQuery(api.settings.storefrontSettings);
  const data = useQuery(api.orders.getWithItems, orderId && sessionToken ? { orderId, sessionToken } : "skip");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/account/orders")}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const storeName = storefront?.storeName?.trim() || "Ells Import";
  const supportEmail =
    storefront && "supportEmail" in storefront && typeof storefront.supportEmail === "string"
      ? storefront.supportEmail.trim() || null
      : null;

  const eligible = useMemo(() => {
    if (!data) return false;
    const { order, latestPayment } = data;
    return Boolean(order.invoiceNumber) && isInvoiceEligibleStatus(order.status) && latestPayment?.status === "completed";
  }, [data]);

  const filename = useMemo(() => {
    const order = data?.order;
    if (!order) return "invoice.pdf";
    return `invoice-${order.invoiceNumber ?? order.publicCode ?? order._id}.pdf`;
  }, [data]);

  const doc = useMemo(() => {
    if (!data) return null;
    return (
      <InvoicePdfDocument
        storeName={storeName}
        supportEmail={supportEmail}
        order={data.order}
        items={data.items}
        latestPayment={data.latestPayment}
      />
    );
  }, [data, storeName, supportEmail]);

  async function download() {
    if (!doc || !data) return;
    setDownloadError(null);
    setIsDownloading(true);
    try {
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  }

  if (!orderId) {
    return <p className="text-muted-foreground text-sm">Invalid order.</p>;
  }

  if (isLoading || !isAuthenticated || !sessionToken) {
    return <AccountPageSkeleton />;
  }

  if (data === undefined || storefront === undefined) {
    return <AccountPageSkeleton />;
  }

  if (data === null) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">We couldn&apos;t load this order, or you don&apos;t have access.</p>
        <Link href="/account/orders" className="text-foreground text-sm font-medium underline-offset-4 hover:underline">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-foreground text-lg font-semibold">Invoice PDF</p>
          {!eligible ? (
            <p className="text-muted-foreground text-xs">
              Invoice PDF becomes available after payment is confirmed (Paid or beyond).
            </p>
          ) : null}
          {downloadError ? <p className="text-destructive text-xs">{downloadError}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href={`/account/orders/${orderId}`}>Back to order</Link>
          </Button>
          <Button type="button" onClick={() => void download()} disabled={!eligible || isDownloading || !doc}>
            {isDownloading ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="border-border overflow-hidden rounded-xl border bg-card">
        {doc ? (
          <PDFViewer style={{ width: "100%", height: "75vh" }} showToolbar>
            {doc}
          </PDFViewer>
        ) : (
          <div className="p-6">
            <AccountPageSkeleton />
          </div>
        )}
      </div>
    </div>
  );
}

export function PublicInvoicePdfContent() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : null;

  const storefront = useQuery(api.settings.storefrontSettings);
  const data = useQuery(api.invoiceShares.getInvoiceByToken, token ? { token } : "skip");

  const storeName = storefront?.storeName?.trim() || "Ells Import";
  const supportEmail =
    storefront && "supportEmail" in storefront && typeof storefront.supportEmail === "string"
      ? storefront.supportEmail.trim() || null
      : null;

  const filename = useMemo(() => {
    const order = data?.order;
    if (!order) return "invoice.pdf";
    return `invoice-${order.invoiceNumber ?? order.publicCode ?? order._id}.pdf`;
  }, [data]);

  const doc = useMemo(() => {
    if (!data) return null;
    return (
      <InvoicePdfDocument
        storeName={storeName}
        supportEmail={supportEmail}
        order={data.order}
        items={data.items}
        latestPayment={data.latestPayment}
      />
    );
  }, [data, storeName, supportEmail]);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function download() {
    if (!doc) return;
    setDownloadError(null);
    setIsDownloading(true);
    try {
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  }

  if (!token) {
    return <p className="text-muted-foreground text-sm">Invalid invoice link.</p>;
  }

  if (data === undefined || storefront === undefined) {
    return <AccountPageSkeleton />;
  }

  if (data === null) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          This invoice link is invalid or has expired.
        </p>
        <p className="text-muted-foreground text-xs">
          Please contact support to request a new invoice link.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-foreground text-lg font-semibold">Invoice PDF</p>
          {downloadError ? <p className="text-destructive text-xs">{downloadError}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void download()} disabled={isDownloading || !doc}>
            {isDownloading ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="border-border overflow-hidden rounded-xl border bg-card">
        {doc ? (
          <PDFViewer style={{ width: "100%", height: "75vh" }} showToolbar>
            {doc}
          </PDFViewer>
        ) : (
          <div className="p-6">
            <AccountPageSkeleton />
          </div>
        )}
      </div>
    </div>
  );
}

