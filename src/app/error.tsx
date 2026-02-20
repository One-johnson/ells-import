"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-destructive/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-destructive/5 blur-3xl" />
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

        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-8" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Something went wrong
        </h1>
        <p className="mt-3 text-muted-foreground">
          We hit an unexpected error. You can try again or head back to the home page.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            onClick={reset}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="size-4" />
            Try again
          </Button>
          <Button asChild className="gap-2 bg-[#5c4033] hover:bg-[#4a3328] dark:bg-[#8b6914] dark:hover:bg-[#7a5c12]">
            <Link href="/">
              <Home className="size-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
