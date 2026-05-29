/**
 * Organic-post social posting route.
 *
 * Reads today's organic_posts row (postedAt set, reelUrl + coverUrl
 * populated by the worker), generates platform captions, and posts to
 * IG / FB / Pinterest directly + TikTok / LinkedIn / Threads via Buffer.
 * Cloned from /api/social/content-reel-post — the two flows post the same
 * asset shape (rendered mp4 + JPEG cover + source), just from different
 * tables. Extracting the shared Meta/Pinterest helpers is a follow-up.
 *
 * Query params:
 *   ?platform=instagram|facebook|pinterest|tiktok|linkedin|threads
 *   ?id=<organic-post-id>   (optional, today's row if omitted)
 *
 * Auth: CRON_SECRET. GUARD: no-ops unless ORGANIC_CONTENT_ENGINE_ENABLED.
 */
import { NextResponse } from 'next/server';
import { db } from '@one-colored-pixel/db';
import {
  generateOrganicCaption,
  type OrganicCaptionInput,
} from '@/lib/organic/captions';
import {
  schedulePostViaBuffer,
  isBufferBridgeEnabled,
} from '@/lib/social/buffer';
import { BRAND } from '@/lib/db';

export const maxDuration = 300;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const isEnabled = () => process.env.ORGANIC_CONTENT_ENGINE_ENABLED === 'true';

const getPinterestApiUrl = () =>
  process.env.PINTEREST_USE_SANDBOX === 'true'
    ? 'https://api-sandbox.pinterest.com'
    : 'https://api.pinterest.com';

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

// ── Platform posting (mirrors /api/social/content-reel-post) ───────────

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
  if (!data.id)
    throw new Error(`failed to create IG container: ${JSON.stringify(data)}`);
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
    );
    const data = await response.json();
    if (data.status_code === 'FINISHED' || data.status === 'FINISHED') return;
    if (data.status_code === 'ERROR' || data.status === 'ERROR')
      throw new Error(`IG media processing failed: ${JSON.stringify(data)}`);
    await new Promise((r) => setTimeout(r, intervalMs));
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
  );
  const data = await response.json();
  if (!data.id)
    throw new Error(`failed to publish IG media: ${JSON.stringify(data)}`);
  return data.id;
};

