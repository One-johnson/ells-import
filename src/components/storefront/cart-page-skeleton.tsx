export function CartPageSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-3 w-28 animate-pulse rounded bg-muted" />
      <div className="overflow-hidden rounded-xl border shadow-sm">
        <div className="h-24 animate-pulse border-b bg-muted/30" />
        <div className="h-24 animate-pulse border-b bg-muted/30" />
        <div className="h-24 animate-pulse bg-muted/30" />
      </div>
      <div className="h-28 animate-pulse rounded-xl border bg-muted/40" />
    </div>
  );
}
