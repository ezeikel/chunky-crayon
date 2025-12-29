import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Create the intl middleware
const intlMiddleware = createIntlMiddleware(routing);

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

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
  // - API routes
  // - Next.js internals
  // - Static files
  // - PostHog ingest (handled separately above)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/ingest/:path*'],
};
