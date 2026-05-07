/** Normalize stored product `description` (used as specs) into bullet lines for display. */
export function descriptionToSpecLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*•·]\s*/, "").replace(/^\d+[.)]\s+/, "").trim())
    .filter(Boolean);
}

/** Short preview for cards: first bullets joined. */
export function descriptionToSpecPreview(text: string, maxParts = 2): string {
  const lines = descriptionToSpecLines(text);
  if (lines.length === 0) {
    return text.trim();
  }
  return lines.slice(0, maxParts).join(" · ");
}
