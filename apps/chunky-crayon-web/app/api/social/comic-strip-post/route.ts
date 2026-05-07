/**
 * Comic-strip social post route.
 *
 * Reads the latest READY+unposted comic_strips row, builds a per-platform
 * caption, and posts to IG / FB / Pinterest. TikTok is manual — no
 * automated post path; the assets surface in the Posting Brief email so
 * we copy-paste them Sunday morning.
 *
 * Why a separate route from /api/social/post:
 *   /api/social/post is structured around a `coloringImage` row and is a
 *   2000+ line dispatcher. Comic strips live in their own table and post
 *   a different asset shape (4 panel PNGs + an assembled 2x2 PNG).
 *   Splitting keeps both paths simple. Same pattern as content-reel-post.
 *
 * Per-platform format:
 *   instagram → 5-slide carousel: 4 panels + assembled 2x2 strip
 *   facebook  → single image post of the assembled 2x2 strip
 *               (FB Pages have no true organic carousel — albums hide the
 *               joke behind a grid thumbnail; single image shows the whole
 *               strip at first scroll)
 *   pinterest → single pin of the assembled 2x2 strip
 *   tiktok    → MANUAL ONLY — surfaced in posting-brief email
 *
 * Query params:
 *   ?platform=instagram|facebook|pinterest    (optional, all if omitted)
 *   ?id=<comic-strip-id>                       (optional, latest if omitted)
 *
 * Auth: CRON_SECRET bearer token on cron path; no auth required for the
 * cron URL pattern Vercel uses (matches existing crons).
 */
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { db } from '@one-colored-pixel/db';
import {
  buildComicStripCaption,
  type ComicStripCaptionPlatform,
} from '@/lib/comic-strip/captions';
import { BRAND } from '@/lib/db';

export const maxDuration = 300;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const getPinterestApiUrl = () => {
  const useSandbox = process.env.PINTEREST_USE_SANDBOX === 'true';
  return useSandbox
    ? 'https://api-sandbox.pinterest.com'
    : 'https://api.pinterest.com';
};

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000,
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

// ── Instagram (carousel) ────────────────────────────────────────────────