const postVideoToFacebookPage = async (
  videoUrl: string,
  description: string,
  title: string,
  coverUrl: string | null | undefined,
): Promise<string> => {
  const url = `https://graph.facebook.com/v22.0/${process.env.FACEBOOK_PAGE_ID}/videos`;
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN ?? '';
  if (coverUrl) {
    try {
      const coverRes = await fetch(coverUrl);
      if (!coverRes.ok) throw new Error(`cover fetch ${coverRes.status}`);
      const coverBlob = await coverRes.blob();
      const form = new FormData();
      form.append('file_url', videoUrl);
      form.append('description', description);
      form.append('title', title);
      form.append('access_token', accessToken);
      form.append('thumb', coverBlob, 'cover.jpg');
      const response = await fetch(url, { method: 'POST', body: form });
      const data = await response.json();
      if (!data.id)
        throw new Error(`failed to post FB video: ${JSON.stringify(data)}`);
      return data.id;
    } catch (err) {
      console.warn(
        '[Organic/FB] thumb upload failed, retrying without:',
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
  if (!data.id)
    throw new Error(`failed to post FB video: ${JSON.stringify(data)}`);
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
    if (data.status === 'succeeded') return;
    if (data.status === 'failed')
      throw new Error(
        `Pinterest media failed: ${data.failure_code ?? 'unknown'}`,
      );
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Pinterest media processing timed out');
};

const postVideoToPinterest = async (
  videoUrl: string,
  coverImageUrl: string,
  title: string,
  description: string,
  boardId: string,
): Promise<string> => {
  const accessToken = await getPinterestAccessToken();
  const registerResponse = await fetch(`${getPinterestApiUrl()}/v5/media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ media_type: 'video' }),
  });
  const registerData = await registerResponse.json();
  if (!registerResponse.ok)
    throw new Error(
      `Pinterest register failed: ${JSON.stringify(registerData)}`,
    );
  const { media_id, upload_url, upload_parameters } = registerData;

  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok)
    throw new Error(`failed to fetch video from R2: ${videoResponse.status}`);
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
  if (!uploadResponse.ok)
    throw new Error(`Pinterest upload failed: ${await uploadResponse.text()}`);

  await pollPinterestMediaStatus(accessToken, media_id);

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
      link: 'https://chunkycrayon.com',
      alt_text: `${title} - Chunky Crayon`,
    }),
  });
  const pinData = await pinResponse.json();
  if (!pinResponse.ok)
    throw new Error(`Pinterest pin failed: ${JSON.stringify(pinData)}`);
  return pinData.id;
};

// ── Handler ────────────────────────────────────────────────────────────

const handle = async (request: Request): Promise<Response> => {
  const auth = request.headers.get('authorization');
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: corsHeaders },
    );
  }
  if (!isEnabled()) {
    return NextResponse.json(
      { success: true, skipped: true, reason: 'organic engine disabled' },
      { status: 200, headers: corsHeaders },
    );
  }

  try {
    return await handleInner(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Organic] handler crashed:', message);
    return NextResponse.json(
      { error: 'handler_crashed', message },
      { status: 500, headers: corsHeaders },
    );
  }
};

const handleInner = async (request: Request): Promise<Response> => {
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
  const idParam = url.searchParams.get('id');

  let post;
  if (idParam) {
    post = await db.organicPost.findUnique({ where: { id: idParam } });
  } else {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    post = await db.organicPost.findFirst({
      where: {
        brand: BRAND,
        postedAt: { gte: todayStart },
        reelUrl: { not: null },
        coverUrl: { not: null },
      },
      orderBy: { postedAt: 'desc' },
    });
  }

  if (!post) {
    return NextResponse.json(
      { success: false, message: 'No organic post ready to post today.' },
      { status: 200, headers: corsHeaders },
    );
  }
  if (!post.reelUrl || !post.coverUrl) {
    return NextResponse.json(
      { success: false, message: 'Post is missing reelUrl/coverUrl assets.' },
      { status: 500, headers: corsHeaders },
    );
  }

  type AutoPostPlatform = 'instagram' | 'facebook' | 'pinterest';
  const captionInput: OrganicCaptionInput = {
    engine: post.engine,
    hook: post.hook,
    payoff: post.payoff,
    sourceTitle: post.sourceTitle ?? undefined,
    sourceUrl: post.sourceUrl ?? undefined,
  };
  const shouldPost = (p: AutoPostPlatform) =>
    !platformFilter || platformFilter === p;

  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  const platformsToPost: AutoPostPlatform[] = (
    ['instagram', 'facebook', 'pinterest'] as AutoPostPlatform[]
  ).filter(shouldPost);
  const captions = await Promise.all(
    platformsToPost.map((p) => generateOrganicCaption(p, captionInput)),
  );
  const captionByPlatform = Object.fromEntries(
    platformsToPost.map((p, i) => [p, captions[i]]),
  ) as Record<AutoPostPlatform, string>;

  if (shouldPost('instagram')) {
    try {
      const containerId = await createInstagramReelContainer(
        post.reelUrl,
        captionByPlatform.instagram,
        post.coverUrl,
      );
      await waitForInstagramContainer(containerId);
      const mediaId = await publishInstagramMedia(containerId);
      results.instagram = {
        success: true,
        mediaId,
        caption: captionByPlatform.instagram,
        postedAt: new Date().toISOString(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
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
      const fbId = await postVideoToFacebookPage(
        post.reelUrl,
        captionByPlatform.facebook,
        post.hook.slice(0, 90),
        post.coverUrl,
      );
      results.facebook = {
        success: true,
        mediaId: fbId,
        caption: captionByPlatform.facebook,
        postedAt: new Date().toISOString(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
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
      if (!process.env.PINTEREST_BOARD_ID)
        throw new Error('PINTEREST_BOARD_ID not configured');
      const pinId = await postVideoToPinterest(
        post.reelUrl,
        post.coverUrl,
        post.hook.slice(0, 100),
        captionByPlatform.pinterest,
        process.env.PINTEREST_BOARD_ID,
      );
      results.pinterest = {
        success: true,
        mediaId: pinId,
        caption: captionByPlatform.pinterest,
        postedAt: new Date().toISOString(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Pinterest: ${message}`);
      results.pinterest = {
        success: false,
        error: message,
        caption: captionByPlatform.pinterest,
      };
    }
  }

  // TikTok / LinkedIn / Threads via Buffer bridge.
  const bufferDueAt = () => new Date(Date.now() + 5 * 60 * 1000);
  const bufferTargets: ('tiktok' | 'linkedin' | 'threads')[] = (
    ['tiktok', 'linkedin', 'threads'] as const
  ).filter((p) => !platformFilter || platformFilter === p);

  for (const platform of bufferTargets) {
    if (!isBufferBridgeEnabled(platform)) continue;
    // eslint-disable-next-line no-await-in-loop
    const caption = await generateOrganicCaption(platform, captionInput);
    let metadata:
      | {
          firstComment?: string;
          linkAttachmentUrl?: string;
          replyThread?: string;
        }
      | undefined;
    if (platform === 'linkedin' && post.sourceUrl) {
      metadata = {
        firstComment: `Source: ${post.sourceUrl}`,
        linkAttachmentUrl: post.sourceUrl,
      };
    } else if (platform === 'threads' && post.sourceUrl) {
      metadata = {
        linkAttachmentUrl: post.sourceUrl,
        replyThread: `Source: ${post.sourceUrl}`,
      };
    }
    // eslint-disable-next-line no-await-in-loop
    const buffered = await schedulePostViaBuffer({
      platform,
      text: caption,
      videoUrl: post.reelUrl,
      thumbnailUrl: post.coverUrl ?? undefined,
      metadata,
      dueAt: bufferDueAt(),
    });
    if (buffered.scheduled) {
      results[platform] = {
        success: true,
        via: 'buffer',
        mediaId: buffered.postId,
        caption,
        postedAt: new Date().toISOString(),
      };
    } else if (!buffered.disabled) {
      const message = buffered.error ?? 'unknown';
      errors.push(`${platform} (Buffer): ${message}`);
      results[platform] = { success: false, caption, error: message };
    }
  }

  const existing = (post.socialPostResults ?? {}) as Record<string, unknown>;
  const merged = { ...existing, ...results };
  await db.organicPost.update({
    where: { id: post.id },
    data: {
      socialPostResults: merged as unknown as Record<string, unknown> &
        Record<string, never>,
    },
  });

  return NextResponse.json(
    {
      success: errors.length === 0,
      postId: post.id,
      engine: post.engine,
      results,
      errors: errors.length > 0 ? errors : undefined,
    },
    { status: 200, headers: corsHeaders },
  );
};

export const GET = handle;
export const POST = handle;
