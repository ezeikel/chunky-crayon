/**
 * POST /api/voice/follow-up
 *
 * Voice mode middle step. Client has just received the kid's first
 * answer from Deepgram. Server takes that answer, runs the safety stack,
 * generates a single warm follow-up via Claude, runs the safety stack on
 * the LLM output, and returns `{ followUpText, followUpAudioUrl }` for
 * playback.
 *
 * Auth: signed-in users only (anon → 401, same as deepgram-token).
 *
 * The endpoint is the only place LLM output ever crosses the
 * safety boundary, so any hardening we do here covers all Q2 generations.
 *
 * On any moderation block (input or output), we return a 4xx with a code
 * the client can branch on:
 *   400 too_long          → "let's try a shorter idea"
 *   400 blocklisted       → "let's try a different idea"
 *   400 moderation_flagged → same as blocklisted (don't echo categories)
 *   500 moderation_unavailable → infra problem, treat as flagged for kids
 *   500 generation_failed → claude/elevenlabs error
 *
 * On output flag, we DON'T expose the original Claude output to the
 * client — instead we substitute a generic safe fallback "Tell me more!"
 * and return that. Better UX than failing the whole turn.
 *
 * See `docs/voice-mode/README.md` for the full safety story.
 */
import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { models, VOICE_FOLLOW_UP_SYSTEM_KIDS } from '@/lib/ai';
import { moderateVoiceText } from '@/lib/moderation';
import { synthesizeAndCacheTts } from '@/lib/voice/elevenlabs-tts';
import { getUserId } from '@/app/actions/user';
import { ACTIONS } from '@/constants';

export const maxDuration = 30;

/** Generic safe Q2 used when Claude's output trips moderation. Same energy
 *  as the system prompt — Bluey-mum, scene-focused, opens the floor. */
const FALLBACK_FOLLOW_UP = '[warm] Tell me more!';

type RequestBody = {
  firstAnswer?: string;
};

export const POST = async (request: Request) => {
  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);
  if (!userId) {
    return NextResponse.json(
      { error: 'voice_mode_requires_signin' },
      { status: 401 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const firstAnswer = body.firstAnswer?.trim();
  if (!firstAnswer) {
    return NextResponse.json(
      { error: 'firstAnswer_required' },
      { status: 400 },
    );
  }

  // 1. Moderate the kid's input. This is the prompt-injection / unsafe
  // content boundary; Claude must not see anything that fails this gate.
  const inputCheck = await moderateVoiceText(firstAnswer);
  if (!inputCheck.ok) {
    console.warn(
      `[/api/voice/follow-up] input blocked for user ${userId}: ${inputCheck.code} (${inputCheck.reason})`,
    );
    return NextResponse.json(
      { error: inputCheck.code },
      // moderation_unavailable is the only one that's a server-side issue;
      // everything else is client/user driven.
      { status: inputCheck.code === 'moderation_unavailable' ? 500 : 400 },
    );
  }

  // 2. Generate the follow-up via Claude.
  let rawFollowUp: string;
  try {
    const { text } = await generateText({
      model: models.creative,
      system: VOICE_FOLLOW_UP_SYSTEM_KIDS,
      prompt: firstAnswer,
    });
    rawFollowUp = text.trim();
  } catch (err) {
    console.error('[/api/voice/follow-up] Claude generation failed:', err);
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 });
  }

  // 3. Moderate Claude's output. LLMs occasionally generate offside content
  // even from clean input — fall back to a safe canned response rather
  // than failing the whole turn.
  let followUpText: string;
  const outputCheck = await moderateVoiceText(rawFollowUp);
  if (!outputCheck.ok) {
    console.warn(
      `[/api/voice/follow-up] Claude output blocked, falling back to canned: ${outputCheck.code} (${outputCheck.reason})`,
    );
    followUpText = FALLBACK_FOLLOW_UP;
  } else {
    followUpText = rawFollowUp;
  }

  // 4. Synthesise to speech (cached on R2 by hash). Use the adult-warm
  // narrator voice — same one already used in demo reels.
  const voiceId = process.env.ELEVENLABS_ADULT_VOICE_ID;
  if (!voiceId) {
    console.error('[/api/voice/follow-up] ELEVENLABS_ADULT_VOICE_ID not set');
    return NextResponse.json({ error: 'tts_not_configured' }, { status: 500 });
  }

  let audioUrl: string;
  try {
    const result = await synthesizeAndCacheTts({
      text: followUpText,
      voiceId,
    });
    audioUrl = result.url;
  } catch (err) {
    console.error('[/api/voice/follow-up] TTS failed:', err);
    return NextResponse.json({ error: 'tts_failed' }, { status: 500 });
  }

  return NextResponse.json({
    followUpText,
    followUpAudioUrl: audioUrl,
  });
};
