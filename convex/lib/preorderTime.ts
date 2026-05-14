/** Ghana uses GMT (UTC+0); round closes end of 28th UTC. */

export function monthKeyFromUtcDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(now: number = Date.now()): string {
  return monthKeyFromUtcDate(new Date(now));
}

/** Last instant of the 28th in UTC for that calendar month. */
export function closesAtUtcForMonthKey(monthKey: string): number {
  const parts = monthKey.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    throw new Error(`Invalid monthKey: ${monthKey}`);
  }
  return Date.UTC(y, m - 1, 28, 23, 59, 59, 999);
}

export function nextMonthKey(monthKey: string): string {
  const parts = monthKey.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    throw new Error(`Invalid monthKey: ${monthKey}`);
  }
  const d = new Date(Date.UTC(y, m, 1));
  return monthKeyFromUtcDate(d);
}

export function roundLabelForMonthKey(monthKey: string): string {
  const parts = monthKey.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return monthKey;
  }
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}
