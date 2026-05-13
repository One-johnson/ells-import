const DEFAULT_PUBLIC_SITE_URL = "https://ells-import-5ejo.vercel.app/";

function withTrailingSlash(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return DEFAULT_PUBLIC_SITE_URL;
  }
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

/**
 * Canonical public storefront URL (invites, native share `url`, etc.).
 * Set `NEXT_PUBLIC_SITE_URL` in `.env.local` or the host dashboard (no trailing slash required).
 */
export function getPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    return withTrailingSlash(raw);
  }
  return DEFAULT_PUBLIC_SITE_URL;
}
