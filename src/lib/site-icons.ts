/**
 * Storefront PWA / favicon PNGs live under `public/icons/`.
 * After replacing those files, bump `SITE_ICONS_CACHE_BUSTER` and the same
 * `?v=` query on each icon `src` in `public/manifest.json`, and on
 * `SITE_ICON_*_CACHED` below (used in layout metadata only — not with `next/image`).
 */
export const SITE_ICONS_CACHE_BUSTER = "4";

/** Use with `next/image` — query strings are not allowed on local `Image` src without extra config. */
export const SITE_ICON_192_PLAIN = "/icons/icon-192.png";
export const SITE_ICON_512_PLAIN = "/icons/icon-512.png";

const q = `?v=${SITE_ICONS_CACHE_BUSTER}`;

/** For `<link rel="icon">` / apple icons in metadata (cache bust). */
export const SITE_ICON_192_CACHED = `${SITE_ICON_192_PLAIN}${q}`;
export const SITE_ICON_512_CACHED = `${SITE_ICON_512_PLAIN}${q}`;
