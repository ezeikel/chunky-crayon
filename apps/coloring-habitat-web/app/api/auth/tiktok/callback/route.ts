import { NextRequest, NextResponse, connection } from "next/server";
import { db } from "@one-colored-pixel/db";
import { fetchCreatorInfo } from "@/lib/tiktok";

/**
 * User-facing TikTok OAuth callback.
 * Exchanges code for tokens and stores in UserSocialAccount (per-user).
 */
export const GET = async (request: NextRequest) => {
  await connection();

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Read cookies
  const storedState = request.cookies.get("tiktok_user_oauth_state")?.value;
  const userId = request.cookies.get("tiktok_user_id")?.value;
  const returnUrl =
    request.cookies.get("tiktok_return_url")?.value || "/account/my-artwork";

  const errorRedirect = (msg: string) =>
    NextResponse.redirect(
      new URL(
        `${returnUrl}?tiktok_error=${encodeURIComponent(msg)}`,
        request.url,
      ),
    );

  if (error) {
    return errorRedirect(errorDescription || error);
  }

  if (!code) {
    return errorRedirect("No authorization code received");
  }

  if (!storedState || storedState !== state) {
    return errorRedirect("Invalid state parameter");
  }

  if (!userId) {
    return errorRedirect("Session expired — please try connecting again");
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    return errorRedirect("TikTok credentials not configured");
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://coloringhabitat.com";
  const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      return errorRedirect(
        tokenData.error_description ||
          tokenData.error ||
          "Token exchange failed",
      );
    }

    const { access_token, refresh_token, expires_in, scope, open_id } =
      tokenData;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Fetch creator info (nickname/avatar) — required by TikTok review
    let displayName: string | undefined;
    let avatarUrl: string | undefined;
    try {
      const creatorInfo = await fetchCreatorInfo(access_token);
      displayName = creatorInfo.creatorNickname;
      avatarUrl = creatorInfo.creatorAvatar;
    } catch (err) {
      console.warn("[TikTok User OAuth] Could not fetch creator info:", err);
    }

    // Upsert per-user social account
    await db.userSocialAccount.upsert({
      where: { userId_provider: { userId, provider: "tiktok" } },
      update: {
        providerAccountId: open_id,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        scopes: scope ? scope.split(",") : [],
        displayName,
        avatarUrl,
        metadata: { open_id },
      },
      create: {
        userId,
        provider: "tiktok",
        providerAccountId: open_id,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        scopes: scope ? scope.split(",") : [],
        displayName,
        avatarUrl,
        metadata: { open_id },
      },
    });

    // Clean up cookies and redirect back
    const response = NextResponse.redirect(
      new URL(`${returnUrl}?tiktok_connected=true`, request.url),
    );
    response.cookies.delete("tiktok_user_oauth_state");
    response.cookies.delete("tiktok_user_id");
    response.cookies.delete("tiktok_return_url");

    return response;
  } catch (err) {
    console.error("[TikTok User OAuth] Error:", err);
    return errorRedirect(err instanceof Error ? err.message : "Unknown error");
  }
};