const createIGImageContainerForCarousel = async (
  imageUrl: string,
): Promise<string> => {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        is_carousel_item: true,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );
  const data = await response.json();
  if (!data.id) {
    console.error('[ComicStrip/IG] image container error:', data);
    throw new Error(
      `failed to create IG image container: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

const createIGCarouselContainer = async (
  childIds: string[],
  caption: string,
): Promise<string> => {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );
  const data = await response.json();
  if (!data.id) {
    console.error('[ComicStrip/IG] carousel container error:', data);
    throw new Error(
      `failed to create IG carousel container: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

const publishIGMedia = async (creationId: string): Promise<string> => {
  const response = await fetchWithTimeout(
    `https://graph.facebook.com/v22.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
    30000,
  );
  const data = await response.json();
  if (!data.id) {
    console.error('[ComicStrip/IG] publish error:', data);
    throw new Error(`failed to publish IG media: ${JSON.stringify(data)}`);
  }
  return data.id;
};

const postInstagramCarousel = async (
  panelUrls: string[],
  caption: string,
): Promise<string> => {
  // 1. Create unpublished image containers for each slide.
  const childIds = await Promise.all(
    panelUrls.map(createIGImageContainerForCarousel),
  );
  // 2. Wrap them in a CAROUSEL container.
  const carouselId = await createIGCarouselContainer(childIds, caption);
  // 3. Publish.
  return publishIGMedia(carouselId);
};

// ── Facebook (single image of the assembled strip) ──────────────────────
// We considered a multi-photo album but Facebook's Page API doesn't have
// a true organic *swipeable* carousel — only paid ads do. Albums hide the
// punchline behind a grid thumbnail, while a single 2x2 strip image shows
// the whole joke at first scroll. Single-image wins for organic reach.

const postFacebookStripImage = async (
  imageUrl: string,
  message: string,
): Promise<string> => {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.FACEBOOK_PAGE_ID}/photos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        message,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );
  const data = await response.json();
  if (!data.id) {
    console.error('[ComicStrip/FB] photo post error:', data);
    throw new Error(`failed to post FB image: ${JSON.stringify(data)}`);
  }
  return data.id;
};

// ── Pinterest (single pin) ──────────────────────────────────────────────

const getPinterestAccessToken = async (): Promise<string> => {
  const dbToken = await db.apiToken.findUnique({
    where: { provider: 'pinterest' },
  });
  if (dbToken) return dbToken.accessToken;
  if (process.env.PINTEREST_ACCESS_TOKEN)
    return process.env.PINTEREST_ACCESS_TOKEN;
  throw new Error('Pinterest access token not configured');
};

const postPinterestImagePin = async (
  imageUrl: string,
  title: string,
  description: string,
  boardId: string,
): Promise<string> => {
  const accessToken = await getPinterestAccessToken();
  // Pinterest accepts an image_url directly for static pins — no upload
  // step needed (unlike video). Source type is image_url.
  const response = await fetch(`${getPinterestApiUrl()}/v5/pins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: boardId,
      media_source: {
        source_type: 'image_url',
        url: imageUrl,
      },
      title: title.slice(0, 100),
      description: description.slice(0, 500),
      link: 'https://chunkycrayon.com',
      alt_text: `${title} - Chunky Crayon weekly comic strip`,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error('[ComicStrip/Pin] pin error:', data);
    throw new Error(`Pinterest pin failed: ${JSON.stringify(data)}`);
  }
  return data.id;
};

// ── socialPostResults merging ───────────────────────────────────────────

type PlatformResult = {
  success: boolean;
  mediaId?: string;
  caption: string;
  postedAt?: string;
  error?: string;
};

const mergeSocialResults = (
  existing: unknown,
  updates: Partial<Record<ComicStripCaptionPlatform, PlatformResult>>,
): Record<string, PlatformResult> => {
  const base =
    existing && typeof existing === 'object' && existing !== null
      ? (existing as Record<string, PlatformResult>)
      : {};
  return { ...base, ...updates };
};

// ── Handler ─────────────────────────────────────────────────────────────

const ALL_PLATFORMS: ComicStripCaptionPlatform[] = [
  'instagram',
  'facebook',
  'pinterest',
];

const handle = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const platformParam = url.searchParams.get('platform');
    const idParam = url.searchParams.get('id');

    const platforms: ComicStripCaptionPlatform[] = platformParam
      ? ([platformParam] as ComicStripCaptionPlatform[])
      : ALL_PLATFORMS;

    if (
      platformParam &&
      !ALL_PLATFORMS.includes(platformParam as ComicStripCaptionPlatform)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `unsupported platform: ${platformParam}`,
          supported: ALL_PLATFORMS,
          note: 'TikTok is manual — assets are in the morning Posting Brief',
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Pick the strip: explicit id, else latest READY for this brand that
    // hasn't been posted to ALL platforms yet.
    const strip = idParam
      ? await db.comicStrip.findUnique({ where: { id: idParam } })
      : await db.comicStrip.findFirst({
          where: { brand: BRAND, status: 'READY' },
          orderBy: { createdAt: 'desc' },
        });

    if (!strip) {
      return NextResponse.json(
        { success: false, error: 'no eligible comic strip found' },
        { status: 404, headers: corsHeaders },
      );
    }

    if (strip.status !== 'READY' && strip.status !== 'POSTED') {
      return NextResponse.json(
        {
          success: false,
          error: `strip status is ${strip.status} — not eligible to post`,
          stripId: strip.id,
        },
        { status: 409, headers: corsHeaders },
      );
    }

    if (
      !strip.panel1Url ||
      !strip.panel2Url ||
      !strip.panel3Url ||
      !strip.panel4Url ||
      !strip.assembledUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'strip is missing one or more rendered assets',
          stripId: strip.id,
        },
        { status: 422, headers: corsHeaders },
      );
    }

    const carouselSlides = [
      strip.panel1Url,
      strip.panel2Url,
      strip.panel3Url,
      strip.panel4Url,
      strip.assembledUrl,
    ];

    const captionInput = {
      title: strip.title,
      baseCaption: strip.caption ?? strip.title,
      theme: strip.theme,
    };

    const results: Partial<Record<ComicStripCaptionPlatform, PlatformResult>> =
      {};

    // Skip platforms already successfully posted (idempotency).
    const existingResults =
      (strip.socialPostResults as Record<string, PlatformResult> | null) ?? {};

    for (const platform of platforms) {
      if (existingResults[platform]?.success) {
        console.log(
          `[ComicStrip] ${platform} already posted for strip ${strip.id}, skipping`,
        );
        continue;
      }
      const caption = buildComicStripCaption(platform, captionInput);
      try {
        let mediaId: string;
        if (platform === 'instagram') {
          mediaId = await postInstagramCarousel(carouselSlides, caption);
        } else if (platform === 'facebook') {
          mediaId = await postFacebookStripImage(strip.assembledUrl, caption);
        } else if (platform === 'pinterest') {
          if (!process.env.PINTEREST_BOARD_ID) {
            throw new Error('PINTEREST_BOARD_ID not configured');
          }
          mediaId = await postPinterestImagePin(
            strip.assembledUrl,
            strip.title,
            caption,
            process.env.PINTEREST_BOARD_ID,
          );
        } else {
          throw new Error(`unsupported platform: ${platform}`);
        }
        results[platform] = {
          success: true,
          mediaId,
          caption,
          postedAt: new Date().toISOString(),
        };
        console.log(
          `[ComicStrip] ${platform} posted: stripId=${strip.id} mediaId=${mediaId}`,
        );
      } catch (err) {
        console.error(`[ComicStrip] ${platform} failed:`, err);
        results[platform] = {
          success: false,
          caption,
          error: err instanceof Error ? err.message : 'unknown',
        };
      }
    }

    // Merge results into the row. Keep status as POSTED only if at least
    // one platform succeeded — leaves the door open for retry crons.
    const mergedResults = mergeSocialResults(strip.socialPostResults, results);
    const anySuccess = Object.values(results).some((r) => r.success);

    await db.comicStrip.update({
      where: { id: strip.id },
      data: {
        socialPostResults: mergedResults,
        ...(anySuccess ? { status: 'POSTED', postedAt: new Date() } : {}),
      },
    });

    // If the strip just transitioned to POSTED, invalidate the public-
    // facing caches so /comics, /comics/[slug] and the home-page card
    // pick up the new strip immediately.
    if (anySuccess && strip.status !== 'POSTED') {
      revalidateTag('comics-list', { expire: 0 });
      revalidateTag(`comic-strip-${strip.slug}`, { expire: 0 });
    }

    return NextResponse.json(
      {
        success: anySuccess,
        stripId: strip.id,
        slug: strip.slug,
        platforms: results,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error('[ComicStrip] route failed:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'unknown',
      },
      { status: 500, headers: corsHeaders },
    );
  }
};

export const GET = handle;
export const POST = handle;
