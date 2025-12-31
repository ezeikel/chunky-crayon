import { NextRequest, NextResponse } from 'next/server';
import { getMobileAuthFromHeaders, handleMobileOAuthSignIn } from '@/lib/mobile-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/mobile/auth/facebook
 * Exchange Facebook access token for a session token
 */
export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await getMobileAuthFromHeaders(request.headers);
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'accessToken is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device not registered. Call /api/mobile/auth/register first.' },
        { status: 401, headers: corsHeaders },
      );
    }

    // Verify the Facebook access token by calling Facebook Graph API
    const fbResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`,
    );

    if (!fbResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid Facebook access token' },
        { status: 400, headers: corsHeaders },
      );
    }

    const fbUser = await fbResponse.json();
    const { email, name } = fbUser;

    if (!email) {
      return NextResponse.json(
        { error: 'Facebook account does not have an email address' },
        { status: 400, headers: corsHeaders },
      );
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
    console.error('Error with Facebook sign-in:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with Facebook' },
      { status: 500, headers: corsHeaders },
    );
  }
}
