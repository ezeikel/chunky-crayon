import { NextRequest, NextResponse } from 'next/server';
import {
  listCharactersForActiveProfile,
  createCharacter,
  type CreateCharacterInput,
} from '@/app/actions/characters';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/characters
 * Lists the active profile's characters (newest first).
 *
 * Auth: the proxy verifies the mobile JWT and injects x-user-id for
 * /api/mobile/*; the action reads it via getUserId(). Returns [] when
 * unauthenticated / no active profile (action handles both).
 */
export async function GET() {
  try {
    const characters = await listCharactersForActiveProfile();
    return NextResponse.json({ characters }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error listing characters:', error);
    return NextResponse.json(
      { error: 'Failed to list characters' },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * POST /api/mobile/characters
 * Body: CreateCharacterInput { name, species, color, traits[], voicePersona? }
 *
 * Creates a character (row starts GENERATING) and fires the worker to
 * generate the portrait. Mirrors the web create action exactly — no parent
 * gate (creation is the same kind of op as making a coloring page; the
 * mobile client gates nothing here). Returns the action's CreateCharacterResult.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CreateCharacterInput>;

    if (
      typeof body?.name !== 'string' ||
      typeof body?.species !== 'string' ||
      typeof body?.color !== 'string' ||
      !Array.isArray(body?.traits)
    ) {
      return NextResponse.json(
        { ok: false, error: 'invalid_input' },
        { status: 400, headers: corsHeaders },
      );
    }

    const result = await createCharacter({
      name: body.name,
      species: body.species,
      color: body.color,
      traits: body.traits,
      voicePersona: body.voicePersona,
    });

    // Map the action's error codes to HTTP status; body keeps the
    // discriminated-union shape so the client reads result.ok / result.error.
    if (!result.ok) {
      const status =
        result.error === 'unauthorized'
          ? 401
          : result.error === 'invalid_input'
            ? 400
            : result.error === 'limit_reached'
              ? 409
              : result.error === 'moderation_blocked'
                ? 422
                : 500;
      return NextResponse.json(result, { status, headers: corsHeaders });
    }

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json(
      { ok: false, error: 'unknown' },
      { status: 500, headers: corsHeaders },
    );
  }
}
