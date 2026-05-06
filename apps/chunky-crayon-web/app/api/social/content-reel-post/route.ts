/**
 * Content-reel social post route.
 *
 * Reads today's content_reels row (where postedAt is set, reelUrl + coverUrl
 * are populated by the worker), generates platform-specific captions via
 * Claude, posts to IG / FB / Pinterest using inline platform helpers
 * (cloned from /api/social/post route — extracting them properly is a
 * follow-up cleanup once the content-reel posting flow is validated).
 *
 * Why a separate route from /api/social/post:
 *   /api/social/post is structured around a `coloringImage` row and has
 *   a 2000+ line dispatcher across carousel/reel/story/colored-static
 *   modes. Content reels live in a different table and post a different
 *   asset shape (already-rendered mp4 + JPEG cover + research source).
 *   Splitting keeps both paths simple.
 *
 * Query params:
 *   ?platform=instagram|facebook|pinterest    (optional, all if omitted)
 *   ?id=<content-reel-id>                     (optional, today's row if omitted)
 *
 * Auth: CRON_SECRET bearer token.
 */
import { NextResponse } from 'next/server';
import { db } from '@one-colored-pixel/db';
import {
  generateContentReelCaption,
  type ContentReelCaptionInput,
} from '@/lib/content-reel/captions';
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

// ── Platform posting (cloned from /api/social/post) ────────────────────

const createInstagramReelContainer = async (
  videoUrl: string,
  caption: string,
  coverUrl?: string,
): Promise<string> => {
  const payload: Record<string, unknown> = {
    media_type: 'REELS',
    video_url: videoUrl,
    caption,
    share_to_feed: true,
    access_token: process.env.FACEBOOK_ACCESS_TOKEN,
  };
  if (coverUrl) payload.cover_url = coverUrl;

  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const data = await response.json();
  if (!data.id) {
    console.error('[ContentReel/IG] container error:', data);
    throw new Error(`failed to create IG container: ${JSON.stringify(data)}`);
  }
  return data.id;
};

const waitForInstagramContainer = async (
  containerId: string,
  maxAttempts = 30,
  intervalMs = 5000,
): Promise<void> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetchWithTimeout(
      `https://graph.facebook.com/v22.0/${containerId}?fields=status_code,status&access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`,
      {},
      30000,
    );
    const data = await response.json();
    console.log(
      `[ContentReel/IG] container ${containerId} status: ${data.status_code || data.status}`,
    );
    if (data.status_code === 'FINISHED' || data.status === 'FINISHED') return;
    if (data.status_code === 'ERROR' || data.status === 'ERROR') {
      throw new Error(`IG media processing failed: ${JSON.stringify(data)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('IG media processing timed out');
};

const publishInstagramMedia = async (creationId: string): Promise<string> => {
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
    console.error('[ContentReel/IG] publish error:', data);
    throw new Error(`failed to publish IG media: ${JSON.stringify(data)}`);
  }
  return data.id;
};

const postVideoToFacebookPage = async (
  videoUrl: string,
  description: string,
  title: string,
  coverUrl: string | null | undefined,
): Promise<string> => {
  // FB Graph /videos: `file_url` accepts a hosted MP4 URL but `thumb`
  // (the custom thumbnail) MUST be sent as a multipart binary upload —
  // there's no `thumb_url` equivalent. So we fetch the cover JPEG
  // server-side, attach it as a Blob in FormData, and let FB process
  // the rest. If coverUrl is missing or the fetch fails, fall back to
  // a JSON-only call so we never block a post on missing artwork —
  // FB will auto-generate a frame thumbnail in that case.
  const url = `https://graph.facebook.com/v22.0/${process.env.FACEBOOK_PAGE_ID}/videos`;
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN ?? '';

  if (coverUrl) {
    try {
      const coverRes = await fetch(coverUrl);
      if (!coverRes.ok) {
        throw new Error(`cover fetch returned ${coverRes.status}`);
      }
      const coverBlob = await coverRes.blob();
      const form = new FormData();
      form.append('file_url', videoUrl);
      form.append('description', description);
      form.append('title', title);
      form.append('access_token', accessToken);
      form.append('thumb', coverBlob, 'cover.jpg');
      const response = await fetch(url, { method: 'POST', body: form });
      const data = await response.json();
      if (!data.id) {
        console.error('[ContentReel/FB] video API response (multipart):', data);
        throw new Error(`failed to post FB video: ${JSON.stringify(data)}`);
      }
      return data.id;
    } catch (err) {
      // Cover-related failure — log and fall through to JSON path so
      // the post still goes out without a custom thumbnail.
      console.warn(
        '[ContentReel/FB] thumb upload failed, retrying without:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_url: videoUrl,
      description,
      title,
      access_token: accessToken,
    }),
  });
  const data = await response.json();
  if (!data.id) {
    console.error('[ContentReel/FB] video API response:', data);
    throw new Error(`failed to post FB video: ${JSON.stringify(data)}`);
  }
  return data.id;
};

