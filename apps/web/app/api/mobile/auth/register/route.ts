import { NextRequest, NextResponse } from 'next/server';
import {
  createDeviceToken,
  getOrCreateDeviceUser,
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
 * POST /api/mobile/auth/register
 * Register a device and get a session token
 * Creates an anonymous user if device is new
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId } = body;

    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Get or create user for this device
    const { userId, profileId, isNew } = await getOrCreateDeviceUser(deviceId);

    // Create a session token
    const token = await createDeviceToken(deviceId, userId, profileId);

    return NextResponse.json(
      {
        token,
        userId,
        profileId,
        isNew,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error registering device:', error);
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500, headers: corsHeaders },
    );
  }
}
