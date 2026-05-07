import { Skeleton } from "@/components/ui/skeleton";

export function SearchResultsSkeleton() {
  return (
    <ul className="divide-y rounded-lg border" role="status" aria-label="Loading results">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="px-4 py-3 first:pt-3 last:pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-5 w-48 max-w-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="mt-2 h-3 w-full max-w-xl" />
          <Skeleton className="mt-1 h-3 w-4/5 max-w-lg" />
        </li>
      ))}
    </ul>
  );
}
