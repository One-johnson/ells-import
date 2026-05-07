import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using the Ells Import online store.",
};

export default function TermsOfServicePage() {
  return (
    <div className="text-foreground mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
      <p className="text-muted-foreground text-sm">
        <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
          ← Home
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        <strong className="text-foreground">Ells Import</strong> — Last updated:{" "}
        <time dateTime="2026-05-06">6 May 2026</time>
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed sm:text-[15px]">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">1. Agreement</h2>
          <p className="text-muted-foreground">
            These Terms of Service (“Terms”) govern your access to and use of the Ells Import website, account features,
            checkout, and related services (collectively, the “Services”). By creating an account, placing an order, or
            otherwise using the Services, you agree to these Terms and to our{" "}
            <Link href="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            . If you do not agree, do not use the Services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">2. Eligibility and account</h2>
          <p className="text-muted-foreground">
            You must be at least the age of majority in your jurisdiction and able to enter a binding contract. You are
            responsible for keeping your login credentials confidential and for all activity under your account. Notify us
            promptly via the contact details in the site footer if you suspect unauthorised access.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">3. Products, pricing, and stock</h2>
          <p className="text-muted-foreground">
            We strive to display accurate descriptions, images, and prices. Minor deviations (colour, dimensions, or
            packaging) may occur. Prices are shown in the currency indicated at checkout. We may correct pricing or
            description errors before acceptance of an order; if we discover an error after payment coordination has
            begun, we will contact you to agree a remedy (for example adjustment or refund). Products are offered subject
            to availability; if an item becomes unavailable after checkout, we will notify you and refund or replace as
            agreed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">4. Orders and acceptance</h2>
          <p className="text-muted-foreground">
            When you submit an order through our checkout, you make an offer to purchase. We accept the order when we
            confirm it in our systems (for example by issuing an order reference and processing it for fulfilment).
            Risk of loss for goods passes in accordance with the delivery arrangements we agree. You must provide
            accurate delivery information; we are not liable for delay or failed delivery caused by incorrect details.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">5. Payment</h2>
          <p className="text-muted-foreground">
            Payment may be coordinated as described at checkout (for example via Mobile Money, bank transfer, or
            messaging through WhatsApp). You agree to pay the total amount shown for your order, including applicable
            delivery fees we disclose before you place the order. Until we record your payment as completed and update
            your order status accordingly, fulfilment may be delayed. You must use only lawful payment methods and funds
            you are authorised to use. If we integrate card or wallet providers in the future, their terms will also
            apply to that part of the transaction.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">6. Delivery</h2>
          <p className="text-muted-foreground">
            Delivery times are estimates unless we expressly guarantee a date. Delays may occur due to carriers,
            weather, customs, or events outside our reasonable control. Title to products passes as agreed at handover to
            the carrier or to you, according to the shipping method we confirm. You are responsible for import duties
            or taxes where applicable.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">7. Cancellations, returns, and refunds</h2>
          <p className="text-muted-foreground">
            <strong className="text-foreground">Before dispatch:</strong> You may request cancellation by contacting us
            as soon as possible. If we have not yet dispatched and no third-party rights prevent cancellation, we will
            cancel and refund any payment we have confirmed received, using the original payment path where practicable.
          </p>
          <p className="text-muted-foreground">
            <strong className="text-foreground">Defective or wrong item:</strong> Contact us within seven (7) days of
            delivery with photos and your order reference. Where we verify a defect or our error, we will offer repair,
            replacement, or refund as appropriate.
          </p>
          <p className="text-muted-foreground">
            <strong className="text-foreground">Change of mind:</strong> Unless otherwise required by law, discretionary
            returns for non-defective products must be requested within seven (7) days of delivery, with items unused,
            in original packaging where reasonable, and suitable for resale. Certain categories (hygiene-sensitive,
            personalised, or digital goods) may be non-returnable — we will state exceptions at purchase where relevant.
            Refunds for approved returns are processed after we receive and inspect the goods.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">8. Reviews and conduct</h2>
          <p className="text-muted-foreground">
            You may not misuse the Services: no unlawful, harassing, fraudulent, or automated scraping activity; no
            interference with security; no impersonation. We may moderate or remove reviews or content that violate law
            or these Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">9. Intellectual property</h2>
          <p className="text-muted-foreground">
            All content on the Services (excluding content you upload) is owned by Ells Import or its licensors. You may
            not copy, modify, or distribute it without permission except as allowed by law or for personal, non-commercial
            browsing.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">10. Disclaimers</h2>
          <p className="text-muted-foreground">
            The Services are provided “as is” and “as available” without warranties of any kind, whether express or
            implied, including merchantability, fitness for a particular purpose, or non-infringement, to the fullest
            extent permitted by law. We do not warrant uninterrupted or error-free operation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">11. Limitation of liability</h2>
          <p className="text-muted-foreground">
            To the maximum extent permitted by applicable law, Ells Import and its officers, employees, and suppliers will
            not be liable for indirect, incidental, special, consequential, or punitive damages, or loss of profits, data,
            or goodwill. Our aggregate liability for claims arising from the Services or these Terms is limited to the
            greater of (a) the amount you paid to us for the specific order giving rise to the claim in the six (6)
            months before the claim, or (b) where no order applies, one hundred Ghana Cedis (GHS 100). Nothing in these
            Terms limits liability that cannot be limited under mandatory law (including death or personal injury caused
            by negligence where the law forbids exclusion).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">12. Indemnity</h2>
          <p className="text-muted-foreground">
            You will defend and indemnify Ells Import against claims, damages, losses, and expenses (including
            reasonable legal fees) arising from your breach of these Terms, misuse of the Services, or violation of law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">13. Suspension and termination</h2>
          <p className="text-muted-foreground">
            We may suspend or terminate access to the Services for breach of these Terms, risk to security, or as
            required by law. You may stop using the Services at any time. Provisions that by nature should survive
            (including intellectual property, disclaimers, limitations, and disputes) will survive termination.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">14. Governing law and disputes</h2>
          <p className="text-muted-foreground">
            These Terms are governed by the laws of the Republic of Ghana, without regard to conflict-of-law rules. Courts
            in Ghana shall have non-exclusive jurisdiction, subject to any mandatory consumer protections where you
            reside.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">15. Changes</h2>
          <p className="text-muted-foreground">
            We may modify these Terms by posting an updated version on this page and changing the “Last updated” date.
            Continued use after changes constitutes acceptance of the revised Terms where permitted by law. If you do not
            agree, discontinue use of the Services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">16. Contact</h2>
          <p className="text-muted-foreground">
            Questions about these Terms: use the email and WhatsApp links in the site footer, or the official business
            contact published for Ells Import.
          </p>
        </section>
      </div>
    </div>
  );
}
