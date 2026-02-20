import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support | Ell's Import",
  description: "Help and support for Ell's Import – orders, returns, and FAQs.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Support
      </h1>
      <p className="mt-2 text-muted-foreground">
        Need help? We&apos;re here for you. Find answers below or get in touch.
      </p>

      <div className="prose prose-neutral mt-10 dark:prose-invert max-w-none">
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Orders &amp; shipping</h2>
          <p className="text-muted-foreground leading-relaxed">
            Track your order, check shipping times, and manage deliveries from your <Link href="/orders" className="text-[#5c4033] hover:underline dark:text-[#c9a227]">Orders</Link> page. Shipping times and costs are shown at checkout.
          </p>
        </section>
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Returns &amp; refunds</h2>
          <p className="text-muted-foreground leading-relaxed">
            We offer hassle-free returns within 30 days on most items. See our policies on the product and checkout pages, or contact us for specific cases.
          </p>
        </section>
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Account &amp; security</h2>
          <p className="text-muted-foreground leading-relaxed">
            Update your profile, password, and preferences in your <Link href="/account" className="text-[#5c4033] hover:underline dark:text-[#c9a227]">Account</Link> settings. If you notice any suspicious activity, contact us right away.
          </p>
        </section>
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Still need help?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our team is available to assist you. Visit our <Link href="/contact" className="text-[#5c4033] hover:underline dark:text-[#c9a227]">Contact</Link> page to send a message or email us directly.
          </p>
        </section>
      </div>

      <p className="mt-12">
        <Link
          href="/"
          className="text-sm font-medium text-[#5c4033] hover:underline dark:text-[#c9a227]"
        >
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
