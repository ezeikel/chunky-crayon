import { NextResponse } from 'next/server';
import { db, GenerationType } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { auth } from '@/auth';
import { ADMIN_EMAILS } from '@/constants';
import { generateTikTokCaption } from '@/app/actions/social';

/**
 * Get TikTok access token from database.
 */
const getTikTokAccessToken = async (): Promise<string> => {
  const token = await db.apiToken.findUnique({
    where: { provider: 'tiktok' },
  });

  if (!token) {
    throw new Error(
      'TikTok not connected. Please connect your TikTok account first.',
    );
  }

  // Check if token is expired
  if (token.expiresAt < new Date()) {
    // Try to refresh the token
    const refreshedToken = await refreshTikTokToken(token.refreshToken);
    return refreshedToken;
  }

  return token.accessToken;
};

/**
 * Refresh TikTok access token.
 */
const refreshTikTokToken = async (refreshToken: string): Promise<string> => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    throw new Error('TikTok credentials not configured');
  }

  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      `TikTok token refresh failed: ${data.error_description || data.error}`,
    );
  }

  // Update token in database
  await db.apiToken.update({
    where: { provider: 'tiktok' },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return data.access_token;
};

/**
 * Poll for video publish status.
 * TikTok processes videos asynchronously, so we need to poll.
 */
const pollPublishStatus = async (
  accessToken: string,
  publishId: string,
  maxAttempts = 30,
  intervalMs = 5000,
): Promise<{ status: string; publishId: string }> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publish_id: publishId,
        }),
      },
    );

    const data = await response.json();
    console.log(`[TikTok] Publish status (attempt ${attempt + 1}):`, data);

    if (data.data?.status === 'PUBLISH_COMPLETE') {
      return { status: 'PUBLISH_COMPLETE', publishId };
    }

    if (
      data.data?.status === 'FAILED' ||
      (data.error?.code && data.error.code !== 'ok')
    ) {
      throw new Error(
        `TikTok publish failed: ${data.data?.fail_reason || data.error?.message || 'Unknown error'}`,
      );
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  // Return pending status if still processing
  return { status: 'PROCESSING', publishId };
};

/**
 * Post video to TikTok using Direct Post API.
 * Uses PULL_FROM_URL to fetch video from our R2 storage.
 */
const postVideoToTikTok = async (
  videoUrl: string,
  caption: string,
): Promise<{ publishId: string; status: string }> => {
  const accessToken = await getTikTokAccessToken();

  console.log('[TikTok] Initiating video post...');
  console.log('[TikTok] Video URL:', videoUrl);
  console.log('[TikTok] Caption:', caption);

  // Step 1: Initialize the upload with PULL_FROM_URL
  const initResponse = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/video/init/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: caption.slice(0, 150), // TikTok title limit
          privacy_level: 'SELF_ONLY', // TODO: Change to PUBLIC_TO_EVERYONE after TikTok audit approval
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl,
        },
      }),
    },
  );

  const initData = await initResponse.json();

  // TikTok returns error.code: "ok" for successful responses
  if (
    !initResponse.ok ||
    (initData.error?.code && initData.error.code !== 'ok')
  ) {
    console.error('[TikTok] Init failed:', initData);
    throw new Error(
      `TikTok video init failed: ${initData.error?.message || JSON.stringify(initData)}`,
    );
  }

  const publishId = initData.data?.publish_id;
  if (!publishId) {
    throw new Error('No publish_id returned from TikTok');
  }

  console.log('[TikTok] Video upload initiated, publish_id:', publishId);

  // Step 2: Poll for publish status
  const result = await pollPublishStatus(accessToken, publishId);

  return result;
};

type ForwardedBody = {
  videoUrl?: string;
  caption?: string;
  coloringImageId?: string;
};

const parseBody = async (request: Request): Promise<ForwardedBody> => {
  if (request.method !== 'POST') return {};
  try {
    return (await request.json()) as ForwardedBody;
  } catch {
    return {};
  }
};

/**
 * Posts a video to TikTok. Two callers in production today:
 *
 *   1. The unified social cron at /api/social/post?type=demo-reel&platform=tiktok
 *      forwards a POST with body { videoUrl, caption, coloringImageId } where
 *      videoUrl is the demo reel mp4 in R2 and caption is already generated
 *      upstream. This is the LIVE path — fires 18:10 UTC weekdays / 17:10 UTC
 *      weekends. Use the body values directly; don't re-query the DB.
 *
 *   2. Admin "post to TikTok" buttons in the dashboard hit this with POST and
 *      either an explicit body or no body. With no body, fall through to the
 *      legacy DB lookup (animationUrl on today's daily image). Keep this path
 *      working so the admin UI doesn't regress, even though the cron-driven
 *      animation flow has been retired in favour of demo reels.
 *
 * Auth: CRON_SECRET bearer (for the unified cron forwarder) OR admin session
 * (for the dashboard button). Both flows set credentials in the request, so
 * no separate body-vs-cron distinction is needed.
 */
const handle = async (request: Request) => {
  try {
    // Check for cron secret OR admin session
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Allow if valid cron secret provided
    const hasCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

    // Or allow if admin session (for manual triggers from dashboard)
    let hasSessionAuth = false;
    if (!hasCronAuth) {
      const session = await auth();
      hasSessionAuth = !!(
        session?.user?.email && ADMIN_EMAILS.includes(session.user.email)
      );
    }

    if (!hasCronAuth && !hasSessionAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await parseBody(request);

    // Forwarded path — caller already chose the video and generated the
    // caption. Skip the DB lookup entirely, just post.
    if (body.videoUrl) {
      const caption = body.caption ?? '';
      console.log(
        `[TikTok] Posting forwarded video (coloringImageId=${body.coloringImageId ?? 'unknown'}): ${body.videoUrl}`,
      );
      const result = await postVideoToTikTok(body.videoUrl, caption);
      return NextResponse.json({
        success: true,
        publishId: result.publishId,
        status: result.status,
        coloringImageId: body.coloringImageId,
        caption,
        message:
          result.status === 'PUBLISH_COMPLETE'
            ? 'Video posted successfully to TikTok!'
            : 'Video upload initiated, still processing...',
      });
    }

    // Legacy DB-lookup path — admin "post to TikTok" button with no explicit
    // video. Posts the most recent daily image's animationUrl. Daily images
    // don't get animations any more (we ship demo reels via the forwarded
    // path above), so this path is mostly dormant; kept so the admin UI
    // doesn't 500 if hit.
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const coloringImage = await db.coloringImage.findFirst({
      where: {
        brand: BRAND,
        generationType: GenerationType.DAILY,
        animationUrl: { not: null },
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!coloringImage?.animationUrl) {
      const message =
        'No daily coloring image with animation generated today - skipping TikTok';
      console.warn(`[TikTok] ${message}`);
      return NextResponse.json(
        { success: false, message, skipped: true },
        { status: 200 },
      );
    }

    console.log('[TikTok] Posting animation for:', coloringImage.title);

    const caption = await generateTikTokCaption(coloringImage);
    const result = await postVideoToTikTok(coloringImage.animationUrl, caption);

    return NextResponse.json({
      success: true,
      publishId: result.publishId,
      status: result.status,
      coloringImageId: coloringImage.id,
      caption,
      message:
        result.status === 'PUBLISH_COMPLETE'
          ? 'Video posted successfully to TikTok!'
          : 'Video upload initiated, still processing...',
    });
  } catch (error) {
    console.error('[TikTok] Post error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to post to TikTok',
      },
      { status: 500 },
    );
  }
};

export const POST = handle;
