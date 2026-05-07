/** Human-facing 6-digit reference; avoid showing raw Convex document ids. */
export function publicRef(code: string | null | undefined) {
  const s = code?.trim();
  return s && s.length > 0 ? s : "—";
}
