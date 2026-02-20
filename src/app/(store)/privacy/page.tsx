import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Ell's Import",
  description: "Privacy policy for Ell's Import – how we collect, use, and protect your information.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Privacy Policy
      </h1>
      <p className="mt-2 text-muted-foreground">
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="prose prose-neutral mt-10 dark:prose-invert max-w-none">
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ell&apos;s Import (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy. This policy describes how we collect, use, and protect your personal information when you use our website and services.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            We may collect information you provide directly, including:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Name, email address, and phone number</li>
            <li>Shipping and billing address</li>
            <li>Account credentials and profile information</li>
            <li>Order history and preferences</li>
            <li>Communications with our support team</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            We also collect certain information automatically, such as device type, IP address, and browsing behavior, to improve our services and security.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">How We Use Your Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use your information to process orders, fulfill requests, send order and shipping updates, improve our website and products, prevent fraud, and communicate with you about promotions and news (with your consent where required).
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Cookies and Similar Technologies</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use cookies and similar technologies to maintain your session, remember your preferences, and analyze site traffic. You can manage cookie settings in your browser.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Sharing and Disclosure</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do not sell your personal information. We may share data with service providers who assist with payment processing, shipping, and analytics, under strict confidentiality agreements. We may also disclose information when required by law or to protect our rights and safety.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, or loss.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            Depending on your location, you may have the right to access, correct, delete, or port your data, and to object to or restrict certain processing. To exercise these rights or ask questions, please contact us.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-3">Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For privacy-related questions or requests, contact us through our website or at the contact details provided in the footer.
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
