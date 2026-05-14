import { Skeleton } from "@/components/ui/skeleton";

export function WishlistPageSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-3 w-28" />
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5">
        <li>
          <div className="overflow-hidden rounded-xl border shadow-sm">
            <div className="flex flex-col gap-3 p-4 sm:flex-row">
              <Skeleton className="aspect-square w-full max-w-[6.25rem] shrink-0 rounded-xl sm:max-w-[8.5rem]" />
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-20" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Skeleton className="h-9 w-full sm:flex-1" />
                  <Skeleton className="h-9 w-full sm:flex-1" />
                </div>
              </div>
            </div>
          </div>
        </li>
        <li className="hidden lg:block">
          <div className="overflow-hidden rounded-xl border shadow-sm">
            <div className="flex flex-col gap-3 p-4 sm:flex-row">
              <Skeleton className="aspect-square w-full max-w-[6.25rem] shrink-0 rounded-xl sm:max-w-[8.5rem]" />
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Skeleton className="h-9 w-full sm:flex-1" />
                  <Skeleton className="h-9 w-full sm:flex-1" />
                </div>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}
