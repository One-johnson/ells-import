"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { digitsOnlyForWaMe, whatsappMeUrl } from "@/lib/whatsapp";

const DEFAULT_NAME = "Ells Import";

export function SiteFooter() {
  const s = useQuery(api.settings.storefrontSettings);
  const year = new Date().getFullYear();
  const name = s?.storeName?.trim() || DEFAULT_NAME;
  const email = s?.supportEmail?.trim();
  const waDigits = digitsOnlyForWaMe(s?.whatsappNumber ?? null);
  const whatsappHref = waDigits
    ? whatsappMeUrl(
        waDigits,
        `Hello ${name}! I have a question about an order or a product.`,
      )
    : null;

  return (
    <footer className="bg-muted/20 border-t mt-auto print:hidden">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:py-8">
        <p>
          © {year} {name}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
          <Link
            href="/privacy"
            className="text-foreground w-fit font-medium underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-foreground w-fit font-medium underline-offset-4 hover:underline"
          >
            Terms of Service
          </Link>
          {email ? (
            <a
              href={`mailto:${encodeURIComponent(email)}`}
              className="text-foreground w-fit font-medium underline-offset-4 hover:underline"
            >
              {email}
            </a>
          ) : null}
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground inline-flex w-fit items-center gap-2 font-medium underline-offset-4 hover:underline"
            >
              <WhatsAppIcon className="size-5 shrink-0" />
              Chat on WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
