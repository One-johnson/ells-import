import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | Ell's Import",
  description: "Terms of use for Ell's Import – rules and guidelines for using our website and services.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Terms of Use
      </h1>
      <p className="mt-2 text-muted-foreground">
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="prose prose-neutral mt-10 dark:prose-invert max-w-none">
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Agreement</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using Ell&apos;s Import (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) website and services, you agree to be bound by these Terms of Use. If you do not agree, please do not use our services.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Use of Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            You agree to use our website and services only for lawful purposes. You may not use our site to transmit harmful code, attempt unauthorized access, harass others, or violate any applicable laws. We reserve the right to suspend or terminate access for conduct we deem inappropriate.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Orders and Payment</h2>
          <p className="text-muted-foreground leading-relaxed">
            All orders are subject to availability and acceptance. We reserve the right to refuse or cancel orders. Prices are as displayed at the time of order; we may correct pricing errors. Payment is due at checkout. By placing an order, you represent that you are authorized to use the payment method provided.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Shipping and Delivery</h2>
          <p className="text-muted-foreground leading-relaxed">
            Shipping times and costs are estimates and may vary. Risk of loss and title pass to you upon delivery to the carrier. We are not responsible for delays caused by carriers or events outside our control.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Returns and Refunds</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our return and refund policy is published on our website and may vary by product. You must comply with any stated instructions (e.g., condition, timeframe) to be eligible for a refund or exchange.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Account</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you create an account, you are responsible for keeping your credentials secure and for all activity under your account. You must provide accurate information and update it as needed.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            All content on this site (text, logos, images, design) is owned by Ell&apos;s Import or its licensors and is protected by copyright and other laws. You may not copy, modify, or use our content for commercial purposes without our written permission.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Disclaimer</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our website and services are provided &quot;as is.&quot; We do not warrant that the site will be uninterrupted or error-free. To the fullest extent permitted by law, we disclaim warranties and limit our liability for indirect, incidental, or consequential damages.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Changes</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update these terms from time to time. Continued use of our services after changes constitutes acceptance of the revised terms. We encourage you to review this page periodically.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about these Terms of Use, please contact us through our website or the contact details in the footer.
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
