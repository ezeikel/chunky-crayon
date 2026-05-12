/**
 * ElevenLabs Voice Design — per-persona voice generation.
 *
 * Voice Design (vs. Voice Library / IVC / PVC) is the right path for ~20
 * synthetic personas: each call produces a unique-to-this-account voice
 * with no overlap with what competitors' UGC ads use, and no legal
 * exposure from cloning a real human (full breakdown in
 * docs/ugc-ads/README.md). Commercial-licensed on any paid plan.
 *
 * Two-step flow, mirrors the ElevenLabs API shape:
 *
 *   1. designVoicePreviews(prompt) → POST /v1/text-to-voice/design
 *      Returns 3 audio previews + generated_voice_id per preview.
 *      Audio is base64; we decode each and upload to R2 so the admin
 *      UI can play them back without re-calling ElevenLabs. The
 *      generated_voice_ids are ephemeral — they only resolve until a
 *      save call commits them.
 *
 *   2. saveVoiceFromPreview(generatedVoiceId, name) → POST /v1/text-to-voice/:id
 *      Commits the chosen preview to the persona's voice library.
 *      Returns a permanent voice_id. Store this on Persona.voiceId.
 *      The other two previews are abandoned (ElevenLabs garbage-collects).
 *
 * Both endpoints are direct fetch — the installed `elevenlabs` SDK
 * (v1.59) doesn't expose Voice Design yet. Matches the existing
 * lib/elevenlabs/index.ts pattern for /v1/music and /v1/sound-generation.
 */

import { put } from '@one-colored-pixel/storage';
import { personaStoragePaths } from './storage';

// ─────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────

/**
 * Voice Design model. eleven_ttv_v3 is the design (text-to-voice)
 * model — NOT the TTS render model. Synthesis still goes through
 * eleven_multilingual_v2 (the existing voice-render path).
 */
const TTV_MODEL_ID = 'eleven_ttv_v3';

/**
 * Sample text the design endpoint speaks in the previews. Must be 100-1000
 * characters per ElevenLabs docs. We use a generic 'mom-style UGC' line
 * because the persona's actual ad script changes per render — the preview
 * just needs to demo the voice in context. Avoid product mentions so we
 * don't tip Voice Library reviewers off; keep the line neutral.
 */
const SAMPLE_TEXT =
  "Okay so I was supposed to be making dinner but I'm gonna be real with you, we ordered pizza again, and honestly I'm at peace with it. The kid's happy, I'm happy, the kitchen's clean. That's the whole vibe today, just little wins, that's it.";

const API_BASE = 'https://api.elevenlabs.io';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

/**
 * One Voice Design preview. ElevenLabs returns 3 of these per design call.
 * `generatedVoiceId` is short-lived — it only resolves until a save call
 * commits it. After save, the only stable handle is the permanent
 * `voice_id` returned by saveVoiceFromPreview.
 */
export type VoicePreview = {
  /** Ephemeral id — pass to saveVoiceFromPreview to commit. */
  generatedVoiceId: string;
  /** Public R2 URL of the preview MP3 (so admin UI can play it). */
  audioUrl: string;
  /** Preview index 1-3, useful for UI labels. */
  index: number;
};

export type DesignVoiceResult = {
  /** Three previews — the operator picks one in the admin UI. */
  previews: [VoicePreview, VoicePreview, VoicePreview];
};

// ─────────────────────────────────────────────────────────────────────
// Step 1 — design (returns 3 previews, uploaded to R2)
// ─────────────────────────────────────────────────────────────────────

type DesignApiResponse = {
  previews?: Array<{
    audio_base_64?: string;
    generated_voice_id?: string;
  }>;
};

/**
 * Generate 3 voice previews from a description prompt. The prompt should
 * describe the SOUND of the voice (age, accent, pace, vocal qualities) —
 * NOT what the voice should say. Per ElevenLabs docs: ~100-300 words ideal.
 *
 * The PersonaIdentity.voiceDesignPrompt is exactly this — it comes out of
 * the Claude persona generator already shaped for Voice Design.
 *
 * @param handle  Persona handle (no @). Used for R2 paths only.
 * @param prompt  Voice description (Claude's voiceDesignPrompt).
 */
