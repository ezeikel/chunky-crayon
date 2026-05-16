/**
 * Per-site configuration for an Astro satellite (routinecharts.com et al.).
 *
 * Every consuming app defines its own `src/site.config.ts` exporting one
 * `SiteConfig`. All shared chrome (Sanity client, queries, analytics, blog
 * helpers, cron handler) is parameterised by this object so the package
 * stays site-agnostic and the apps stay thin.
 */
export type SiteConfig = {
  /** Stable slug used for Sanity `siteSlug` filtering + analytics `app` tag. */
  slug: string;
  /** Human-readable site name (e.g. "Routine Charts"). */
  name: string;
  /** Bare apex domain (e.g. "routinecharts.com"). */
  domain: string;
  /** Short marketing tagline (used in shared layouts later). */
  tagline: string;
  /** Brand theme color hex (e.g. "#f97316"). */
  themeColor: string;
  /** utm_source value for outbound chunkycrayon.com links. */
  ccUtmSource: string;
  /** Sanity project id (e.g. "zeezp95x"). */
  sanityProjectId: string;
  /** Sanity dataset (e.g. "routinecharts"). */
  sanityDataset: string;
  /** Nav label for the tool/home link (defaults to "Builder"). */
  navToolLabel?: string;
};

/**
 * Derive the brand CSS-var palette from a single themeColor hex.
 * BaseLayout sets these as inline custom properties on <html>; global.css
 * maps them onto Tailwind `brand` color tokens. One hex in siteConfig →
 * a usable scale (base / strong / dark / light tint / tint border).
 */
const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const v =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")}`;

/** Mix toward black (amount<0) or white (amount>0), amount in [-1,1]. */
const shade = (hex: string, amount: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
};

export type BrandPalette = {
  brand: string;
  brandStrong: string;
  brandDark: string;
  brandTint: string;
  brandTintBorder: string;
};

export const brandPalette = (themeColor: string): BrandPalette => ({
  brand: themeColor,
  brandStrong: shade(themeColor, -0.12),
  brandDark: shade(themeColor, -0.32),
  brandTint: shade(themeColor, 0.92),
  brandTintBorder: shade(themeColor, 0.82),
});

/** Inline `style` string for <html> setting the brand CSS vars. */
export const brandStyleVars = (themeColor: string): string => {
  const p = brandPalette(themeColor);
  return [
    `--brand:${p.brand}`,
    `--brand-strong:${p.brandStrong}`,
    `--brand-dark:${p.brandDark}`,
    `--brand-tint:${p.brandTint}`,
    `--brand-tint-border:${p.brandTintBorder}`,
  ].join(";");
};
