/**
 * POST /api/voice/follow-up — Coloring Habitat (adults).
 *
 * Same shape as the CC variant but uses the adult-tone system prompt
 * (`VOICE_FOLLOW_UP_SYSTEM_ADULT`) and the CH narrator voice id.
 *
 * Voice id resolution: prefers `ELEVENLABS_CH_NARRATOR_VOICE_ID` for the
 * calm-companion tone; falls back to `ELEVENLABS_ADULT_VOICE_ID` (shared
 * with CC's demo-reel narrator) until CH gets its own dedicated voice
 * during Phase 4 of the voice-mode plan.
 *
 * No parental gate on CH — adults are the audience by definition. Anon
 * users still 401 the same as CC, because moderation footprint without an
 * account is too lean to be worth the cost.
 *
 * See `docs/voice-mode/README.md` for the full safety story.
 */
import { NextResponse } from "next/server";
import { generateText } from "ai";
import { models, VOICE_FOLLOW_UP_SYSTEM_ADULT } from "@/lib/ai";
import { moderateVoiceText } from "@/lib/moderation";
import { synthesizeAndCacheTts } from "@/lib/voice/elevenlabs-tts";
import { getUserId } from "@/app/actions/user";
import { ACTIONS } from "@/constants";

export const maxDuration = 30;

/** Generic safe Q2 used when Claude's output trips moderation. Calm-tone
 *  parallel to CC's "[warm] Tell me more!". */
const FALLBACK_FOLLOW_UP = "[softly] Tell me a little more.";

type RequestBody = {
  firstAnswer?: string;
};

export const POST = async (request: Request) => {
  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);
  if (!userId) {
    return NextResponse.json(
      { error: "voice_mode_requires_signin" },
      { status: 401 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const firstAnswer = body.firstAnswer?.trim();
  if (!firstAnswer) {
    return NextResponse.json(
      { error: "firstAnswer_required" },
      { status: 400 },
    );
  }

  const inputCheck = await moderateVoiceText(firstAnswer);
  if (!inputCheck.ok) {
    console.warn(
      `[/api/voice/follow-up] input blocked for user ${userId}: ${inputCheck.code} (${inputCheck.reason})`,
    );
    return NextResponse.json(
      { error: inputCheck.code },
      { status: inputCheck.code === "moderation_unavailable" ? 500 : 400 },
    );
  }

  let rawFollowUp: string;
  try {
    const { text } = await generateText({
      model: models.creative,
      system: VOICE_FOLLOW_UP_SYSTEM_ADULT,
      prompt: firstAnswer,
    });
    rawFollowUp = text.trim();
  } catch (err) {
    console.error("[/api/voice/follow-up] Claude generation failed:", err);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }

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

  // CH narrator voice — prefers a dedicated calm voice if set, falls back
  // to the existing adult voice id we already use elsewhere.
  const voiceId =
    process.env.ELEVENLABS_CH_NARRATOR_VOICE_ID ??
    process.env.ELEVENLABS_ADULT_VOICE_ID;
  if (!voiceId) {
    console.error(
      "[/api/voice/follow-up] no CH narrator voice id set (tried ELEVENLABS_CH_NARRATOR_VOICE_ID + ELEVENLABS_ADULT_VOICE_ID)",
    );
    return NextResponse.json({ error: "tts_not_configured" }, { status: 500 });
  }

  let audioUrl: string;
  try {
    const result = await synthesizeAndCacheTts({
      text: followUpText,
      voiceId,
    });
    audioUrl = result.url;
  } catch (err) {
    console.error("[/api/voice/follow-up] TTS failed:", err);
    return NextResponse.json({ error: "tts_failed" }, { status: 500 });
  }

  return NextResponse.json({
    followUpText,
    followUpAudioUrl: audioUrl,
  });
};
