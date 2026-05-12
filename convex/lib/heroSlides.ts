/** Normalized home hero slide for `heroSlides` query and carousel UI. */
export type NormalizedHeroSlide = {
  title: string;
  subtitle: string;
  imageUrl: string | null;
  /** Tailwind gradient classes when `imageUrl` is null */
  bgClassName: string;
  href: string | null;
  ctaLabel: string | null;
};

const GRADIENTS: Record<"slate" | "emerald" | "zinc" | "rose" | "blue", string> = {
  slate: "from-slate-900 via-slate-800 to-slate-900",
  emerald: "from-emerald-950 via-teal-900 to-cyan-950",
  zinc: "from-zinc-900 via-stone-800 to-amber-950/80",
  rose: "from-rose-950 via-rose-900 to-slate-950",
  blue: "from-blue-950 via-indigo-950 to-slate-900",
};

/** No built-in gradient slides — hero uses images only (JSON + products) for consistent height. */
const EMPTY_DEFAULT_SLIDES: NormalizedHeroSlide[] = [];

/** Max slides returned for the home hero (manual JSON first, then products). */
const MAX_HERO_CAROUSEL_SLIDES = 5;

function isSafeImageUrl(s: string): string | null {
  const t = s.trim();
  if (!t) {
    return null;
  }
  if (t.startsWith("/") && !t.startsWith("//")) {
    return t;
  }
  try {
    const u = new URL(t);
    if (u.protocol === "https:") {
      return u.href;
    }
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
      return u.href;
    }
  } catch {
    return null;
  }
  return null;
}

function isSafeHref(s: string): string | null {
  const t = s.trim();
  if (!t) {
    return null;
  }
  if (t.startsWith("/") && !t.startsWith("//")) {
    return t;
  }
  try {
    const u = new URL(t);
    if (u.protocol === "https:") {
      return u.href;
    }
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
      return u.href;
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeOne(raw: unknown): NormalizedHeroSlide | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (!title || title.length > 200) {
    return null;
  }
  const subtitle = typeof o.subtitle === "string" ? o.subtitle.trim().slice(0, 500) : "";
  const imageRaw = typeof o.imageUrl === "string" ? o.imageUrl : null;
  const imageUrl = imageRaw ? isSafeImageUrl(imageRaw) : null;
  const gKey =
    typeof o.gradient === "string" && o.gradient in GRADIENTS
      ? (o.gradient as keyof typeof GRADIENTS)
      : "slate";
  const bgClassName = GRADIENTS[gKey];
  const hrefRaw = typeof o.href === "string" ? o.href : null;
  const href = hrefRaw ? isSafeHref(hrefRaw) : null;
  const ctaRaw =
    typeof o.ctaLabel === "string" && o.ctaLabel.trim().length > 0
      ? o.ctaLabel.trim().slice(0, 40)
      : "";
  const ctaLabel = href && ctaRaw ? ctaRaw : null;

  return {
    title,
    subtitle,
    imageUrl,
    bgClassName,
    href,
    ctaLabel,
  };
}

/**
 * Build slides from admin JSON. Gradient-only entries (no `imageUrl`) are skipped so the
 * storefront hero stays image-only and a consistent height.
 */
export function getHeroSlidesFromJsonValue(value: string | null | undefined): {
  source: "config" | "default";
  slides: NormalizedHeroSlide[];
} {
  const raw = value?.trim();
  if (!raw) {
    return { source: "default", slides: EMPTY_DEFAULT_SLIDES };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { source: "default", slides: EMPTY_DEFAULT_SLIDES };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { source: "default", slides: EMPTY_DEFAULT_SLIDES };
  }
  const out: NormalizedHeroSlide[] = [];
  for (let i = 0; i < parsed.length && out.length < MAX_HERO_CAROUSEL_SLIDES; i++) {
    const s = normalizeOne(parsed[i]);
    if (s?.imageUrl) {
      out.push(s);
    }
  }
  if (out.length === 0) {
    return { source: "config", slides: [] };
  }
  return { source: "config", slides: out };
}

const MAX_HERO_SLIDES_TOTAL = MAX_HERO_CAROUSEL_SLIDES;

export type HeroProductCandidate = {
  name: string;
  slug: string;
  description?: string;
  priceCents: number;
  currency: string;
  thumbnailUrl: string;
};

/**
 * Append product-based slides after JSON/default slides until `MAX_HERO_SLIDES_TOTAL`.
 * Skips products whose product page is already linked from an earlier slide.
 */
export function mergeHeroSlidesWithProducts(
  base: { source: "config" | "default"; slides: NormalizedHeroSlide[] },
  products: HeroProductCandidate[],
): { source: "config" | "default"; slides: NormalizedHeroSlide[] } {
  const imageBaseSlides = base.slides.filter((s) => s.imageUrl != null && s.imageUrl !== "");
  const budget = Math.max(0, MAX_HERO_SLIDES_TOTAL - imageBaseSlides.length);
  if (budget === 0 || products.length === 0) {
    return { source: base.source, slides: imageBaseSlides.slice(0, MAX_HERO_SLIDES_TOTAL) };
  }

  const seenPaths = new Set<string>();
  for (const s of imageBaseSlides) {
    if (s.href?.startsWith("/products/")) {
      seenPaths.add(s.href);
    }
  }

  const productSlides: NormalizedHeroSlide[] = [];
  for (const p of products) {
    if (productSlides.length >= budget) {
      break;
    }
    const href = `/products/${encodeURIComponent(p.slug)}`;
    if (seenPaths.has(href)) {
      continue;
    }
    seenPaths.add(href);

    const priceLabel = `${(p.priceCents / 100).toFixed(2)} ${p.currency}`;
    const desc = p.description?.trim();
    const subtitle = (
      desc && desc.length > 0
        ? `${priceLabel} · ${desc.slice(0, 100)}${desc.length > 100 ? "…" : ""}`
        : priceLabel
    ).slice(0, 500);

    productSlides.push({
      title: p.name.slice(0, 200),
      subtitle,
      imageUrl: p.thumbnailUrl,
      bgClassName: GRADIENTS.slate,
      href,
      ctaLabel: "View product",
    });
  }

  return {
    source: base.source,
    slides: [...imageBaseSlides, ...productSlides].slice(0, MAX_HERO_SLIDES_TOTAL),
  };
}
