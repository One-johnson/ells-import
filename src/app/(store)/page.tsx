import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Ell&apos;s Import
      </h1>
      <p className="mt-3 max-w-md text-center text-muted-foreground">
        Quality imports, delivered to your door.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/sign-in"
          className="rounded-lg border border-input bg-background px-6 py-3 text-center text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-lg bg-[#5c4033] px-6 py-3 text-center text-sm font-medium text-[#f5f0e8] hover:bg-[#4a3328] dark:bg-[#8b6914] dark:hover:bg-[#7a5c12] transition-colors"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
