"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

function utcMonthStartMs(monthKey: string): number | null {
  const parts = monthKey.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return null;
  }
  return Date.UTC(y, m - 1, 1, 0, 0, 0, 0);
}

function clampPct(n: number) {
  return Math.min(100, Math.max(0, n));
}

export function formatRoundCountdown(remainingMs: number): string {
  if (remainingMs <= 0) {
    return "Closed";
  }
  const s = Math.floor(remainingMs / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) {
    return `${d}d ${h}h`;
  }
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${sec}s`;
  }
  return `${sec}s`;
}

type Props = {
  monthKey: string;
  closesAt: number;
  className?: string;
};

/**
 * Elapsed fraction of the calendar round window (month start UTC → closesAt), with live countdown.
 */
export function PreorderRoundProgress({ monthKey, closesAt, className }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const start = utcMonthStartMs(monthKey);
  const remainingMs = closesAt - now;

  let pct = 0;
  if (start !== null && closesAt > start) {
    pct = clampPct(((now - start) / (closesAt - start)) * 100);
  } else if (remainingMs <= 0) {
    pct = 100;
  }

  const fillClass =
    remainingMs <= 0
      ? "bg-muted-foreground/45"
      : pct >= 92
        ? "bg-red-500 dark:bg-red-400"
        : pct >= 75
          ? "bg-amber-500 dark:bg-amber-400"
          : "bg-sky-600 dark:bg-sky-500";

  const absClose = new Date(closesAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <div className={cn("w-full space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          Round closes
        </span>
        <span className="text-foreground text-[11px] font-semibold tabular-nums sm:text-xs">
          {formatRoundCountdown(remainingMs)}
        </span>
      </div>
      <div
        className="border-sky-500/15 bg-sky-500/10 ring-sky-500/10 relative h-1.5 w-full overflow-hidden rounded-full border ring-1 dark:border-sky-500/25 dark:bg-sky-950/40 dark:ring-sky-500/15"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Round progress ${Math.round(pct)} percent until close`}
      >
        <div
          className={cn(
            "shadow-sky-900/10 h-full min-w-0 rounded-full shadow-inner transition-[width] duration-700 ease-linear",
            fillClass,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-muted-foreground text-[10px] tabular-nums leading-tight">{absClose}</p>
    </div>
  );
}
