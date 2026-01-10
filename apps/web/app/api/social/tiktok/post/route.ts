import { NextResponse } from 'next/server';
import { db, GenerationType } from '@chunky-crayon/db';
import { auth } from '@/auth';
import { generateText, models } from '@/lib/ai';
import { ADMIN_EMAILS } from '@/constants';

const TIKTOK_CAPTION_SYSTEM = `Generate a TikTok caption for a kids coloring page video.
- Keep it short and engaging (under 150 chars)
- Use 3-5 relevant hashtags
- Kid and parent friendly tone
- Include a call-to-action like "Link in bio!" or "Download free!"
- Make it fun and catchy`;

/**
 * Generate a TikTok-optimized caption using AI.
 */
const generateTikTokCaption = async (
  title: string,
  description: string,
  tags: string[],
): Promise<string> => {
  try {
    const { text } = await generateText({
      model: models.textFast,
      system: TIKTOK_CAPTION_SYSTEM,
      prompt: `Create a TikTok caption for this coloring page:
Title: ${title}
Description: ${description}
Tags: ${tags.join(', ')}

Return ONLY the caption with hashtags, nothing else.`,
    });

    return text.trim();
  } catch (error) {
    console.error('[TikTok] Caption generation failed:', error);
    // Fallback caption
    return `${title} 🎨 Free coloring page! #coloringpage #kidscrafts #artforkids #freecoloringpage`;
  }
};

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
          privacy_level: 'SELF_ONLY', // Use SELF_ONLY for sandbox, PUBLIC_TO_EVERYONE after audit
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

/**
 * POST /api/social/tiktok/post
 * Posts the most recent daily coloring page animation to TikTok.
 */
export const POST = async () => {
  try {
    // Check if user is admin
    const session = await auth();
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the most recent daily coloring image with animation
    const coloringImage = await db.coloringImage.findFirst({
      where: {
        generationType: GenerationType.DAILY,
        animationUrl: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!coloringImage?.animationUrl) {
      return NextResponse.json(
        { error: 'No coloring image with animation found' },
        { status: 404 },
      );
    }

    console.log('[TikTok] Posting animation for:', coloringImage.title);

    // Generate TikTok-optimized caption
    const caption = await generateTikTokCaption(
      coloringImage.title,
      coloringImage.description,
      coloringImage.tags,
    );

    // Post to TikTok
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
