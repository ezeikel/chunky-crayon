import { NextRequest, NextResponse } from 'next/server';
import { regenerateOGImages } from '@/lib/og/regenerate';

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
 *
 * The actual render+upload work lives in lib/og/regenerate.ts so the
 * admin "Regenerate OG now" server action can call it directly without
 * an HTTP round trip.
 */
export const GET = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const results = await regenerateOGImages();
  const ok = Object.values(results).every((r) => !r.error);
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 500 });
};
