import { NextRequest, NextResponse, connection } from 'next/server';
import { headers } from 'next/headers';
import { isGateableMode } from '@/lib/scene/modes';
import {
  getUnlockedModesForUser,
  setModeUnlockedForUser,
} from '@/lib/scene/unlock-service';

/**
 * Scene Builder mode-gating for mobile.
 *
 * Thin wrapper over `lib/scene/unlock-service` (the shared source of
 * truth, also used by the web server action). Auth is the JWT — the proxy
 * verifies the mobile token and injects `x-user-id` for `/api/mobile/*`.
 *
 * The parent-gate proof on mobile is solved client-side (the same
 * subtraction check the web modal uses). Per the web's parent-gate note,
 * the gate is friction, not an auth boundary — the authenticated session
 * is the real boundary. So this route does NOT require an HMAC token; it
 * trusts the session and records the unlock.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/scene/unlocked-modes
 * Returns the gateable modes unlocked for the user's active profile.
 */
export async function GET() {
  await connection();

  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders },
      );
    }

    const unlockedModes = await getUnlockedModesForUser(userId);
    return NextResponse.json({ unlockedModes }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching unlocked modes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unlocked modes' },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * POST /api/mobile/scene/unlocked-modes
 * Body: { mode: "text" | "voice" | "image", unlocked: boolean }
 * Toggles one gateable mode for the user's active profile.
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders },
      );
    }

    const body = await request.json();
    const { mode, unlocked } = body;

    if (!isGateableMode(mode)) {
      return NextResponse.json(
        { error: 'invalid_mode' },
        { status: 400, headers: corsHeaders },
      );
    }
    if (typeof unlocked !== 'boolean') {
      return NextResponse.json(
        { error: 'unlocked must be a boolean' },
        { status: 400, headers: corsHeaders },
      );
    }

    const result = await setModeUnlockedForUser({ userId, mode, unlocked });

    if (!result.ok) {
      const status = result.error === 'no_profile' ? 404 : 400;
      return NextResponse.json(
        { error: result.error },
        { status, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { success: true, unlockedModes: result.unlockedModes },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error setting unlocked mode:', error);
    return NextResponse.json(
      { error: 'Failed to set unlocked mode' },
      { status: 500, headers: corsHeaders },
    );
  }
}
