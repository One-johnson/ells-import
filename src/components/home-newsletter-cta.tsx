import Link from "next/link";

export function HomeNewsletterCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-border bg-[#5c4033]/5 dark:bg-[#8b6914]/10 px-6 py-10 text-center sm:px-12 sm:py-14">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Stay in the loop
        </h2>
        <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground">
          Get early access to new arrivals and exclusive offers. No spam, just the good stuff.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            disabled
            className="flex h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground/70 disabled:opacity-60"
          />
          <button
            type="button"
            disabled
            className="rounded-lg bg-[#5c4033] px-5 py-2.5 text-sm font-medium text-[#f5f0e8] opacity-70 cursor-not-allowed dark:bg-[#8b6914]"
          >
            Notify me
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Newsletter signup will be available soon.
        </p>
      </div>
    </section>
  );
}
