/**
 * Social engagement stats — pulls likes/comments from Meta Graph API
 * for every CC IG/Facebook post in the last 30 days, then aggregates
 * by (platform, post type, post hour UTC, day-of-week).
 *
 * Goal: figure out the best UTC time to post each content type. Today's
 * cron schedule was set on intuition; this surfaces what actually
 * performs.
 *
 * Pinterest + TikTok engagement are NOT pulled — Pinterest needs a
 * separate API + analytics scope, TikTok's engagement endpoint isn't
 * granted to our app. Their `mediaId`s are just listed as "posted".
 *
 * Run from apps/chunky-crayon-web:
 *   pnpm tsx -r dotenv/config scripts/social-engagement-stats.ts
 */
import { db } from '@one-colored-pixel/db';

const FB_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const GRAPH_VERSION = 'v22.0';

if (!FB_TOKEN) {
  console.error('FACEBOOK_ACCESS_TOKEN not set');
  process.exit(1);
}

type PlatformResult = {
  success: boolean;
  mediaId?: string;
  caption?: string;
  postedAt?: string;
  error?: string;
};

type SocialPostResults = Record<string, PlatformResult>;

type RowEngagement = {
  imageId: string;
  postType: string;
  platform: 'instagram' | 'facebook' | 'pinterest' | 'tiktok';
  mediaId: string;
  postedAt: Date;
  hourUtc: number;
  dayOfWeek: number; // 0 = Sun
  likes: number | null;
  comments: number | null;
  // For reels / videos:
  views: number | null;
  // Caption length (signal for length-vs-engagement check)
  captionLength: number;
};

const platformOf = (postType: string): RowEngagement['platform'] | null => {
  if (postType.startsWith('instagram')) return 'instagram';
  if (postType.startsWith('facebook')) return 'facebook';
  if (postType.startsWith('pinterest')) return 'pinterest';
  if (postType.startsWith('tiktok')) return 'tiktok';
  return null;
};

// Stories don't return engagement via Graph API after they expire (24h).
// Skip them — we'd just get nulls everywhere.
const isStory = (postType: string): boolean =>
  postType.toLowerCase().includes('story');

const fetchInstagramEngagement = async (
  mediaId: string,
): Promise<{
  likes: number | null;
  comments: number | null;
  views: number | null;
}> => {
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}` +
    `?fields=like_count,comments_count,media_type,media_product_type` +
    `&access_token=${FB_TOKEN}`;
  const res = await fetch(url);
  const data = (await res.json().catch(() => ({}))) as {
    like_count?: number;
    comments_count?: number;
    media_type?: string;
    media_product_type?: string;
    error?: { message: string; code?: number };
  };
  if (!res.ok || data.error) {
    console.warn(
      `[ig] mediaId=${mediaId} fetch failed: ${data.error?.message ?? res.statusText}`,
    );
    return { likes: null, comments: null, views: null };
  }
  // Reels also support views via /insights, but that's a separate call.
  // Skip for now — the discriminator is media_type=VIDEO + media_product_type=REELS.
  return {
    likes: data.like_count ?? null,
    comments: data.comments_count ?? null,
    views: null,
  };
};

const fetchInstagramReelViews = async (
  mediaId: string,
): Promise<number | null> => {
  // /insights for reels: metric=plays for older API, ig_reels_video_view_total_time newer
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}/insights` +
    `?metric=plays&access_token=${FB_TOKEN}`;
  const res = await fetch(url);
  const data = (await res.json().catch(() => ({}))) as {
    data?: Array<{ name: string; values: Array<{ value: number }> }>;
    error?: { message: string };
  };
  if (!res.ok || data.error) return null;
  return data.data?.[0]?.values?.[0]?.value ?? null;
};