const getPinterestAccessToken = async (): Promise<string> => {
  const dbToken = await db.apiToken.findUnique({
    where: { provider: 'pinterest' },
  });
  if (dbToken) return dbToken.accessToken;
  if (process.env.PINTEREST_ACCESS_TOKEN)
    return process.env.PINTEREST_ACCESS_TOKEN;
  throw new Error('Pinterest access token not configured');
};

const pollPinterestMediaStatus = async (
  accessToken: string,
  mediaId: string,
  maxAttempts = 60,
  intervalMs = 5000,
): Promise<void> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `${getPinterestApiUrl()}/v5/media/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const data = await response.json();
    console.log(
      `[ContentReel/Pin] media status (attempt ${attempt + 1}): ${data.status}`,
    );
    if (data.status === 'succeeded') return;
    if (data.status === 'failed') {
      throw new Error(
        `Pinterest media failed: ${data.failure_code ?? 'unknown'}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Pinterest media processing timed out');
};

const postVideoToPinterest = async (
  videoUrl: string,
  coverImageUrl: string,
  title: string,
  description: string,
  reelId: string,
  boardId: string,
): Promise<string> => {
  const accessToken = await getPinterestAccessToken();

  // Step 1: register media
  const registerResponse = await fetch(`${getPinterestApiUrl()}/v5/media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ media_type: 'video' }),
  });
  const registerData = await registerResponse.json();
  if (!registerResponse.ok) {
    throw new Error(
      `Pinterest media register failed: ${JSON.stringify(registerData)}`,
    );
  }
  const { media_id, upload_url, upload_parameters } = registerData;

  // Step 2: upload video
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`failed to fetch video from R2: ${videoResponse.status}`);
  }
  const videoBuffer = await videoResponse.arrayBuffer();

  const formData = new FormData();
  if (upload_parameters) {
    for (const [key, value] of Object.entries(upload_parameters)) {
      formData.append(key, value as string);
    }
  }
  formData.append('file', new Blob([videoBuffer], { type: 'video/mp4' }));

  const uploadResponse = await fetch(upload_url, {
    method: 'POST',
    body: formData,
  });
  if (!uploadResponse.ok) {
    const errText = await uploadResponse.text();
    throw new Error(`Pinterest video upload failed: ${errText}`);
  }

  // Step 3: wait for processing
  await pollPinterestMediaStatus(accessToken, media_id);

  // Step 4: create pin
  const pinResponse = await fetch(`${getPinterestApiUrl()}/v5/pins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: boardId,
      media_source: {
        source_type: 'video_id',
        cover_image_url: coverImageUrl,
        media_id,
      },
      title: title.slice(0, 100),
      description: description.slice(0, 500),
      // Content reels link to the homepage — they're not tied to a coloring
      // page slug. Long-term we may have a /content-reels/<id> page for
      // these to deep-link to a research-source view.
      link: 'https://chunkycrayon.com',
      alt_text: `${title} - Chunky Crayon`,
    }),
  });
  const pinData = await pinResponse.json();
  if (!pinResponse.ok) {
    throw new Error(
      `Pinterest pin creation failed: ${JSON.stringify(pinData)}`,
    );
  }
  return pinData.id;
};

// ── Handler ───────────────────────────────────────────────────────────

