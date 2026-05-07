"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";

const DEFAULT_NAME = "Ells Import";
const DEFAULT_COPY =
  "Quality imports, straightforward ordering, and support when you need it. Open the shop or search the catalog in seconds.";

export function HomeStorefrontIntro() {
  const s = useQuery(api.settings.storefrontSettings);
  const name = s?.storeName?.trim() || DEFAULT_NAME;
  const blurb = s?.storeTagline?.trim() || DEFAULT_COPY;
  const supportEmail = s?.supportEmail?.trim();

  return (
    <section className="mt-6 sm:mt-8">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">{name}</h1>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">{blurb}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link href="/shop">Shop the catalog</Link>
        </Button>
        <Button variant="outline" asChild size="lg">
          <Link href="/search">Search</Link>
        </Button>
        <p className="text-muted-foreground w-full text-sm sm:ml-1 sm:inline sm:w-auto">
          <Link
            className="text-foreground font-medium underline-offset-4 hover:underline"
            href="/register"
          >
            Create an account
          </Link>{" "}
          or{" "}
          <Link
            className="text-foreground font-medium underline-offset-4 hover:underline"
            href="/login"
          >
            sign in
          </Link>{" "}
          to use your cart and orders.
        </p>
      </div>
      {supportEmail ? (
        <p className="text-muted-foreground mt-6 text-xs sm:mt-8">
          Questions?{" "}
          <a
            href={`mailto:${encodeURIComponent(supportEmail)}`}
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            {supportEmail}
          </a>
        </p>
      ) : null}
    </section>
  );
}
