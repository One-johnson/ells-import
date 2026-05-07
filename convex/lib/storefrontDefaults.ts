/**
 * Fallbacks when app settings rows are missing. Override anytime in Admin → Store settings.
 * WhatsApp: wa.me/<digits> (country code + number, no +).
 */
export const DEFAULT_WHATSAPP_NUMBER_DIGITS = "233553301044";

export const DEFAULT_PAYMENT_INSTRUCTIONS = `PAYMENT — Ells Import (GHS)

1. Complete checkout and note your order number (# shown on the confirmation page).
2. Use “Pay on WhatsApp” on your order — send your order # and the exact total.
3. We accept MTN MoMo, Telecel Cash, AirtelTigo Money, and bank transfer. We’ll confirm wallet or bank details in the chat if needed.
4. After you pay, reply with PAID and attach a screenshot of the transaction when possible. We’ll verify and mark your order as paid.

WhatsApp: +233 553 301 044 (same line you use to message us after ordering).`;
