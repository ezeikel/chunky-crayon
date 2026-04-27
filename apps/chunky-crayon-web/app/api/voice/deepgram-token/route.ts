/**
 * POST /api/voice/deepgram-token
 *
 * Mints a short-lived (30s) Deepgram ephemeral key the client uses to open
 * its own WebSocket directly to Deepgram for streaming STT. The long-lived
 * `DEEPGRAM_API_KEY` never leaves the server.
 *
 * Anonymous users do NOT get a token. Voice mode requires a signed-in
 * account (parental gate + moderation account-level signal). See
 * `docs/voice-mode/README.md`.
 *
 * The token has `usage:write` scope only — it can call STT endpoints but
 * not manage other keys, billing, or projects.
 */
import { NextResponse } from 'next/server';
import { mintDeepgramToken } from '@/lib/voice/deepgram-token';
import { getUserId } from '@/app/actions/user';
import { ACTIONS } from '@/constants';

export const maxDuration = 10;

export const POST = async () => {
  // Voice mode requires a signed-in account. Anonymous users get a 401
  // here even though they can use text/image modes anonymously — the
  // parental gate + moderation footprint we want for voice doesn't make
  // sense without an account.
  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);
  if (!userId) {
    return NextResponse.json(
      { error: 'voice_mode_requires_signin' },
      { status: 401 },
    );
  }

  try {
    const token = await mintDeepgramToken();
    return NextResponse.json(token);
  } catch (err) {
    console.error('[/api/voice/deepgram-token] mint failed:', err);
    return NextResponse.json({ error: 'token_mint_failed' }, { status: 500 });
  }
};
