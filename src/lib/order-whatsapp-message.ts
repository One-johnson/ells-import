import { formatPrice } from "@/lib/formatPrice";
import { publicRef } from "@/lib/public-ref";

export function buildOrderWhatsAppMessage(args: {
  orderPublicCode: string | null | undefined;
  totalCents: number;
  currency: string;
  customerName: string;
  storeName?: string | null;
  /** Defaults to “Total”; use e.g. “Shipping (CBM)” for second payment on pre-orders. */
  amountLabel?: string;
}) {
  const ref = publicRef(args.orderPublicCode);
  const amount = formatPrice(args.totalCents, args.currency);
  const label = args.amountLabel?.trim() || "Total";
  const brand = args.storeName?.trim() || "Ells Import";
  const name = args.customerName.trim() || "—";
  return (
    `Hello ${brand} — payment for order #${ref}\n\n` +
    `${label}: ${amount}\n` +
    `Name: ${name}\n\n` +
    `I have sent the payment (or I’m ready to pay—please confirm MoMo/bank details if needed).\n` +
    `Please confirm when received. Thank you.`
  );
}