const fetchFacebookEngagement = async (
  mediaId: string,
  isVideo: boolean,
): Promise<{
  likes: number | null;
  comments: number | null;
  views: number | null;
}> => {
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}` +
    `?fields=likes.summary(true),comments.summary(true)` +
    `&access_token=${FB_TOKEN}`;
  const res = await fetch(url);
  const data = (await res.json().catch(() => ({}))) as {
    likes?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
    error?: { message: string };
  };
  if (!res.ok || data.error) {
    console.warn(
      `[fb] mediaId=${mediaId} fetch failed: ${data.error?.message ?? res.statusText}`,
    );
    return { likes: null, comments: null, views: null };
  }
  const likes = data.likes?.summary?.total_count ?? null;
  const comments = data.comments?.summary?.total_count ?? null;

  let views: number | null = null;
  if (isVideo) {
    // Try /insights for video views.
    const insightsUrl =
      `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}/video_insights` +
      `?metric=total_video_views&access_token=${FB_TOKEN}`;
    const ir = await fetch(insightsUrl);
    const id = (await ir.json().catch(() => ({}))) as {
      data?: Array<{ values?: Array<{ value: number }> }>;
    };
    views = id.data?.[0]?.values?.[0]?.value ?? null;
  }

  return { likes, comments, views };
};

const main = async () => {
  console.log('[stats] fetching CC rows from last 30d with socialPostResults…');

  const allRows = await db.coloringImage.findMany({
    where: {
      brand: 'CHUNKY_CRAYON',
      createdAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: {
      id: true,
      createdAt: true,
      socialPostResults: true,
      generationType: true,
      purposeKey: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter in-code — Prisma's JSON null filter is awkward; this is fine for
  // a 30d window which is at most ~120 rows.
  const rows = allRows.filter(
    (r) => r.socialPostResults && Object.keys(r.socialPostResults).length > 0,
  );

  console.log(`[stats] ${rows.length} rows have post results in window`);

  const engagements: RowEngagement[] = [];

  for (const row of rows) {
    const results = row.socialPostResults as SocialPostResults | null;
    if (!results) continue;

    for (const [postType, result] of Object.entries(results)) {
      if (!result.success || !result.mediaId || !result.postedAt) continue;
      if (isStory(postType)) continue; // skip stories — engagement decays in 24h

      const platform = platformOf(postType);
      if (!platform) continue;
      // Pinterest + TikTok engagement isn't fetched here.
      if (platform === 'pinterest' || platform === 'tiktok') {
        engagements.push({
          imageId: row.id,
          postType,
          platform,
          mediaId: result.mediaId,
          postedAt: new Date(result.postedAt),
          hourUtc: new Date(result.postedAt).getUTCHours(),
          dayOfWeek: new Date(result.postedAt).getUTCDay(),
          likes: null,
          comments: null,
          views: null,
          captionLength: result.caption?.length ?? 0,
        });
        continue;
      }

      const isVideo = /Reel|DemoReel/i.test(postType);
      const fetcher =
        platform === 'instagram'
          ? fetchInstagramEngagement
          : fetchFacebookEngagement;
      const eng =
        platform === 'instagram'
          ? await fetchInstagramEngagement(result.mediaId)
          : await fetchFacebookEngagement(result.mediaId, isVideo);

      // Reel views — extra IG-only call
      let views = eng.views;
      if (platform === 'instagram' && isVideo) {
        views = await fetchInstagramReelViews(result.mediaId);
      }

      engagements.push({
        imageId: row.id,
        postType,
        platform,
        mediaId: result.mediaId,
        postedAt: new Date(result.postedAt),
        hourUtc: new Date(result.postedAt).getUTCHours(),
        dayOfWeek: new Date(result.postedAt).getUTCDay(),
        likes: eng.likes,
        comments: eng.comments,
        views,
        captionLength: result.caption?.length ?? 0,
      });

      // Light rate-limit pacing — Graph API is ~200 calls/h/user, we have headroom.
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log(
    `\n[stats] fetched engagement for ${engagements.filter((e) => e.likes !== null).length} of ${engagements.length} posts (Pinterest/TikTok skipped, Stories skipped)\n`,
  );

  // Output 1: per-post breakdown — sortable
  console.log('=== Per-post engagement (last 30d) ===\n');
  const fmt = (e: RowEngagement) =>
    [
      e.postedAt.toISOString().slice(0, 16).replace('T', ' '),
      `h${String(e.hourUtc).padStart(2, '0')}`,
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][e.dayOfWeek],
      e.platform.padEnd(9),
      e.postType.padEnd(26),
      e.likes !== null ? `❤️ ${String(e.likes).padStart(4)}` : '❤️    -',
      e.comments !== null ? `💬 ${String(e.comments).padStart(3)}` : '💬   -',
      e.views !== null ? `▶️ ${String(e.views).padStart(5)}` : '',
    ].join('  ');

  for (const e of [...engagements].sort(
    (a, b) => b.postedAt.getTime() - a.postedAt.getTime(),
  )) {
    console.log(fmt(e));
  }

  // Output 2: aggregate by (platform, postType, hourUtc)
  console.log('\n=== Aggregate by post type + hour UTC ===\n');
  type Bucket = {
    platform: string;
    postType: string;
    hourUtc: number;
    n: number;
    likes: number;
    comments: number;
    views: number;
  };
  const buckets = new Map<string, Bucket>();
  for (const e of engagements) {
    if (e.likes === null) continue;
    const key = `${e.platform}|${e.postType}|${e.hourUtc}`;
    const cur = buckets.get(key) ?? {
      platform: e.platform,
      postType: e.postType,
      hourUtc: e.hourUtc,
      n: 0,
      likes: 0,
      comments: 0,
      views: 0,
    };
    cur.n += 1;
    cur.likes += e.likes ?? 0;
    cur.comments += e.comments ?? 0;
    cur.views += e.views ?? 0;
    buckets.set(key, cur);
  }
  const buckList = [...buckets.values()].sort(
    (a, b) =>
      a.platform.localeCompare(b.platform) ||
      a.postType.localeCompare(b.postType) ||
      a.hourUtc - b.hourUtc,
  );
  console.log(
    [
      'platform '.padEnd(11),
      'postType'.padEnd(26),
      'hour',
      ' n  ',
      'avg❤️',
      'avg💬',
      'avg▶️',
    ].join('  '),
  );
  for (const b of buckList) {
    console.log(
      [
        b.platform.padEnd(10),
        b.postType.padEnd(26),
        ` h${String(b.hourUtc).padStart(2, '0')}`,
        String(b.n).padStart(3),
        (b.likes / b.n).toFixed(1).padStart(5),
        (b.comments / b.n).toFixed(1).padStart(5),
        b.views > 0 ? (b.views / b.n).toFixed(0).padStart(5) : '   -',
      ].join('  '),
    );
  }

  // Output 3: aggregate by (platform, postType, dayOfWeek)
  console.log('\n=== Aggregate by post type + day of week ===\n');
  const dowBuckets = new Map<string, Bucket & { dow: number }>();
  for (const e of engagements) {
    if (e.likes === null) continue;
    const key = `${e.platform}|${e.postType}|${e.dayOfWeek}`;
    const cur = dowBuckets.get(key) ?? {
      platform: e.platform,
      postType: e.postType,
      hourUtc: 0,
      dow: e.dayOfWeek,
      n: 0,
      likes: 0,
      comments: 0,
      views: 0,
    };
    cur.n += 1;
    cur.likes += e.likes ?? 0;
    cur.comments += e.comments ?? 0;
    cur.views += e.views ?? 0;
    dowBuckets.set(key, cur);
  }
  const dowList = [...dowBuckets.values()].sort(
    (a, b) =>
      a.platform.localeCompare(b.platform) ||
      a.postType.localeCompare(b.postType) ||
      a.dow - b.dow,
  );
  for (const b of dowList) {
    console.log(
      [
        b.platform.padEnd(10),
        b.postType.padEnd(26),
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][b.dow],
        String(b.n).padStart(3),
        (b.likes / b.n).toFixed(1).padStart(5),
        (b.comments / b.n).toFixed(1).padStart(5),
        b.views > 0 ? (b.views / b.n).toFixed(0).padStart(5) : '   -',
      ].join('  '),
    );
  }

  await db.$disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
