/**
 * Character voice line service.
 *
 * Two flavours:
 *   - Preset slots (`hi`, `feed`, `exercise`, `dress`, `bye`): templated
 *     text built from the character's name. Synthesised + cached on the
 *     first call; later calls return the cached row. Free to the user.
 *   - Custom lines: parent-gated, 80-char cap, 1 credit per generation.
 *     Stored as slot=`custom` with the verbatim text.
 *
 * R2 cache layer is the shared `synthesizeAndCacheTts` (lib/voice/
 * elevenlabs-tts.ts) — keyed by (voiceId, model, format, text) so two
 * characters with the same voiceId saying "Hi I'm Rex" share one mp3.
 *
 * The DB layer (`CharacterVoiceLine`) records which (characterId, slot)
 * we've ever synthesised. The mp3 itself lives in `voice-tts/` on R2,
 * not under `uploads/characters/${id}/voice/`, because the shared cache
 * delivers real cost savings and the URLs are stable.
 */

import { db } from '@one-colored-pixel/db';
import { synthesizeAndCacheTts } from '@/lib/voice/elevenlabs-tts';
import { resolveVoiceId } from './voice-personas';

export type PresetSlot = 'hi' | 'feed' | 'exercise' | 'dress' | 'bye';

/**
 * Templated preset lines. `${name}` placeholders are replaced at
 * synthesis time. Short, cheerful, sub-7-words to keep the audio
 * snappy on first listen.
 */
const PRESET_TEMPLATES: Record<PresetSlot, string> = {
  hi: "Hi! I'm {name}!",
  feed: 'Yum yum, thank you!',
  exercise: "Whoosh! Let's run!",
  dress: 'How do I look?',
  bye: 'Bye for now!',
};

const buildPresetText = (slot: PresetSlot, name: string): string =>
  PRESET_TEMPLATES[slot].replace('{name}', name);

/**
 * Get the audio URL for a character's preset voice line. Synthesises
 * on first request; subsequent requests are an O(1) DB lookup.
 *
 * Throws on ElevenLabs failure — the caller (server action) maps to a
 * friendly error code so kids see "Rex is thinking…" rather than a stack.
 */
export const getOrSynthesisePresetLine = async (params: {
  characterId: string;
  characterName: string;
  voicePersona: string | null;
  slot: PresetSlot;
}): Promise<{ url: string; cached: boolean; voiceLineId: string }> => {
  const existing = await db.characterVoiceLine.findFirst({
    where: { characterId: params.characterId, slot: params.slot },
    select: { id: true, audioUrl: true },
  });

  const text = buildPresetText(params.slot, params.characterName);

  if (existing) {
    return { url: existing.audioUrl, cached: true, voiceLineId: existing.id };
  }

  // Cache miss in DB — synthesise (which may itself hit the R2 cache if
  // another character with the same voiceId said the same words).
  const { url } = await synthesizeAndCacheTts({
    text,
    voiceId: resolveVoiceId(params.voicePersona),
  });

  const row = await db.characterVoiceLine.create({
    data: {
      characterId: params.characterId,
      slot: params.slot,
      text,
      audioUrl: url,
    },
    select: { id: true },
  });

  return { url, cached: false, voiceLineId: row.id };
};

/**
 * Synthesise a parent-gated custom voice line. No DB cache key — every
 * custom request creates a new row so the parent can scroll through
 * "lines I've made my character say" later (Phase 4b). R2 still caches
 * by hash, so re-typing the same phrase is free downstream.
 */
export const synthesiseCustomVoiceLine = async (params: {
  characterId: string;
  voicePersona: string | null;
  text: string;
}): Promise<{ url: string; voiceLineId: string }> => {
  const { url } = await synthesizeAndCacheTts({
    text: params.text,
    voiceId: resolveVoiceId(params.voicePersona),
  });

  const row = await db.characterVoiceLine.create({
    data: {
      characterId: params.characterId,
      slot: 'custom',
      text: params.text,
      audioUrl: url,
    },
    select: { id: true },
  });

  return { url, voiceLineId: row.id };
};

export { PRESET_TEMPLATES };