/**
 * ElevenLabs Voice Design hard-caps voice_description at 1000 chars
 * (returns 422 string_too_long if exceeded). Claude can naturally
 * produce 1000-1500 char descriptions which is good detail, but we
 * have to truncate at the API boundary. Persona DB row keeps the
 * full prompt for posterity.
 */
const VOICE_DESCRIPTION_MAX = 1000;

const truncateVoiceDescription = (s: string): string =>
  s.length <= VOICE_DESCRIPTION_MAX
    ? s
    : `${s.slice(0, VOICE_DESCRIPTION_MAX - 1).trimEnd()}.`;

export async function designVoicePreviews(
  handle: string,
  prompt: string,
): Promise<DesignVoiceResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  const voiceDescription = truncateVoiceDescription(prompt);

  const res = await fetch(`${API_BASE}/v1/text-to-voice/design`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: TTV_MODEL_ID,
      voice_description: voiceDescription,
      text: SAMPLE_TEXT,
      // Default 3 previews is fine; explicit for clarity.
      auto_generate_text: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[ugc-voice] design failed (${res.status}): ${errText}`);
  }

  const body = (await res.json()) as DesignApiResponse;
  const rawPreviews = body.previews ?? [];

  if (rawPreviews.length < 3) {
    throw new Error(
      `[ugc-voice] design returned ${rawPreviews.length} previews, expected 3`,
    );
  }

  // Decode + upload all 3 in parallel.
  const paths = personaStoragePaths(handle);
  const previews = await Promise.all(
    rawPreviews.slice(0, 3).map(async (p, i) => {
      if (!p.audio_base_64 || !p.generated_voice_id) {
        throw new Error(
          `[ugc-voice] preview ${i + 1} missing audio_base_64 or generated_voice_id`,
        );
      }
      const audioBuffer = Buffer.from(p.audio_base_64, 'base64');
      // One R2 path per preview index so the admin UI can play all three.
      // After save we only need preview-{index} — leave the others on R2
      // as evidence/debug; cheap to keep.
      const previewPath = paths.voicePreview.replace(/\.mp3$/, `-${i + 1}.mp3`);
      const { url } = await put(previewPath, audioBuffer, {
        access: 'public',
        contentType: 'audio/mpeg',
      });
      return {
        generatedVoiceId: p.generated_voice_id,
        audioUrl: url,
        index: i + 1,
      } satisfies VoicePreview;
    }),
  );

  return {
    previews: previews as [VoicePreview, VoicePreview, VoicePreview],
  };
}

// ─────────────────────────────────────────────────────────────────────
// Step 2 — commit a chosen preview to the library
// ─────────────────────────────────────────────────────────────────────

type SaveApiResponse = {
  voice_id?: string;
  /** Some ElevenLabs responses use `id`; tolerate either. */
  id?: string;
};

/**
 * Commit a Voice Design preview to your library and return its permanent
 * voice_id. The persona's row stores this id; every subsequent TTS render
 * for this persona uses it.
 *
 * The unsaved previews from the design call are garbage-collected by
 * ElevenLabs after a short TTL; if too much time passes between design
 * and save, this call will 404 and the operator has to re-design.
 *
 * @param generatedVoiceId  Ephemeral id from a VoicePreview.
 * @param voiceName         Library label — usually `ugc-{handle}` for grep-ability.
 * @param description       Library description — short, for admin browsing.
 */
export async function saveVoiceFromPreview(
  generatedVoiceId: string,
  voiceName: string,
  description: string,
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  const res = await fetch(
    `${API_BASE}/v1/text-to-voice/${encodeURIComponent(generatedVoiceId)}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_name: voiceName,
        voice_description: description,
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[ugc-voice] save failed (${res.status}): ${errText}`);
  }

  const body = (await res.json()) as SaveApiResponse;
  const voiceId = body.voice_id ?? body.id;
  if (!voiceId) {
    throw new Error(
      `[ugc-voice] save returned no voice_id: ${JSON.stringify(body)}`,
    );
  }

  return voiceId;
}
