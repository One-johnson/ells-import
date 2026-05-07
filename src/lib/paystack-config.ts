/**
 * Paystack placeholder for a future integration (server-side secret stays in Convex env).
 * Add `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` when implementing the hosted checkout flow.
 */
export function readPaystackPublicKey(): string | undefined {
  const k = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY?.trim();
  return k || undefined;
}

export const PAYSTACK_SETUP_HINT =
  "When you enable Paystack: set Convex env PAYSTACK_SECRET_KEY, add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to this app, implement the webhook in convex/http.ts, then set app setting checkout_payment_channel to paystack.";
