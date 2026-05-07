import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors admin layout (sidebar + header + scroll region) for auth and route loading. */
export function AdminShellSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 w-full !min-h-0 flex-1 flex-col gap-0 md:h-auto md:flex-row"
      style={{ ["--sidebar-width" as string]: "14rem" }}
    >
      <div
        className="bg-sidebar text-sidebar-foreground flex w-full min-w-0 flex-col border-r p-3 md:sticky md:top-0 md:h-svh md:w-[14rem] md:shrink-0"
        aria-hidden
      >
        <Skeleton className="h-6 w-24 rounded-md" />
        <div className="mt-6 flex flex-1 flex-col gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      </div>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <header className="bg-background/95 border-border flex h-12 shrink-0 items-center gap-2 border-b px-4 md:px-6">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-4 w-32" />
        </header>
        <div className="min-h-0 flex-1 overflow-hidden p-4 md:p-8">
          <AdminContentSkeleton />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for the main admin content pane (list/table pages). */
export function AdminContentSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="rounded-md border">
        {Array.from({ length: 8 }).map((_, r) => (
          <div
            key={r}
            className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
          >
            <Skeleton className="h-4 w-4 shrink-0" />
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="h-4 w-24 shrink-0" />
            <Skeleton className="h-7 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
