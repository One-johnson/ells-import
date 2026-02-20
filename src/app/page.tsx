import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-source.png"
              alt="Ell's Import"
              width={120}
              height={48}
              className="h-10 w-auto object-contain"
            />
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
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
            className="rounded-lg bg-primary px-6 py-3 text-center text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Create account
          </Link>
        </div>
      </main>
    </div>
  );
}
