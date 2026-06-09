import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import * as Sentry from '@sentry/nextjs';
import {
  getMobileAuthFromHeaders,
  handleMobileOAuthSignIn,
} from '@/lib/mobile-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Apple's public key endpoint for JWT verification
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const appleJWKS = createRemoteJWKSet(new URL(APPLE_KEYS_URL));

// A native iOS "Sign in with Apple" identity token has its `aud` set to the
// app's BUNDLE ID — NOT the `.signin` Services ID (`APPLE_CLIENT_ID`, which is
// the WEB Apple OAuth identifier). So the mobile token's audience is one of the
// build-variant bundle ids below. We accept the Services id (web flow) AND all
// three mobile bundle ids (prod / preview / dev) so a token from any build
// verifies against this one prod route (the mobile apps all point at prod).
// jose accepts an array for `audience` (matches if the token's aud is any one).
const APPLE_ALLOWED_AUDIENCES = [
  process.env.APPLE_CLIENT_ID, // web Services id (e.g. com.chewybytes.chunkycrayon.signin)
  'com.chewybytes.chunkycrayon.app', // prod build bundle id
  'com.chewybytes.chunkycrayon.app.internal', // preview build bundle id
  'com.chewybytes.chunkycrayon.app.dev', // dev build bundle id
].filter(Boolean) as string[];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/mobile/auth/apple
 * Exchange Apple identity token for a session token
 */
export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await getMobileAuthFromHeaders(request.headers);
    const body = await request.json();
    const { identityToken, fullName } = body;

    if (!identityToken) {
      return NextResponse.json(
        { error: 'identityToken is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!deviceId) {
      return NextResponse.json(
        {
          error: 'Device not registered. Call /api/mobile/auth/register first.',
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // Verify the Apple identity token
    let payload;
    try {
      const { payload: verifiedPayload } = await jwtVerify(
        identityToken,
        appleJWKS,
        {
          issuer: 'https://appleid.apple.com',
          audience: APPLE_ALLOWED_AUDIENCES,
        },
      );
      payload = verifiedPayload;
    } catch (verifyError) {
      // Report the real verification failure — the most common cause is an
      // audience mismatch (token `aud` = app bundle id not in the allowed list).
      // Previously this only console.error'd, so it surfaced as an opaque 400.
      Sentry.captureException(verifyError, {
        tags: { route: 'mobile/auth/apple' },
      });
      console.error('Apple token verification failed:', verifyError);
      return NextResponse.json(
        { error: 'Invalid Apple identity token' },
        { status: 400, headers: corsHeaders },
      );
    }

    const email = payload.email as string;
    if (!email) {
      return NextResponse.json(
        { error: 'Invalid token: no email found' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Apple only provides name on first sign-in
    let name: string | undefined;
    if (fullName?.givenName || fullName?.familyName) {
      name = [fullName.givenName, fullName.familyName]
        .filter(Boolean)
        .join(' ');
    }

    // Handle OAuth sign-in with account merging
    const result = await handleMobileOAuthSignIn(deviceId, email, name);

    return NextResponse.json(
      {
        token: result.token,
        userId: result.userId,
        profileId: result.profileId,
        isNewUser: result.isNewUser,
        wasMerged: result.wasMerged,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: 'mobile/auth/apple' },
    });
    console.error('Error with Apple sign-in:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with Apple' },
      { status: 500, headers: corsHeaders },
    );
  }
}
