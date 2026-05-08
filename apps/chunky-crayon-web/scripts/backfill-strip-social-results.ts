/**
 * One-shot — backfill socialPostResults for a strip whose status was
 * manually flipped (so the auto-post route's success-path didn't write
 * the per-platform media IDs).
 *
 * Usage:
 *   pnpm tsx scripts/backfill-strip-social-results.ts <slug> <platform=mediaId> ...
 *
 * Example:
 *   pnpm tsx scripts/backfill-strip-social-results.ts weekend-smudge-mops-the-whole-weekend-2026-05-08 \
 *     instagram=18460624969108659 \
 *     facebook=122212163924370229 \
 *     pinterest=970455419721453268
 */
import { db } from '@one-colored-pixel/db';
import { buildComicStripCaption } from '@/lib/comic-strip/captions';

type PlatformResult = {
  success: boolean;
  mediaId?: string;
  caption: string;
  postedAt?: string;
};

async function main() {
  const args = process.argv.slice(2);
  const slug = args[0];
  if (!slug) {
    console.error(
      'usage: pnpm tsx scripts/backfill-strip-social-results.ts <slug> <platform=mediaId> ...',
    );
    process.exit(1);
  }
  const pairs = args.slice(1).map((a) => {
    const [platform, mediaId] = a.split('=');
    if (!platform || !mediaId)
      throw new Error(`bad pair (expected platform=mediaId): ${a}`);
    return { platform, mediaId };
  });
  if (pairs.length === 0) {
    console.error('no platform=mediaId pairs supplied');
    process.exit(1);
  }

  const strip = await db.comicStrip.findUnique({ where: { slug } });
  if (!strip) {
    console.error(`no strip with slug=${slug}`);
    process.exit(1);
  }

  const captionInput = {
    title: strip.title,
    baseCaption: strip.caption ?? strip.title,
    theme: strip.theme,
  };

  const existing =
    (strip.socialPostResults as Record<string, PlatformResult> | null) ?? {};
  const merged: Record<string, PlatformResult> = { ...existing };

  for (const { platform, mediaId } of pairs) {
    if (
      platform !== 'instagram' &&
      platform !== 'facebook' &&
      platform !== 'pinterest'
    ) {
      throw new Error(`unsupported platform: ${platform}`);
    }
    merged[platform] = {
      success: true,
      mediaId,
      caption: buildComicStripCaption(platform, captionInput),
      postedAt: (strip.postedAt ?? new Date()).toISOString(),
    };
    console.log(`[backfill] ${platform} -> ${mediaId}`);
  }

  await db.comicStrip.update({
    where: { id: strip.id },
    data: { socialPostResults: merged },
  });

  console.log(`[backfill] Wrote socialPostResults for slug=${slug}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
