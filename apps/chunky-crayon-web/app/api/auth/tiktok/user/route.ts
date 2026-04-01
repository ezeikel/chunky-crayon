import { NextRequest, NextResponse, connection } from 'next/server';
import { auth } from '@/auth';
import { cookies } from 'next/headers';

/**
 * User-facing TikTok OAuth initiation.
 * Any authenticated user can connect their TikTok account for sharing artwork.
 * This is separate from the admin TikTok OAuth at /api/auth/tiktok which uses ADMIN_EMAILS.
 */
export const GET = async (request: NextRequest) => {
  await connection();
  await cookies();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.json(
      { error: 'TikTok not configured' },
      { status: 500 },
    );
  }

  const state = crypto.randomUUID();
  const returnUrl =
    request.nextUrl.searchParams.get('return_url') || '/account/my-artwork';

  const baseUrl = process.env.NEXTAUTH_URL || 'https://chunkycrayon.com';
  const redirectUri = `${baseUrl}/api/auth/tiktok/user/callback`;

  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authUrl.searchParams.set('client_key', clientKey);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'user.info.basic,video.publish');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authUrl.toString());

  // Store state, userId, and return URL in cookies
  response.cookies.set('tiktok_user_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
  });
  response.cookies.set('tiktok_user_id', session.user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
  });
  response.cookies.set('tiktok_return_url', returnUrl, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
  });

  return response;
};
