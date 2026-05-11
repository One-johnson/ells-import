import { Skeleton } from "@/components/ui/skeleton";

/** Matches `HeroCarousel` min height and control dots for a stable layout shift. */
export function HeroCarouselSkeleton() {
  return (
    <div className="relative w-full" aria-hidden>
      <div className="overflow-hidden rounded-none sm:rounded-lg">
        <Skeleton className="min-h-[min(36vh,20rem)] w-full rounded-none sm:min-h-[min(60vh,28rem)] sm:rounded-lg" />
      </div>
      <div className="mt-3 flex justify-center gap-1.5 sm:mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-1.5 w-1.5 rounded-full" />
        ))}
      </div>
    </div>
  );
}
