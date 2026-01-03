import { NextRequest, NextResponse } from 'next/server';
import { handleMobileOAuthSignIn } from '@/lib/mobile-auth';
import { verifyMagicLinkToken } from '../route';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/mobile/auth/magic-link/verify
 * Verify a magic link token and return a session token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'token is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Verify the magic link token
    const payload = await verifyMagicLinkToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired magic link' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { email, deviceId } = payload;

    // Handle sign-in with account merging
    const result = await handleMobileOAuthSignIn(deviceId, email);

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
    console.error('Error verifying magic link:', error);
    return NextResponse.json(
      { error: 'Failed to verify magic link' },
      { status: 500, headers: corsHeaders },
    );
  }
}
