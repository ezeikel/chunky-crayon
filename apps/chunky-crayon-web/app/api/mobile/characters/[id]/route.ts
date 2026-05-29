import { NextRequest, NextResponse } from 'next/server';
import { getCharacter, deleteCharacter } from '@/app/actions/characters';
import { issueParentGateToken } from '@/app/actions/parent-gate';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/characters/[id]
 * Fetch one character owned by the current user (for polling status while
 * the worker generates the portrait). Returns 404 when missing / not owned
 * (action returns null in both cases — no existence leak).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const character = await getCharacter(id);
    if (!character) {
      return NextResponse.json(
        { error: 'not_found' },
        { status: 404, headers: corsHeaders },
      );
    }
    return NextResponse.json({ character }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching character:', error);
    return NextResponse.json(
      { error: 'Failed to fetch character' },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * DELETE /api/mobile/characters/[id]
 * Delete a character.
 *
 * deleteCharacter requires an HMAC parent-gate token. Per the mobile
 * parent-gate convention (see scene/unlocked-modes route): the mobile
 * client shows the same subtraction gate the web modal uses, then calls
 * this route. Since the route is already session-authenticated and the
 * gate is friction (not the auth boundary), we mint the scoped token
 * server-side here and pass it to the action — preserving the action's
 * contract without weakening it.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const gate = await issueParentGateToken('character:delete');
    if (!gate.ok) {
      return NextResponse.json(
        { ok: false, error: 'unauthorized' },
        { status: 401, headers: corsHeaders },
      );
    }

    const result = await deleteCharacter(id, gate.token);
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
    console.error('Error deleting character:', error);
    return NextResponse.json(
      { ok: false, error: 'unknown' },
      { status: 500, headers: corsHeaders },
    );
  }
}
