import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { getMobileAuthFromHeaders, handleMobileOAuthSignIn } from '@/lib/mobile-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Apple's public key endpoint for JWT verification
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const appleJWKS = createRemoteJWKSet(new URL(APPLE_KEYS_URL));

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
        { error: 'Device not registered. Call /api/mobile/auth/register first.' },
        { status: 401, headers: corsHeaders },
      );
    }

    // Verify the Apple identity token
    let payload;
    try {
      const { payload: verifiedPayload } = await jwtVerify(identityToken, appleJWKS, {
        issuer: 'https://appleid.apple.com',
        audience: process.env.AUTH_APPLE_ID,
      });
      payload = verifiedPayload;
    } catch (verifyError) {
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
      name = [fullName.givenName, fullName.familyName].filter(Boolean).join(' ');
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
    console.error('Error with Apple sign-in:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with Apple' },
      { status: 500, headers: corsHeaders },
    );
  }
}
