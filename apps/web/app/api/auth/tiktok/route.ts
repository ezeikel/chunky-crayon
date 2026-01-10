import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { cookies } from 'next/headers';
import { ADMIN_EMAILS } from '@/constants';

/**
 * Initiates TikTok OAuth flow.
 * Redirects user to TikTok authorization page.
 *
 * TikTok OAuth 2.0 flow:
 * 1. User clicks "Connect TikTok" -> this endpoint
 * 2. Redirect to TikTok with client_key, redirect_uri, scope
 * 3. User authorizes on TikTok
 * 4. TikTok redirects to callback with authorization code
 * 5. Callback exchanges code for access token
 */
export const GET = async (request: NextRequest) => {
  // Access cookies first to enable crypto.randomUUID() in Next.js 16
  await cookies();

  // Check if user is admin
  const session = await auth();
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.json(
      { error: 'TikTok client key not configured' },
      { status: 500 },
    );
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID();

  // Build the callback URL
  const baseUrl = process.env.NEXTAUTH_URL || 'https://chunkycrayon.com';
  const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;

  // TikTok OAuth authorization URL
  // Scopes needed: video.publish for posting videos
  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authUrl.searchParams.set('client_key', clientKey);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'user.info.basic,video.upload');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  // Store state in cookie for verification in callback
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('tiktok_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  return response;
};
