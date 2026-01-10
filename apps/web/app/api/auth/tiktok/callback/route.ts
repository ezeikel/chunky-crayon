import { NextRequest, NextResponse } from 'next/server';
import { db } from '@chunky-crayon/db';

/**
 * TikTok OAuth callback handler.
 * Exchanges authorization code for access token and stores it.
 */
export const GET = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Check for errors from TikTok
  if (error) {
    console.error('[TikTok OAuth] Error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/en/admin/social?error=${encodeURIComponent(errorDescription || error)}`,
        request.url,
      ),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        '/en/admin/social?error=No authorization code received',
        request.url,
      ),
    );
  }

  // Verify state for CSRF protection
  const storedState = request.cookies.get('tiktok_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL('/en/admin/social?error=Invalid state parameter', request.url),
    );
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    return NextResponse.redirect(
      new URL(
        '/en/admin/social?error=TikTok credentials not configured',
        request.url,
      ),
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://chunkycrayon.com';
  const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(
      'https://open.tiktokapis.com/v2/oauth/token/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('[TikTok OAuth] Token exchange failed:', tokenData);
      return NextResponse.redirect(
        new URL(
          `/en/admin/social?error=${encodeURIComponent(
            tokenData.error_description ||
              tokenData.error ||
              'Token exchange failed',
          )}`,
          request.url,
        ),
      );
    }

    // TikTok returns: access_token, expires_in, open_id, refresh_token, refresh_expires_in, scope, token_type
    const { access_token, refresh_token, expires_in, scope, open_id } =
      tokenData;

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Upsert token in database
    await db.apiToken.upsert({
      where: { provider: 'tiktok' },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        scopes: scope ? scope.split(',') : [],
        metadata: { open_id },
      },
      create: {
        provider: 'tiktok',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        scopes: scope ? scope.split(',') : [],
        metadata: { open_id },
      },
    });

    console.log(
      '[TikTok OAuth] Successfully stored tokens for open_id:',
      open_id,
    );

    // Clear the state cookie and redirect to admin page
    const response = NextResponse.redirect(
      new URL('/en/admin/social?success=tiktok', request.url),
    );
    response.cookies.delete('tiktok_oauth_state');

    return response;
  } catch (err) {
    console.error('[TikTok OAuth] Error:', err);
    return NextResponse.redirect(
      new URL(
        `/en/admin/social?error=${encodeURIComponent(
          err instanceof Error ? err.message : 'Unknown error',
        )}`,
        request.url,
      ),
    );
  }
};
