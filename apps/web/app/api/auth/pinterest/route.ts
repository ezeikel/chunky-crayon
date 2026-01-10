import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { cookies } from 'next/headers';
import { ADMIN_EMAILS } from '@/constants';

/**
 * Initiates Pinterest OAuth flow.
 * Redirects user to Pinterest authorization page.
 *
 * Pinterest OAuth 2.0 flow:
 * 1. User clicks "Connect Pinterest" -> this endpoint
 * 2. Redirect to Pinterest with client_id, redirect_uri, scope
 * 3. User authorizes on Pinterest
 * 4. Pinterest redirects to callback with authorization code
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

  const clientId = process.env.PINTEREST_APP_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Pinterest App ID not configured' },
      { status: 500 },
    );
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID();

  // Build the callback URL
  const baseUrl = process.env.NEXTAUTH_URL || 'https://chunkycrayon.com';
  const redirectUri = `${baseUrl}/api/auth/pinterest/callback`;

  // Pinterest OAuth authorization URL
  // Scopes needed: boards:read, boards:write, pins:read, pins:write for posting pins
  const authUrl = new URL('https://www.pinterest.com/oauth/');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set(
    'scope',
    'boards:read,boards:write,pins:read,pins:write',
  );
  authUrl.searchParams.set('state', state);

  // Store state in cookie for verification in callback
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('pinterest_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  return response;
};
