import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { jwtVerify } from 'jose';
import { routing } from './i18n/routing';

// Create the intl middleware
const intlMiddleware = createIntlMiddleware(routing);

// JWT secret for mobile tokens - must match lib/mobile-auth.ts
const JWT_SECRET = new TextEncoder().encode(
  process.env.MOBILE_AUTH_SECRET ||
    process.env.NEXT_AUTH_SECRET ||
    'dev-secret-change-me',
);

type MobileTokenPayload = {
  deviceId: string;
  userId?: string;
  profileId?: string;
  type: 'device' | 'user';
};

/**
 * Verify and decode a mobile JWT token
 * Edge-compatible version for proxy
 */
async function verifyMobileToken(
  token: string,
): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as MobileTokenPayload;
  } catch {
    // Token invalid or expired - fail silently
    return null;
  }
}

/**
 * Handle mobile API authentication
 * Verifies JWT and injects user info into request headers
 */
async function handleMobileApiAuth(
  request: NextRequest,
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Skip auth endpoints that create tokens (they don't need auth)
  const skipAuthPaths = [
    '/api/mobile/auth/register',
    '/api/mobile/auth/google',
    '/api/mobile/auth/apple',
    '/api/mobile/auth/facebook',
    '/api/mobile/auth/magic-link',
  ];

  if (skipAuthPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get authorization header
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    // No token - continue without user context (anonymous access)
    return NextResponse.next();
  }

  // Extract and verify JWT token
  const token = authHeader.slice(7);
  const payload = await verifyMobileToken(token);

  if (!payload) {
    // Invalid token - continue without user context
    return NextResponse.next();
  }

  // Clone the request headers and add user info
  const requestHeaders = new Headers(request.headers);

  if (payload.userId) {
    requestHeaders.set('x-user-id', payload.userId);
  }

  if (payload.profileId) {
    requestHeaders.set('x-profile-id', payload.profileId);
  }

  if (payload.deviceId) {
    requestHeaders.set('x-device-id', payload.deviceId);
  }

  // Continue with the modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Handle mobile API routes - verify JWT and inject user info
  if (pathname.startsWith('/api/mobile')) {
    return handleMobileApiAuth(request);
  }

  // Skip i18n for OG image routes - they should be served directly
  if (
    pathname.includes('opengraph-image') ||
    pathname.includes('twitter-image')
  ) {
    return NextResponse.next();
  }

  // Handle PostHog ingest routes first
  if (pathname.startsWith('/ingest')) {
    // Determine the correct PostHog host based on path
    const hostname = pathname.startsWith('/ingest/static/')
      ? 'eu-assets.i.posthog.com'
      : 'eu.i.posthog.com';

    // Set the host header for the upstream request
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('host', hostname);

    // Rewrite the URL to PostHog
    url.protocol = 'https';
    url.hostname = hostname;
    url.port = '443';
    url.pathname = pathname.replace(/^\/ingest/, '');

    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Handle i18n routing for all other routes
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for:
  // - Non-mobile API routes (mobile API handled for auth)
  // - Next.js internals
  // - Static files
  // - PostHog ingest (handled separately above)
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
    '/ingest/:path*',
    '/api/mobile/:path*',
  ],
};
