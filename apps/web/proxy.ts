import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Only handle PostHog ingest routes
  if (!pathname.startsWith('/ingest')) {
    return NextResponse.next();
  }

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

export const config = {
  matcher: '/ingest/:path*',
};
