import { cn } from "@/lib/utils";

type Props = {
  stock: number;
  initialStock?: number;
  className?: string;
};

/**
 * Remaining inventory as a fraction of `initialStock` (or current `stock` if unset).
 * Track = soft green “capacity”; fill = darker green that shrinks as stock drops.
 */
export function StockProgressBar({ stock, initialStock, className }: Props) {
  const baseline = Math.max(1, Math.floor(initialStock ?? stock));
  const pct = Math.max(0, Math.min(100, Math.round((stock / baseline) * 100)));

  const fillClass =
    pct <= 15
      ? "bg-red-500 dark:bg-red-400"
      : pct <= 35
        ? "bg-amber-500 dark:bg-amber-400"
        : "bg-emerald-600 dark:bg-emerald-500";

  return (
    <div className={cn("w-full", className)}>
      <div
        className="border-emerald-500/20 bg-emerald-500/15 ring-emerald-500/10 relative h-2 w-full overflow-hidden rounded-full border ring-1 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:ring-emerald-500/20"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Stock remaining about ${pct} percent`}
      >
        <div
          className={cn(
            "shadow-emerald-900/15 h-full min-w-0 rounded-full shadow-inner transition-[width] duration-300 ease-out",
            fillClass,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
