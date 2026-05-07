/**
 * Use on table body row click: if this returns true, do not open a details panel
 * (click originated from a checkbox, button, link, or other control).
 */
export function shouldIgnoreRowOpenDetails(target: EventTarget | null) {
  if (target == null || !(target instanceof Element)) {
    return false;
  }
  return Boolean(
    target.closest(
      "button, a, input, textarea, label, [role=checkbox], [data-slot=dropdown-menu-trigger], [data-slot=select-trigger]",
    ),
  );
}
