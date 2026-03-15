import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import {
  getMobileAuthFromHeaders,
  handleMobileOAuthSignIn,
} from '@/lib/mobile-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/mobile/auth/google
 * Exchange Google ID token for a session token
 */
export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await getMobileAuthFromHeaders(request.headers);
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: 'idToken is required' },
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

    // Verify the Google ID token
    // Include all Google client IDs that may sign users in
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: [
        process.env.GOOGLE_CLIENT_ID as string,
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID as string,
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID as string,
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID as string,
      ].filter(Boolean),
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.json(
        { error: 'Invalid token: no email found' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { email, name } = payload;

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
    console.error('Error with Google sign-in:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with Google' },
      { status: 500, headers: corsHeaders },
    );
  }
}
