import { formatPrice } from "@/lib/formatPrice";
import { publicRef } from "@/lib/public-ref";

export function buildOrderWhatsAppMessage(args: {
  orderPublicCode: string | null | undefined;
  totalCents: number;
  currency: string;
  customerName: string;
  storeName?: string | null;
}) {
  const ref = publicRef(args.orderPublicCode);
  const amount = formatPrice(args.totalCents, args.currency);
  const brand = args.storeName?.trim() || "Ells Import";
  const name = args.customerName.trim() || "—";
  return (
    `Hello ${brand} — payment for order #${ref}\n\n` +
    `Total: ${amount}\n` +
    `Name: ${name}\n\n` +
    `I have sent the payment (or I’m ready to pay—please confirm MoMo/bank details if needed).\n` +
    `Please confirm when received. Thank you.`
  );
}
