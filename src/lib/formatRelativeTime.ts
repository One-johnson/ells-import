/** Locale-aware relative time (e.g. "3 days ago") using `Intl.RelativeTimeFormat`. */
export function formatRelativeTime(fromMs: number, nowMs = Date.now()): string {
  const diffSec = Math.round((fromMs - nowMs) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60) {
    return rtf.format(diffSec, "second");
  }
  if (abs < 3600) {
    return rtf.format(Math.round(diffSec / 60), "minute");
  }
  if (abs < 86400) {
    return rtf.format(Math.round(diffSec / 3600), "hour");
  }
  if (abs < 604800) {
    return rtf.format(Math.round(diffSec / 86400), "day");
  }
  if (abs < 2629800) {
    return rtf.format(Math.round(diffSec / 604800), "week");
  }
  if (abs < 31557600) {
    return rtf.format(Math.round(diffSec / 2629800), "month");
  }
  return rtf.format(Math.round(diffSec / 31557600), "year");
}
