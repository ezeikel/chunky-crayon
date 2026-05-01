'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@one-colored-pixel/db';
import { requireAdmin } from '@/lib/auth-guards';
import { regenerateOGImages } from '@/lib/og/regenerate';

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
 * Trigger an OG regeneration. Returns immediately so the action stays
 * under the 10s server-action timeout — the actual render+upload work
 * (~17s) runs via `after()`, which Vercel keeps alive past the response.
 *
 * The user sees an instant "regeneration started" toast. The R2 PNG
 * actually updates ~20s later. They re-scrape Meta's debugger after
 * the toast and Meta will pick up the fresh image.
 */
export const regenerateOGNow = async (): Promise<
  { ok: true } | { error: string }
> => {
  await requireAdmin('notFound');

  after(async () => {
    try {
      const results = await regenerateOGImages();
      const failed = Object.entries(results)
        .filter(([, r]) => r.error)
        .map(([k, r]) => `${k}: ${r.error}`);
      if (failed.length > 0) {
        console.error('[regenerateOGNow] partial failure:', failed.join('; '));
      } else {
        console.log('[regenerateOGNow] done', results);
      }
    } catch (err) {
      console.error('[regenerateOGNow] failed:', err);
    }
  });

  return { ok: true };
};
