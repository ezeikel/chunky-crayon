import { NextRequest, NextResponse } from 'next/server';
import { db } from '@chunky-crayon/db';

/**
 * Pinterest OAuth callback handler.
 * Exchanges authorization code for access token and stores it.
 */
export const GET = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Check for errors from Pinterest
  if (error) {
    console.error('[Pinterest OAuth] Error:', error, errorDescription);
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
  const storedState = request.cookies.get('pinterest_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL('/en/admin/social?error=Invalid state parameter', request.url),
    );
  }

  const clientId = process.env.PINTEREST_APP_ID;
  const clientSecret = process.env.PINTEREST_APP_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(
        '/en/admin/social?error=Pinterest credentials not configured',
        request.url,
      ),
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://chunkycrayon.com';
  const redirectUri = `${baseUrl}/api/auth/pinterest/callback`;

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(
      'https://api.pinterest.com/v5/oauth/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('[Pinterest OAuth] Token exchange failed:', tokenData);
      return NextResponse.redirect(
        new URL(
          `/en/admin/social?error=${encodeURIComponent(
            tokenData.message || tokenData.error || 'Token exchange failed',
          )}`,
          request.url,
        ),
      );
    }

    // Pinterest returns: access_token, token_type, expires_in, refresh_token, refresh_token_expires_in, scope
    const { access_token, refresh_token, expires_in, scope } = tokenData;

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Upsert token in database
    await db.apiToken.upsert({
      where: { provider: 'pinterest' },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        scopes: scope ? scope.split(' ') : [],
      },
      create: {
        provider: 'pinterest',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        scopes: scope ? scope.split(' ') : [],
      },
    });

    console.log('[Pinterest OAuth] Successfully stored tokens');

    // Clear the state cookie and redirect to admin page
    const response = NextResponse.redirect(
      new URL('/en/admin/social?success=pinterest', request.url),
    );
    response.cookies.delete('pinterest_oauth_state');

    return response;
  } catch (err) {
    console.error('[Pinterest OAuth] Error:', err);
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
