'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@one-colored-pixel/db';
import { requireAdmin } from '@/lib/auth-guards';

/**
 * Toggle the `featuredForOG` flag on a coloring image. Used by the
 * /admin/images grid heart/star button.
 *
 * The flag controls which images get picked for the homepage + /start
 * OG collage (see lib/og/data.ts). Toggling is idempotent — we set
 * directly to the requested value rather than reading-then-flipping, so
 * concurrent admin clicks settle deterministically.
 *
 * Note: changes here don't immediately update the live OG. The cron at
 * /api/cron/regenerate-og rebuilds the R2 PNG once a day; call the
 * regenerateOGNow action after batch-flagging to refresh sooner.
 */
export const setFeaturedForOG = async (
  coloringImageId: string,
  featured: boolean,
): Promise<{ ok: true } | { error: string }> => {
  await requireAdmin('notFound');

  try {
    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: { featuredForOG: featured },
    });
  } catch (err) {
    console.error('[setFeaturedForOG] failed:', err);
    return { error: 'Failed to update flag' };
  }

  revalidatePath('/admin/images');
  return { ok: true };
};

/**
 * Trigger an immediate OG regeneration via the existing cron endpoint.
 * Lets admins push featured changes live without waiting for the daily
 * 02:00 UTC cron run. Uses fetch with the cron auth header rather than
 * importing the cron handler directly because the cron route depends on
 * Node-only APIs (Buffer/R2 SDK) that we want isolated to that file.
 */
export const regenerateOGNow = async (): Promise<
  { ok: true; results: unknown } | { error: string }
> => {
  await requireAdmin('notFound');

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return { error: 'CRON_SECRET not configured' };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.chunkycrayon.com';

  try {
    const res = await fetch(`${baseUrl}/api/cron/regenerate-og`, {
      headers: { authorization: `Bearer ${cronSecret}` },
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok) {
      return { error: `cron returned ${res.status}: ${JSON.stringify(json)}` };
    }
    return { ok: true, results: json };
  } catch (err) {
    console.error('[regenerateOGNow] failed:', err);
    return {
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};
