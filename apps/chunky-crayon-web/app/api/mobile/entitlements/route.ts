import { NextResponse } from 'next/server';
import {
  getEntitlements,
  type EntitlementsResponse,
} from '@/app/actions/entitlements';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/entitlements
 *
 * Mobile-facing entitlements. CRITICAL: this lives under /api/mobile so the
 * proxy (proxy.ts, matcher `/api/mobile/:path*`) verifies the device's bearer
 * JWT and injects `x-user-id` — which getUserId() reads. The old
 * /api/entitlements path is NOT proxied, so getUserId() found no identity,
 * getEntitlements() returned null, the route 401'd, and the app's useCredits()
 * fell back to 0 → the create form wrongly opened the paywall even though the
 * device had credits (the header, which DOES hit /mobile/auth/me, showed them).
 */
export async function GET() {
  try {
    const entitlements = await getEntitlements();
    if (!entitlements) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401, headers: corsHeaders },
      );
    }
    return NextResponse.json(entitlements, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching entitlements (mobile):', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500, headers: corsHeaders },
    );
  }
}

export type { EntitlementsResponse };
