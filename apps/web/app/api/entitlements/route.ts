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
 * GET /api/entitlements
 *
 * API route wrapper for the getEntitlements server action.
 * Used by mobile app to fetch subscription entitlements.
 * Web app should call the server action directly.
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
    console.error('Error fetching entitlements:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500, headers: corsHeaders },
    );
  }
}

// Re-export type for consumers
export type { EntitlementsResponse };
