import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Ells Import collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="text-foreground mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
      <p className="text-muted-foreground text-sm">
        <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
          ← Home
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        <strong className="text-foreground">Ells Import</strong> — Last updated:{" "}
        <time dateTime="2026-05-06">6 May 2026</time>
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed sm:text-[15px]">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">1. Who we are</h2>
          <p className="text-muted-foreground">
            Ells Import (“we”, “us”, “our”) operates this website and online store. We are the data controller for personal
            information processed when you use our services, unless we state otherwise. You can reach us using the
            contact options shown in the site footer (email and WhatsApp) or the details we publish on this site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">2. Scope</h2>
          <p className="text-muted-foreground">
            This policy describes how we handle information when you browse our storefront, create an account, place or
            manage orders, pay via the channels we offer (including coordination through WhatsApp), contact support, or
            otherwise interact with our website and related services. It does not cover third-party websites, apps, or
            payment providers you may use outside our control.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">3. Information we collect</h2>
          <p className="text-muted-foreground">We may collect and process the following categories of information:</p>
          <ul className="text-muted-foreground list-inside list-disc space-y-2 pl-1 marker:text-foreground">
            <li>
              <strong className="text-foreground">Account details:</strong> email address, name, password (stored using
              industry-standard hashing — we do not store your password in plain text), optional profile fields you
              provide, and role (for example customer or admin).
            </li>
            <li>
              <strong className="text-foreground">Order and transaction data:</strong> products purchased, quantities,
              prices, currency, order references, shipping and billing addresses you submit, optional order notes,
              delivery fees, order status history, and records associated with payments (for example payment status and
              method recorded in our systems when you complete checkout or when we confirm a payment).
            </li>
            <li>
              <strong className="text-foreground">Communications:</strong> messages you send through support channels,
              notifications we send relating to your account or orders, and similar correspondence.
            </li>
            <li>
              <strong className="text-foreground">WhatsApp and off-site coordination:</strong> when you choose to
              contact us on WhatsApp (including via pre-filled links from an order), your phone number and message
              content are processed by Meta/WhatsApp under their terms and privacy policy. We receive whatever you send
              us there and may link it to your order using the order reference or other details you provide.
            </li>
            <li>
              <strong className="text-foreground">Technical and usage data:</strong> IP address and browser or device
              characteristics as handled by our hosting and backend providers; timestamps of actions; diagnostic and
              security logs as needed to operate the service.
            </li>
            <li>
              <strong className="text-foreground">Locally stored preferences:</strong> your browser may store a session
              or token after login, theme preference (light/dark/system), and similar settings to improve your
              experience.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">4. How we use your information</h2>
          <p className="text-muted-foreground">We use personal information to:</p>
          <ul className="text-muted-foreground list-inside list-disc space-y-2 pl-1 marker:text-foreground">
            <li>Create and secure your account and authenticate you.</li>
            <li>Process orders, arrange delivery, calculate totals, and update inventory.</li>
            <li>Record and reconcile payments and reduce fraud or abuse.</li>
            <li>Communicate with you about orders, delivery, support, and lawful marketing where permitted.</li>
            <li>Improve our website, fix errors, and analyse aggregate usage.</li>
            <li>Comply with law, respond to lawful requests, and enforce our terms.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">5. Legal bases (where applicable)</h2>
          <p className="text-muted-foreground">
            Depending on your location, we rely on one or more of: <strong className="text-foreground">performance of a
            contract</strong> (fulfilling orders and accounts); <strong className="text-foreground">legitimate
            interests</strong> (security, service improvement, and proportionate marketing);{" "}
            <strong className="text-foreground">consent</strong> where we ask for it (for example optional messages or
            non-essential cookies, if we use them); and <strong className="text-foreground">legal obligation</strong>{" "}
            where the law requires us to retain or disclose data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">6. How we store and protect data</h2>
          <p className="text-muted-foreground">
            We use reputable cloud infrastructure to run our store. Customer and order data for this application is
            processed using Convex (database and server-side functions) and is transmitted over encrypted connections
            (HTTPS / TLS) in normal operation. Access to administrative functions is restricted. While we implement
            reasonable safeguards, no online service can guarantee perfect security; you use the service at your own risk
            as further described in our{" "}
            <Link href="/terms" className="font-medium text-foreground underline-offset-4 hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">7. Retention</h2>
          <p className="text-muted-foreground">
            We retain information for as long as your account is active, as needed to complete orders and meet legal,
            tax, and accounting requirements, and to resolve disputes. Order and payment records may be kept for several
            years where the law requires. When retention periods end, we delete or anonymise data where feasible.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">8. Sharing and processors</h2>
          <p className="text-muted-foreground">
            We do not sell your personal information. We share data with service providers who process it on our
            instructions (“processors”), such as our database/backend host, website host, and communications
            providers. We may disclose information if required by law, to protect rights and safety, or as part of a
            business transfer subject to appropriate safeguards. Messaging through WhatsApp is subject to Meta’s
            policies and infrastructure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">9. International transfers</h2>
          <p className="text-muted-foreground">
            Our providers may store or process data in countries other than Ghana. Where transfers are required, we rely
            on appropriate mechanisms recognised by applicable law (such as standard contractual clauses or equivalent).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">10. Your rights</h2>
          <p className="text-muted-foreground">
            Subject to local law, you may have the right to access, correct, delete, or export your personal data; to
            restrict or object to certain processing; and to withdraw consent where processing is based on consent. You
            may also lodge a complaint with a supervisory authority. To exercise rights, contact us using the footer
            contact details. We may need to verify your identity before fulfilling requests.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">11. Cookies and similar technologies</h2>
          <p className="text-muted-foreground">
            We use cookies and browser storage as needed for authentication sessions, preferences, and (where enabled)
            progressive web app behaviour. You can control cookies through your browser settings; disabling essential
            cookies may prevent login or checkout from working correctly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">12. Children</h2>
          <p className="text-muted-foreground">
            Our store is not directed at children under 16 (or the minimum age in your jurisdiction). We do not knowingly
            collect personal information from children. If you believe we have, please contact us and we will take
            appropriate steps.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">13. Changes</h2>
          <p className="text-muted-foreground">
            We may update this policy from time to time. We will post the revised version on this page and update the
            “Last updated” date. Material changes may be communicated by email or a notice on the site where appropriate.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">14. Contact</h2>
          <p className="text-muted-foreground">
            For privacy questions or requests, use the email and WhatsApp links in the site footer, or write to the
            business address we provide for Ells Import correspondence.
          </p>
        </section>
      </div>
    </div>
  );
}
