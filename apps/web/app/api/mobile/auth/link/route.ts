import { NextRequest, NextResponse } from 'next/server';
import { db } from '@chunky-crayon/db';
import {
  createDeviceToken,
  linkDeviceToUser,
  getMobileAuthFromHeaders,
} from '@/lib/mobile-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/mobile/auth/link
 * Link a device to an authenticated user (after OAuth sign-in)
 *
 * This endpoint is called after the user completes OAuth sign-in.
 * It links the device to the authenticated user and returns a new token.
 */
export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await getMobileAuthFromHeaders(request.headers);

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device not registered' },
        { status: 401, headers: corsHeaders },
      );
    }

    const body = await request.json();
    const { userId, email } = body;

    // Validate that we have a user to link to
    if (!userId && !email) {
      return NextResponse.json(
        { error: 'userId or email is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Find the user
    let user;
    if (userId) {
      user = await db.user.findUnique({
        where: { id: userId },
        include: {
          profiles: {
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      });
    } else if (email) {
      user = await db.user.findUnique({
        where: { email },
        include: {
          profiles: {
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    // Link device to user
    await linkDeviceToUser(deviceId, user.id);

    // Create new token with user ID
    const profileId = user.profiles[0]?.id;
    const token = await createDeviceToken(deviceId, user.id, profileId);

    return NextResponse.json(
      {
        token,
        userId: user.id,
        profileId,
        linked: true,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error linking account:', error);
    return NextResponse.json(
      { error: 'Failed to link account' },
      { status: 500, headers: corsHeaders },
    );
  }
}
