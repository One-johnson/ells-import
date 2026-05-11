"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  min = 0,
  max,
  disabled,
  onChange,
  className,
}: {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  className?: string;
}) {
  const v = Number.isFinite(value) ? Math.floor(value) : 0;
  const canDec = !disabled && v > min;
  const canInc = !disabled && (max === undefined || v < max);

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9"
        disabled={!canDec}
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, v - 1))}
      >
        <Minus className="size-4" aria-hidden />
      </Button>
      <div className="border-input bg-background flex h-9 min-w-12 items-center justify-center rounded-md border px-2 text-sm tabular-nums">
        {v}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9"
        disabled={!canInc}
        aria-label="Increase quantity"
        onClick={() => onChange(max === undefined ? v + 1 : Math.min(max, v + 1))}
      >
        <Plus className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

