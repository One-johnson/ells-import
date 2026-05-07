import { SearchResultsSkeleton } from "@/components/search/search-results-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
      <Skeleton className="h-6 w-28" />
      <div className="mt-4">
        <SearchResultsSkeleton />
      </div>
    </div>
  );
}
