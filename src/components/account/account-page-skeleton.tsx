import { Skeleton } from "@/components/ui/skeleton";

export function AccountPageSkeleton() {
  return (
    <div
      className="from-muted/30 via-background to-background mx-auto max-w-lg space-y-8 bg-gradient-to-b px-4 pb-12 pt-6 md:rounded-xl md:py-10"
      aria-hidden
    >
      <div className="flex flex-col items-center">
        <Skeleton className="size-24 shrink-0 rounded-full border-4 border-transparent shadow-xl ring-4 ring-muted/40" />
        <Skeleton className="mt-5 h-8 w-44" />
        <Skeleton className="mt-2 h-4 w-56" />
        <Skeleton className="mt-3 h-6 w-20 rounded-full" />
      </div>

      <div className="rounded-2xl bg-blue-600/90 p-5 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Skeleton className="size-14 shrink-0 rounded-2xl bg-white/25" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36 bg-white/30" />
            <Skeleton className="h-4 w-full max-w-xs bg-white/20" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-muted/80 p-6 shadow-sm">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-2 h-4 w-52" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}
