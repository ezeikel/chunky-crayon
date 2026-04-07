import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Routes that require authentication
const PROTECTED_ROUTES = ["/account"];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip i18n for Sentry tunnel route
  if (pathname.startsWith("/monitoring")) {
    return NextResponse.next();
  }

  // Skip i18n for R2 asset proxy routes
  if (pathname.startsWith("/_r2/")) {
    return NextResponse.next();
  }

  // Skip i18n for PostHog ingest proxy
  if (pathname.startsWith("/ingest")) {
    return NextResponse.next();
  }

  // Skip i18n for OG image routes
  if (
    pathname.includes("opengraph-image") ||
    pathname.includes("twitter-image")
  ) {
    return NextResponse.next();
  }

  // Run intl middleware for locale routing
  const response = intlMiddleware(request);

  // Check if this is a protected route (strip locale prefix first)
  const pathnameWithoutLocale = pathname.replace(/^\/(en|ja|ko|de|fr|es)/, "");
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathnameWithoutLocale.startsWith(route),
  );

  if (isProtected) {
    const sessionToken =
      request.cookies.get("__Secure-authjs.session-token")?.value ||
      request.cookies.get("authjs.session-token")?.value;

    if (!sessionToken) {
      const signInUrl = new URL("/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/ingest/:path*"],
};
