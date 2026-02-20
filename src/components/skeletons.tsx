import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Single line of text placeholder */
export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4 w-full max-w-[200px]", className)} />;
}

/** Multiple lines (e.g. paragraph) */
export function SkeletonParagraph({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4 w-full", i === lines - 1 && lines > 1 && "max-w-[75%]")}
        />
      ))}
    </div>
  );
}

/** Card-style block with optional header + content */
export function SkeletonCard({
  hasHeader = true,
  lines = 3,
  className,
}: {
  hasHeader?: boolean;
  lines?: number;
  className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-sm",
        className
      )}
    >
      {hasHeader && <Skeleton className="mb-4 h-6 w-1/3" />}
      <SkeletonParagraph lines={lines} />
    </div>
  );
}

/** Table skeleton: N rows × M cols */
export function SkeletonTable({
  rows = 5,
  cols = 4,
  showHeader = true,
  className,
}: {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
  className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      <table className="w-full table-fixed text-sm">
        {showHeader && (
          <thead className="border-b border-border bg-muted/30">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="h-10 px-4 text-left">
                  <Skeleton className="h-4 w-full max-w-[80px]" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border last:border-0">
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex} className="p-4">
                  <Skeleton
                    className="h-4 w-full"
                    style={{
                      maxWidth: colIndex === 0 ? 120 : 80 + (colIndex % 3) * 20,
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Stats card (e.g. dashboard KPI) */
export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-sm",
        className
      )}
    >
      <Skeleton className="mb-2 h-4 w-24" />
      <Skeleton className="h-8 w-20" />
    </div>
  );
}
