import { NextRequest, NextResponse } from 'next/server';
import {
  createPendingColoringImage,
  type CreatePendingArgs,
} from '@/app/actions/createPendingColoringImage';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Returns fast (~1s): inserts a GENERATING row + dispatches the worker, then
// returns the row id. The slow gpt-image-2 work runs on the Hetzner worker and
// flips the row to READY when done — the app polls the row to learn when it's
// ready (mirrors web's SSE on /coloring-image/[id]).
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/mobile/coloring-images/create
 *
 * Thin wrapper over the `createPendingColoringImage` action — the SAME
 * worker/pending pipeline web's create form uses, so mobile gets character
 * injection (and future voice/photo parity) instead of the old synchronous
 * `/coloring-images` POST (which had no character support and blocked on the
 * full image generation).
 *
 * Auth: unified — middleware sets x-user-id from the mobile JWT, which the
 * action reads via getUserId(). Guests are allowed for text mode.
 *
 * Body: { mode: 'text', description, locale?, quality?, characterId? }
 * Returns the action's CreatePendingResult verbatim:
 *   { ok: true, id } | { ok: false, error, message?, credits? }
 * The app navigates to /coloring-image/{id} (a GENERATING row) and polls.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // v1: text mode only from this route (the friend picker lives in text
    // mode). Voice/photo keep their existing endpoints until they migrate to
    // this pending route too.
    const description =
      typeof body?.description === 'string' ? body.description : '';
    const locale = typeof body?.locale === 'string' ? body.locale : 'en';

    const characterIds = Array.isArray(body?.characterIds)
      ? body.characterIds.filter(
          (id: unknown): id is string => typeof id === 'string',
        )
      : [];

    const args: CreatePendingArgs = {
      mode: 'text',
      description,
      locale,
      ...(body?.quality ? { quality: body.quality } : {}),
      ...(characterIds.length > 0 ? { characterIds } : {}),
    };

    const result = await createPendingColoringImage(args);

    // The action returns ok:false for user-facing failures (credits, mod,
    // character_not_ready). Pass them through with 200 so the app can branch
    // on result.error rather than HTTP status — matches web's call site.
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error('Error creating pending coloring image (mobile):', error);
    return NextResponse.json(
      { ok: false, error: 'unknown' as const },
      { status: 500, headers: corsHeaders },
    );
  }
}
