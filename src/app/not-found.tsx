import Link from "next/link";
import Image from "next/image";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#5c4033]/5 dark:bg-[#8b6914]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[#5c4033]/5 dark:bg-[#8b6914]/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center text-center max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Image
            src="/logo-source.png"
            alt="Ell's Import"
            width={120}
            height={48}
            className="h-10 w-auto object-contain"
          />
        </Link>

        <p className="text-8xl font-bold tracking-tighter text-[#5c4033]/20 dark:text-[#8b6914]/30 select-none">
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Page not found
        </h1>
        <p className="mt-3 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#5c4033] px-5 py-3 text-sm font-medium text-[#f5f0e8] transition-colors hover:bg-[#4a3328] dark:bg-[#8b6914] dark:hover:bg-[#7a5c12]"
          >
            <Home className="size-4" />
            Back to home
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Search className="size-4" />
            Browse shop
          </Link>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Return to Ell&apos;s Import
        </Link>
      </div>
    </div>
  );
}
