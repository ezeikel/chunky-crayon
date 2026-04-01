/**
 * TikTok Content Posting API helpers for user-facing sharing.
 *
 * These functions work with per-user tokens stored in UserSocialAccount,
 * separate from the admin ApiToken used for brand account posting.
 */

import { db } from "@one-colored-pixel/db";

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreatorInfo = {
  creatorAvatar: string;
  creatorNickname: string;
  privacyLevelOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number;
};

export type TikTokPostOptions = {
  caption: string;
  privacyLevel: string;
  disableDuet: boolean;
  disableStitch: boolean;
  disableComment: boolean;
};

// ─── Token Management ────────────────────────────────────────────────────────

/**
 * Get a valid access token for a user, refreshing if expired.
 */
export async function getUserAccessToken(userId: string): Promise<string> {
  const account = await db.userSocialAccount.findUnique({
    where: { userId_provider: { userId, provider: "tiktok" } },
  });

  if (!account) {
    throw new Error("TikTok account not connected");
  }

  if (account.expiresAt > new Date()) {
    return account.accessToken;
  }

  // Token expired — refresh it
  return refreshUserToken(userId, account.refreshToken);
}

/**
 * Refresh a user"s TikTok access token.
 */
export async function refreshUserToken(
  userId: string,
  refreshToken: string,
): Promise<string> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    throw new Error("TikTok credentials not configured");
  }

  const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      `TikTok token refresh failed: ${data.error_description || data.error}`,
    );
  }

  await db.userSocialAccount.update({
    where: { userId_provider: { userId, provider: "tiktok" } },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return data.access_token;
}

// ─── Creator Info (required by TikTok review) ────────────────────────────────

/**
 * Fetch creator info from TikTok. Must be called before every post
 * to show the user their profile and available posting options.
 */
export async function fetchCreatorInfo(
  accessToken: string,
): Promise<CreatorInfo> {
  const response = await fetch(
    `${TIKTOK_API_BASE}/post/publish/creator_info/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  const data = await response.json();

  if (!response.ok || (data.error?.code && data.error.code !== "ok")) {
    throw new Error(
      `Failed to fetch creator info: ${data.error?.message || "Unknown error"}`,
    );
  }

  return {
    creatorAvatar: data.data?.creator_avatar_url || "",
    creatorNickname: data.data?.creator_nickname || "",
    privacyLevelOptions: data.data?.privacy_level_options || ["SELF_ONLY"],
    commentDisabled: data.data?.comment_disabled ?? false,
    duetDisabled: data.data?.duet_disabled ?? false,
    stitchDisabled: data.data?.stitch_disabled ?? false,
    maxVideoPostDurationSec: data.data?.max_video_post_duration_sec || 60,
  };
}

// ─── Content Posting ─────────────────────────────────────────────────────────

/**
 * Post a video to a user"s TikTok via Direct Post API (PULL_FROM_URL).
 */
export async function postVideoForUser(
  userId: string,
  videoUrl: string,
  options: TikTokPostOptions,
): Promise<{ publishId: string; status: string }> {
  const accessToken = await getUserAccessToken(userId);

  const initResponse = await fetch(
    `${TIKTOK_API_BASE}/post/publish/video/init/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: options.caption.slice(0, 150),
          privacy_level: options.privacyLevel,
          disable_duet: options.disableDuet,
          disable_comment: options.disableComment,
          disable_stitch: options.disableStitch,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: videoUrl,
        },
      }),
    },
  );

  const initData = await initResponse.json();

  if (
    !initResponse.ok ||
    (initData.error?.code && initData.error.code !== "ok")
  ) {
    throw new Error(
      `TikTok post failed: ${initData.error?.message || JSON.stringify(initData)}`,
    );
  }

  const publishId = initData.data?.publish_id;
  if (!publishId) {
    throw new Error("No publish_id returned from TikTok");
  }

  return { publishId, status: "PROCESSING" };
}

/**
 * Post a photo to a user"s TikTok via Direct Post API.
 * Used when no video/animation is available.
 */
export async function postPhotoForUser(
  userId: string,
  imageUrls: string[],
  options: TikTokPostOptions,
): Promise<{ publishId: string; status: string }> {
  const accessToken = await getUserAccessToken(userId);

  const initResponse = await fetch(
    `${TIKTOK_API_BASE}/post/publish/content/init/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: options.caption.slice(0, 150),
          privacy_level: options.privacyLevel,
          disable_duet: options.disableDuet,
          disable_comment: options.disableComment,
          disable_stitch: options.disableStitch,
        },
        source_info: {
          source: "PULL_FROM_URL",
          photo_cover_index: 0,
          photo_images: imageUrls,
        },
        post_mode: "DIRECT_POST",
        media_type: "PHOTO",
      }),
    },
  );

  const initData = await initResponse.json();

  if (
    !initResponse.ok ||
    (initData.error?.code && initData.error.code !== "ok")
  ) {
    throw new Error(
      `TikTok photo post failed: ${initData.error?.message || JSON.stringify(initData)}`,
    );
  }

  const publishId = initData.data?.publish_id;
  if (!publishId) {
    throw new Error("No publish_id returned from TikTok");
  }

  return { publishId, status: "PROCESSING" };
}
