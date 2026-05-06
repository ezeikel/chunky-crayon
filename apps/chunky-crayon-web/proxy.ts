import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { jwtVerify } from 'jose';
import { routing } from './i18n/routing';

// First-party anonymous visitor ID. Read by lib/conversion-api.ts and
// forwarded to Meta + Pinterest CAPI as a hashed external_id fallback
// when no logged-in user exists. Lifts Pinterest Event Quality (Lead
// External ID coverage was 15% — only logged-in users) and gives Meta
// extra cross-event stitching for guest-checkout funnels.
const ANONYMOUS_ID_COOKIE = 'cc_anon_id';
const ANONYMOUS_ID_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

const generateAnonymousId = (): string => {
  // crypto.randomUUID is available in the edge runtime.
  return crypto.randomUUID();
};

const ensureAnonymousId = (
  request: NextRequest,
  response: NextResponse,
): void => {
  if (request.cookies.get(ANONYMOUS_ID_COOKIE)) return;
  response.cookies.set(ANONYMOUS_ID_COOKIE, generateAnonymousId(), {
    maxAge: ANONYMOUS_ID_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
  });
};

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
 * Edge-compatible version for middleware
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

export default async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Handle mobile API routes - verify JWT and inject user info
  if (pathname.startsWith('/api/mobile')) {
    return handleMobileApiAuth(request);
  }

  // Skip i18n for Sentry tunnel route
  if (pathname.startsWith('/monitoring')) {
    return NextResponse.next();
  }

  // Skip i18n for R2 asset proxy routes
  if (pathname.startsWith('/_r2/')) {
    return NextResponse.next();
  }

  // Skip i18n for OG image routes - they should be served directly
  if (
    pathname.includes('opengraph-image') ||
    pathname.includes('twitter-image')
  ) {
    return NextResponse.next();
  }

  // Skip i18n for dev-only routes (ad previews etc.) — they aren't translated
  // and need their own root layout. Gated to NODE_ENV=development at the page.
  if (pathname.startsWith('/dev/')) {
    return NextResponse.next();
  }

  // Bots (Meta / X / LinkedIn / Slack / WhatsApp scrapers, plus Googlebot)
  // shouldn't get the locale-detection redirect: they often don't follow
  // redirects-with-Set-Cookie, which results in blank ad previews. Rewrite
  // them straight to /en/<path> so the page renders inline. Match the
  // common bot UA tokens — this is a bots-only escape hatch, real browsers
  // still hit the next-intl detection path.
  const userAgent = request.headers.get('user-agent') || '';
  const isBot =
    /facebookexternalhit|facebookcatalog|meta-externalagent|twitterbot|linkedinbot|slackbot|whatsapp|telegrambot|discordbot|googlebot|bingbot|pinterestbot|applebot/i.test(
      userAgent,
    );

  if (
    isBot &&
    !pathname.startsWith('/en') &&
    !pathname.startsWith('/de') &&
    !pathname.startsWith('/fr') &&
    !pathname.startsWith('/es') &&
    !pathname.startsWith('/ja') &&
    !pathname.startsWith('/ko') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/_vercel') &&
    !pathname.startsWith('/ingest')
  ) {
    const rewriteUrl = url.clone();
    rewriteUrl.pathname = `/en${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(rewriteUrl);
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

  // Handle i18n routing for all other routes. Set the anonymous-id
  // cookie on the response when missing — this is the only branch that
  // serves real human visitors, so we scope cookie-set to here to avoid
  // tagging bots / mobile-API / PostHog-ingest traffic.
  const intlResponse = await intlMiddleware(request);
  if (intlResponse instanceof NextResponse) {
    ensureAnonymousId(request, intlResponse);
  }
  return intlResponse;
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