const handle = async (request: Request): Promise<Response> => {
  try {
    return await handleInner(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[ContentReel] handler crashed:', message, stack);
    return NextResponse.json(
      { error: 'handler_crashed', message, stack },
      { status: 500, headers: corsHeaders },
    );
  }
};

const handleInner = async (request: Request): Promise<Response> => {
  const auth = request.headers.get('authorization');
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: corsHeaders },
    );
  }

  if (
    !process.env.INSTAGRAM_ACCOUNT_ID ||
    !process.env.FACEBOOK_ACCESS_TOKEN ||
    !process.env.FACEBOOK_PAGE_ID
  ) {
    return NextResponse.json(
      { error: 'social media credentials not configured' },
      { status: 500, headers: corsHeaders },
    );
  }

  const url = new URL(request.url);
  const platformFilter = url.searchParams.get('platform');
  const reelIdParam = url.searchParams.get('id');

  // Resolve target reel: explicit ID wins, else today's posted row.
  let reel;
  if (reelIdParam) {
    reel = await db.contentReel.findUnique({ where: { id: reelIdParam } });
  } else {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    reel = await db.contentReel.findFirst({
      where: {
        brand: BRAND,
        postedAt: { gte: todayStart },
        reelUrl: { not: null },
        coverUrl: { not: null },
      },
      orderBy: { postedAt: 'desc' },
    });
  }

  if (!reel) {
    return NextResponse.json(
      { success: false, message: 'No content reel ready to post today.' },
      { status: 200, headers: corsHeaders },
    );
  }
  if (!reel.reelUrl || !reel.coverUrl) {
    return NextResponse.json(
      { success: false, message: 'Reel is missing reelUrl/coverUrl assets.' },
      { status: 500, headers: corsHeaders },
    );
  }

  // The auto-post route only handles platforms with a working API path.
  // TikTok content-reel posting is paused (manual via brief — see
  // /api/social/digest), so it's NOT in this list.
  type AutoPostPlatform = 'instagram' | 'facebook' | 'pinterest';
  const reelInput: ContentReelCaptionInput = {
    kind: reel.kind,
    hook: reel.hook,
    payoff: reel.payoff,
    sourceTitle: reel.sourceTitle ?? undefined,
    sourceUrl: reel.sourceUrl ?? undefined,
  };

  const shouldPost = (p: AutoPostPlatform) =>
    !platformFilter || platformFilter === p;

  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  // Generate captions in parallel for the platforms we'll post to.
  const platformsToPost: AutoPostPlatform[] = (
    ['instagram', 'facebook', 'pinterest'] as AutoPostPlatform[]
  ).filter(shouldPost);
  const captions = await Promise.all(
    platformsToPost.map((p) => generateContentReelCaption(p, reelInput)),
  );
  const captionByPlatform = Object.fromEntries(
    platformsToPost.map((p, i) => [p, captions[i]]),
  ) as Record<AutoPostPlatform, string>;

  // Post to each platform sequentially — easier to debug than parallel.
  if (shouldPost('instagram')) {
    try {
      const containerId = await createInstagramReelContainer(
        reel.reelUrl,
        captionByPlatform.instagram,
        reel.coverUrl,
      );
      await waitForInstagramContainer(containerId);
      const mediaId = await publishInstagramMedia(containerId);
      results.instagram = {
        success: true,
        mediaId,
        caption: captionByPlatform.instagram,
        postedAt: new Date().toISOString(),
      };
      console.log(`[ContentReel] IG posted: ${mediaId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[ContentReel] IG failed:', message);
      errors.push(`Instagram: ${message}`);
      results.instagram = {
        success: false,
        error: message,
        caption: captionByPlatform.instagram,
      };
    }
  }

  if (shouldPost('facebook')) {
    try {
      // FB title from hook; description gets the full caption. Cover
      // JPEG passed as the custom thumbnail (multipart-form `thumb`)
      // so the FB feed shows our designed cover instead of an
      // auto-extracted black/blank frame.
      const fbId = await postVideoToFacebookPage(
        reel.reelUrl,
        captionByPlatform.facebook,
        reel.hook.slice(0, 90),
        reel.coverUrl,
      );
      results.facebook = {
        success: true,
        mediaId: fbId,
        caption: captionByPlatform.facebook,
        postedAt: new Date().toISOString(),
      };
      console.log(`[ContentReel] FB posted: ${fbId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[ContentReel] FB failed:', message);
      errors.push(`Facebook: ${message}`);
      results.facebook = {
        success: false,
        error: message,
        caption: captionByPlatform.facebook,
      };
    }
  }

  if (shouldPost('pinterest')) {
    try {
      if (!process.env.PINTEREST_BOARD_ID) {
        throw new Error('PINTEREST_BOARD_ID not configured');
      }
      const pinId = await postVideoToPinterest(
        reel.reelUrl,
        reel.coverUrl,
        reel.hook.slice(0, 100),
        captionByPlatform.pinterest,
        reel.id,
        process.env.PINTEREST_BOARD_ID,
      );
      results.pinterest = {
        success: true,
        mediaId: pinId,
        caption: captionByPlatform.pinterest,
        postedAt: new Date().toISOString(),
      };
      console.log(`[ContentReel] Pinterest posted: ${pinId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[ContentReel] Pinterest failed:', message);
      errors.push(`Pinterest: ${message}`);
      results.pinterest = {
        success: false,
        error: message,
        caption: captionByPlatform.pinterest,
      };
    }
  }

  // Persist platform results to the row's socialPostResults JSON column.
  // MERGE with existing results so a single-platform retry doesn't blow
  // away another platform's prior success. Common pattern: editorial
  // calls ?platform=instagram, then ?platform=pinterest later — we
  // need both posts on the row, not just whichever was most recent.
  // Cast through unknown for Prisma's stricter JSON input type.
  const existing = (reel.socialPostResults ?? {}) as Record<string, unknown>;
  const merged = { ...existing, ...results };
  await db.contentReel.update({
    where: { id: reel.id },
    data: {
      socialPostResults: merged as unknown as Record<string, unknown> &
        Record<string, never>,
    },
  });

  return NextResponse.json(
    {
      success: errors.length === 0,
      reelId: reel.id,
      kind: reel.kind,
      results,
      errors: errors.length > 0 ? errors : undefined,
    },
    { status: 200, headers: corsHeaders },
  );
};

export const GET = handle;
export const POST = handle;
