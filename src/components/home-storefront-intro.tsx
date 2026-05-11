"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";

export function HomeStorefrontIntro() {
  const s = useQuery(api.settings.storefrontSettings);
  const name = s?.storeName?.trim();
  const blurb = s?.storeTagline?.trim();
  const supportEmail = s?.supportEmail?.trim();

  return (
    <section className="mt-6 sm:mt-8">
      {name ? (
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">{name}</h1>
      ) : null}
      {blurb ? (
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">{blurb}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link href="/shop">Shop now</Link>
        </Button>
        <Button variant="outline" asChild size="lg">
          <Link href="/#best-sellers">Best sellers</Link>
        </Button>
        <Button variant="outline" asChild size="lg">
          <Link href="/#trending">Trending</Link>
        </Button>
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
