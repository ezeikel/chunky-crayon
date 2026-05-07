'use server';

/**
 * Comic-strip server actions — admin-only triggers.
 *
 * The actual generation pipeline lives on the Hetzner worker
 * (apps/chunky-crayon-worker/src/comic-strip/pipeline.ts). The web app
 * just fires HTTP triggers and returns immediately. Mirrors the
 * /api/cron/comic-strip route's fire-and-forget pattern.
 *
 * triggerComicStripGeneration → POSTs to worker /generate/comic-strip,
 *   returns 202 in <1s. Worker runs the pipeline async (~14 min).
 *
 * triggerComicStripPost → POSTs to /api/social/comic-strip-post for a
 *   given platform. This one IS synchronous (~5-90s depending on
 *   platform) so the admin can see the result inline.
 */

import { revalidatePath, revalidateTag } from 'next/cache';
import { auth } from '@/auth';
import { ADMIN_EMAILS } from '@/constants';
import { db } from '@one-colored-pixel/db';
import { del as r2Delete } from '@one-colored-pixel/storage';

const requireAdminAction = async (): Promise<void> => {
  const session = await auth();
  const email = session?.user?.email;
  const isAdmin =
    session?.user?.role === 'ADMIN' ||
    (!!email && ADMIN_EMAILS.includes(email));
  if (!isAdmin) throw new Error('admin only');
};

export type TriggerResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export const triggerComicStripGeneration = async (): Promise<TriggerResult> => {
  await requireAdminAction();

  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl)
    return { ok: false, error: 'CHUNKY_CRAYON_WORKER_URL not set' };

  try {
    const res = await fetch(`${workerUrl}/generate/comic-strip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        ok: false,
        error: `worker rejected: ${res.status} ${body.slice(0, 200)}`,
      };
    }
    return {
      ok: true,
      message:
        'Generation started. ~14 minutes until the strip lands. Refresh this page to see it.',
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
};

export type TriggerPostResult =
  | {
      ok: true;
      stripId: string;
      slug: string;
      platforms: Record<
        string,
        { success: boolean; mediaId?: string; error?: string }
      >;
    }
  | { ok: false; error: string };

export type RerollStripResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Re-roll: delete the given strip (DB + R2 assets) and immediately
 * trigger a fresh generation. Only allowed when the strip has NOT been
 * posted — once it's out on social, re-rolling is meaningless.
 */
export const rerollComicStrip = async (
  stripId: string,
): Promise<RerollStripResult> => {
  await requireAdminAction();
  if (!stripId) return { ok: false, error: 'stripId required' };

  // Guard against re-rolling a posted strip — silently dangerous.
  const strip = await db.comicStrip.findUnique({ where: { id: stripId } });
  if (!strip) return { ok: false, error: 'strip not found' };
  if (strip.status === 'POSTED') {
    return {
      ok: false,
      error: 'cannot re-roll a strip that has already been posted',
    };
  }

  const deleteResult = await deleteComicStrip(stripId);
  if (!deleteResult.ok) {
    return { ok: false, error: `delete failed: ${deleteResult.error}` };
  }

  const triggerResult = await triggerComicStripGeneration();
  if (!triggerResult.ok) {
    return {
      ok: false,
      error: `deleted, but worker trigger failed: ${triggerResult.error}`,
    };
  }
  return { ok: true, message: triggerResult.message };
};

export type DeleteStripResult =
  | { ok: true; deletedAssets: number }
  | { ok: false; error: string };

export const deleteComicStrip = async (
  stripId: string,
): Promise<DeleteStripResult> => {
  await requireAdminAction();
  if (!stripId) return { ok: false, error: 'stripId required' };

  try {
    const strip = await db.comicStrip.findUnique({ where: { id: stripId } });
    if (!strip) return { ok: false, error: 'strip not found' };

    const urls = [
      strip.panel1Url,
      strip.panel2Url,
      strip.panel3Url,
      strip.panel4Url,
      strip.assembledUrl,
    ].filter((u): u is string => !!u);

    let deleted = 0;
    for (const url of urls) {
      try {
        await r2Delete(url);
        deleted += 1;
      } catch (err) {
        // Best-effort — don't block the DB delete on a stuck R2 object
        console.warn(
          `[deleteComicStrip] r2 delete failed for ${url}:`,
          err instanceof Error ? err.message : 'unknown',
        );
      }
    }

    await db.comicStrip.delete({ where: { id: stripId } });
    revalidatePath('/admin/comic-strips');
    revalidatePath('/[locale]/admin/comic-strips', 'page');
    // Invalidate public-facing caches so the deleted strip vanishes from
    // /comics, /comics/[slug] and the home-page card. Cheap if the strip
    // was never POSTED — there's nothing in those caches to evict.
    revalidateTag('comics-list', { expire: 0 });
    revalidateTag(`comic-strip-${strip.slug}`, { expire: 0 });
    return { ok: true, deletedAssets: deleted };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
};

export const triggerComicStripPost = async (
  platform?: 'instagram' | 'facebook' | 'pinterest',
  stripId?: string,
): Promise<TriggerPostResult> => {
  await requireAdminAction();

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000';
  const proto = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  const params = new URLSearchParams();
  if (platform) params.set('platform', platform);
  if (stripId) params.set('id', stripId);

  try {
    const res = await fetch(
      `${proto}/api/social/comic-strip-post?${params.toString()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(300_000),
      },
    );
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        ok: false,
        error:
          data.error ??
          `post route returned ${res.status}: ${JSON.stringify(data).slice(0, 200)}`,
      };
    }
    return {
      ok: true,
      stripId: data.stripId,
      slug: data.slug,
      platforms: data.platforms,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
};
