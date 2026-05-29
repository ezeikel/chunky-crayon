import { NextRequest, NextResponse } from 'next/server';
import { regenerateCharacterPortrait } from '@/app/actions/characters';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/mobile/characters/[id]/retry
 * Re-run portrait generation for a FAILED character — flips it back to
 * GENERATING and re-POSTs the worker. No body. Session-authenticated;
 * action verifies ownership.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await regenerateCharacterPortrait(id);
    if (!result.ok) {
      const status =
        result.error === 'unauthorized'
          ? 401
          : result.error === 'not_found'
            ? 404
            : 400;
      return NextResponse.json(result, { status, headers: corsHeaders });
    }
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error('Error retrying character portrait:', error);
    return NextResponse.json(
      { ok: false, error: 'unknown' },
      { status: 500, headers: corsHeaders },
    );
  }
}
