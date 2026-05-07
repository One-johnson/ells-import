export function CartPageSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-4 max-w-sm animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded-lg border bg-muted/40" />
      <div className="h-20 animate-pulse rounded-lg border bg-muted/40" />
    </div>
  );
}
