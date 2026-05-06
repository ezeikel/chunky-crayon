/**
 * Retry-failed-platforms cron — sweeps recently-published content reels
 * and re-posts to any platform where the prior attempt failed.
 *
 * Why a separate cron from /api/social/content-reel-post:
 *   The publish route is fire-once: it posts to whatever platforms the
 *   ?platform filter accepts and writes results to socialPostResults.
 *   If a platform was down (Pinterest auth, Meta rate limit, transient
 *   network), that single failure stays on the row forever unless we
 *   sweep + retry.
 *
 * Strategy:
 *   1. Find content_reels rows where postedAt is within the last 24h
 *      AND socialPostResults has at least one platform with success=false
 *   2. For each, identify the failed platforms
 *   3. Re-call /api/social/content-reel-post?platform=<X>&id=<row> per
 *      failed platform — the route's merge logic updates the row
 *      so a successful retry replaces the prior failure entry
 *
 * 24h window because: by the time a post is over a day old, retrying
 * adds little engagement value vs the noise of a late post showing up
 * out-of-order in a follower's feed.
 *
 * Cron schedule: hourly. Cheap (most hours: zero failures = no work).
 *
 * Auth: CRON_SECRET bearer.
 */
import { NextResponse } from 'next/server';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';

export const maxDuration = 300;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const PLATFORMS = ['instagram', 'facebook', 'pinterest'] as const;
type Platform = (typeof PLATFORMS)[number];

const RETRY_WINDOW_HOURS = 24;

const handle = async (request: Request): Promise<Response> => {
  const auth = request.headers.get('authorization');
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: corsHeaders },
    );
  }

  const cutoff = new Date(Date.now() - RETRY_WINDOW_HOURS * 60 * 60 * 1000);
  const candidates = await db.contentReel.findMany({
    where: {
      brand: BRAND,
      postedAt: { gte: cutoff },
      socialPostResults: { not: null as unknown as undefined },
    },
    orderBy: { postedAt: 'desc' },
  });

  type RetryAttempt = {
    reelId: string;
    platform: Platform;
    success: boolean;
    error?: string;
    mediaId?: string;
  };
  const attempts: RetryAttempt[] = [];

  for (const row of candidates) {
    const results = (row.socialPostResults ?? {}) as Record<
      string,
      { success?: boolean } | undefined
    >;

    const failedPlatforms = PLATFORMS.filter(
      (p) => results[p] && results[p]?.success === false,
    );

    if (failedPlatforms.length === 0) continue;

    console.log(
      `[retry-failed] ${row.id}: retrying ${failedPlatforms.join(', ')}`,
    );

    for (const platform of failedPlatforms) {
      try {
        const retryRes = await fetch(
          new URL(
            `/api/social/content-reel-post?platform=${platform}&id=${row.id}`,
            request.url,
          ).toString(),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              authorization: `Bearer ${process.env.CRON_SECRET}`,
            },
          },
        );
        const json = (await retryRes.json().catch(() => ({}))) as {
          results?: Record<string, { success?: boolean; mediaId?: string }>;
          errors?: string[];
        };
        const platformResult = json.results?.[platform];
        const success = platformResult?.success === true;
        attempts.push({
          reelId: row.id,
          platform,
          success,
          mediaId: platformResult?.mediaId,
          error: success ? undefined : json.errors?.join('; '),
        });
        console.log(
          `[retry-failed] ${row.id} ${platform}: ${success ? 'OK' : 'still-failing'}`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        attempts.push({
          reelId: row.id,
          platform,
          success: false,
          error: message,
        });
        console.error(`[retry-failed] ${row.id} ${platform}: ${message}`);
      }
    }
  }

  return NextResponse.json(
    {
      success: true,
      candidatesScanned: candidates.length,
      attempts,
    },
    { status: 200, headers: corsHeaders },
  );
};

export const GET = handle;
export const POST = handle;
