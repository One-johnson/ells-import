import { Skeleton } from "@/components/ui/skeleton";

export function AccountPageSkeleton() {
  return (
    <div
      className="from-muted/30 via-background to-background mx-auto max-w-lg space-y-6 bg-gradient-to-b px-4 pb-12 pt-6 md:space-y-8 md:rounded-xl md:py-10"
      aria-hidden
    >
      <Skeleton className="h-3 w-24" />

      <div className="flex flex-col items-center">
        <Skeleton className="size-24 shrink-0 rounded-full border-4 border-transparent shadow-xl ring-4 ring-muted/40" />
        <Skeleton className="mt-5 h-8 w-44" />
        <Skeleton className="mt-2 h-4 w-56" />
        <Skeleton className="mt-3 h-6 w-20 rounded-full" />
        <Skeleton className="mt-2 h-3 w-48" />
      </div>

      <Skeleton className="h-3 w-20" />

      <div className="border-border rounded-xl border p-5 shadow-sm">
        <div className="flex gap-3">
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full max-w-xs" />
          </div>
        </div>
        <Skeleton className="mt-4 h-10 w-full rounded-md" />
      </div>

      <Skeleton className="h-3 w-16" />

      <div className="rounded-2xl bg-blue-600/90 p-5 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Skeleton className="size-14 shrink-0 rounded-2xl bg-white/25" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36 bg-white/30" />
            <Skeleton className="h-4 w-full max-w-xs bg-white/20" />
          </div>
        </div>
      </div>

      <Skeleton className="h-3 w-28" />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-muted/80 p-5 shadow-sm">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-2 h-4 w-44" />
          <Skeleton className="mt-4 h-14 w-full rounded-lg" />
          <Skeleton className="mt-3 h-3 w-full max-w-[220px]" />
        </div>

        <div className="rounded-xl border border-emerald-700/30 bg-gradient-to-br from-emerald-600 to-emerald-900 p-5 shadow-lg">
          <div className="flex gap-3">
            <Skeleton className="size-11 shrink-0 rounded-xl bg-white/20" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40 bg-white/30" />
              <Skeleton className="h-4 w-full max-w-sm bg-white/15" />
            </div>
          </div>
        </div>
      </div>

      <div className="border-border space-y-2 border-t pt-6">
        <Skeleton className="h-10 w-full rounded-md sm:max-w-[200px]" />
      </div>
    </div>
  );
}
