export function ShopGridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {["a", "b", "c"].map((k) => (
          <div key={k} className="bg-muted h-7 w-24 animate-pulse rounded-full" />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-hidden>
        {["a", "b", "c", "d", "e", "f"].map((k) => (
          <li key={k} className="min-w-0">
            <div className="border-border overflow-hidden rounded-lg border">
              <div className="bg-muted aspect-[4/3] w-full animate-pulse" />
              <div className="space-y-2 p-3">
                <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
                <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
