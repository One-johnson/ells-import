import { HeroCarouselSkeleton } from "@/components/storefront/hero-carousel-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="w-full max-w-full shrink-0">
        <HeroCarouselSkeleton />
      </div>
      <div className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-4 py-6 sm:py-8">
        <Skeleton className="h-6 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}
