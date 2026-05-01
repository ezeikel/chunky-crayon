/**
 * Build the R2 public URL for a pre-rendered OG image.
 *
 * The cron at /api/cron/regenerate-og uploads pre-rendered PNGs to these
 * paths so external scrapers (Meta especially) get a fast static asset
 * rather than the 15s on-demand Satori render. The dynamic
 * opengraph-image.tsx routes still exist as a fallback for first-deploy
 * windows or if the cron has not yet run.
 *
 * Returns null if R2_PUBLIC_URL isn't configured (dev without R2 setup);
 * callers should fall back to the dynamic generator route in that case.
 */
export const getOGImageUrl = (variant: 'homepage' | 'start'): string | null => {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) return null;
  const trimmed = base.replace(/\/$/, '');
  return `${trimmed}/og/${variant}.png`;
};
