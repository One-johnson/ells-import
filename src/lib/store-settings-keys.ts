/**
 * App settings keys (see `convex/settings.ts` → `storefrontSettings` and `heroSlides`).
 * Add rows under Admin → Store settings with these `key` values (or use the hero JSON editor).
 */
export const STORE_SETTING = {
  storeName: "store_name",
  storeTagline: "store_tagline",
  supportEmail: "support_email",
  announcementText: "announcement_text",
  /** JSON array: hero slides (title, subtitle, optional imageUrl, href, ctaLabel, gradient). */
  heroSlidesJson: "hero_slides_json",
  /** Optional: category `slug` — hero product slides are chosen only from this category. */
  heroCategorySlug: "hero_category_slug",
  /** E.164 without +, e.g. 233241234567 for WhatsApp checkout handoff. */
  whatsappNumber: "whatsapp_number",
  /** Shown on checkout: bank/MoMo instructions (plain text). */
  paymentInstructions: "payment_instructions",
  /** `whatsapp` (default) or `paystack` once Paystack is implemented. */
  checkoutPaymentChannel: "checkout_payment_channel",
  /** Integer string: flat delivery in minor units (e.g. pesewas), added at checkout for in-stock orders. */
  deliveryFeeCents: "delivery_fee_cents",
  /** Integer string: shipping in minor units per 1.0 CBM (pre-orders after arrival). */
  preorderShippingCentsPerCbm: "preorder_shipping_cents_per_cbm",
} as const;

export type StoreSettingKey = (typeof STORE_SETTING)[keyof typeof STORE_SETTING];
