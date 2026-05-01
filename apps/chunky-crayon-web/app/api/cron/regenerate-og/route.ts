import { NextRequest, NextResponse } from 'next/server';
import { put } from '@one-colored-pixel/storage';
import { renderStartOGImageResponse } from '@/lib/og/renders/start';
import { renderHomepageOGImageResponse } from '@/lib/og/renders/homepage';
import { getTranslationsForLocale } from '@/i18n/messages';

export const maxDuration = 60;

/**
 * Pre-renders the homepage + /start OG images and uploads them to R2 so
 * external scrapers (Meta especially) get a fast static asset rather
 * than a 15s on-demand Satori render. Meta times out at ~5s on its first
 * scrape, then caches the timeout response — that's how /start ads were
 * showing as blank cards in production.
 *
 * The dynamic file-convention OG routes still exist as a fallback; the
 * `og:image` meta tag points at the R2 URL, but if that 404s the
 * convention route generates on-demand.
 *
 * Schedule: daily at 02:00 UTC (cheap; collage doesn't need to update
 * faster than that). Triggered manually via curl with `Authorization:
 * Bearer $CRON_SECRET` to seed after deploy or after a copy change.
 */

const OG_PATHS = {
  homepage: 'og/homepage.png',
  start: 'og/start.png',
} as const;

const fetchPngBuffer = async (response: Response): Promise<Buffer> => {
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export const GET = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const results: Record<string, { url?: string; error?: string }> = {};

  // Homepage OG — uses 'en' tagline. Other locales fall back to dynamic
  // generator (low traffic, OK to be slower there).
  try {
    const homepageT = (getTranslationsForLocale('en') as any).og.homepage;
    const homepageResponse = await renderHomepageOGImageResponse(
      homepageT.tagline,
    );
    const homepageBuffer = await fetchPngBuffer(homepageResponse);
    const { url } = await put(OG_PATHS.homepage, homepageBuffer, {
      contentType: 'image/png',
      allowOverwrite: true,
    });
    results.homepage = { url };
  } catch (err) {
    console.error('[regenerate-og] homepage failed:', err);
    results.homepage = {
      error: err instanceof Error ? err.message : 'unknown',
    };
  }

  // Start OG — fixed copy, no locale parameter
  try {
    const startResponse = await renderStartOGImageResponse();
    const startBuffer = await fetchPngBuffer(startResponse);
    const { url } = await put(OG_PATHS.start, startBuffer, {
      contentType: 'image/png',
      allowOverwrite: true,
    });
    results.start = { url };
  } catch (err) {
    console.error('[regenerate-og] start failed:', err);
    results.start = { error: err instanceof Error ? err.message : 'unknown' };
  }

  const ok = Object.values(results).every((r) => !r.error);
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 500 });
};
