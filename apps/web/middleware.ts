import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only process mobile API routes
  if (!pathname.startsWith('/api/mobile')) {
    return NextResponse.next();
  }

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

export const config = {
  matcher: [
    // Match all mobile API routes
    '/api/mobile/:path*',
  ],
};
