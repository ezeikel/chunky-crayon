/**
 * ElevenLabs TTS with R2 cache.
 *
 * Voice mode runs ElevenLabs TTS twice per session:
 *   1. Q1 — fixed prompt ("Tell us what you want to colour."). Generated
 *      once at deploy time via a one-shot script, URL embedded in the
 *      client. Never hits ElevenLabs at request time.
 *   2. Q2 — Claude-generated follow-up. Different per session, but kids
 *      give similar first answers ("a dragon", "a princess"), so the
 *      generated follow-up text repeats. Caching by SHA-256 of the text
 *      means most Q2 calls become a 1-line R2 existence check + URL
 *      return, no ElevenLabs.
 *
 * Cache hit rate in steady state should be high — the follow-up surface
 * is bounded by the LLM's vocabulary, not by user input. We expect
 * substantial cost savings vs naive per-request TTS.
 *
 * If we ever change the voice id or TTS model, the hash inputs include
 * those — so old cached audio doesn't get served against new voice.
 */
import { createHash } from 'node:crypto';
import { put, exists } from '@one-colored-pixel/storage';

// Use the shared ElevenLabs client when this file moves into a package;
// for now duplicate the SDK setup that worker/voice/elevenlabs.ts uses.
import { ElevenLabsClient } from 'elevenlabs';

// ────────────────────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────────────────────

/** TTS model. eleven_v3 is the most expressive — supports audio tags like
 *  [warm], [softly], [whispers] which the voice prompts use. */
const MODEL_ID = 'eleven_v3';

/** Output format. mp3@44k/128 matches what the worker generates for reels;
 *  R2 caches the same format end-to-end. */
const OUTPUT_FORMAT = 'mp3_44100_128';

/** Voice settings — tuned for warm narrator delivery, slightly slowed for
 *  comprehension on first listen. Same as worker/voice/elevenlabs.ts. */
const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.3,
  use_speaker_boost: true,
  speed: 0.95,
} as const;

/** R2 prefix — voice mode TTS gets its own bucket prefix so we can
 *  separately rotate the cache, audit costs, etc. */
const R2_PREFIX = 'voice-tts';

// ────────────────────────────────────────────────────────────────────────────
// Client (lazy)
// ────────────────────────────────────────────────────────────────────────────

let client: ElevenLabsClient | null = null;
const getClient = () => {
  if (!client) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');
    client = new ElevenLabsClient({ apiKey });
  }
  return client;
};

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

export type SynthesizeOptions = {
  /** Plain text to synthesise. Audio tags like [warm] are passed through. */
  text: string;
  /** ElevenLabs voice id. CC narrator + CH narrator have different ids. */
  voiceId: string;
};

export type SynthesizeResult = {
  /** Public R2 URL of the cached or freshly-generated mp3. */
  url: string;
  /** True if this synthesis hit the cache; false if ElevenLabs was called. */
  cached: boolean;
};

/**
 * Synthesise text to speech, caching by `(voiceId, model, format, text)`
 * tuple. Returns a public R2 URL the client can play directly.
 *
 * Same input → same URL → no ElevenLabs call. The hash includes the voice
 * id so CC and CH never share cached audio (they have different narrators).
 */
export async function synthesizeAndCacheTts(
  opts: SynthesizeOptions,
): Promise<SynthesizeResult> {
  const cacheKey = computeCacheKey(opts);
  const pathname = `${R2_PREFIX}/${cacheKey}.mp3`;

  // Cache check first — the whole reason this function exists.
  if (await exists(pathname)) {
    // Reconstruct the public URL the same way `put()` does. We don't
    // round-trip through the storage package here because `exists()`
    // doesn't return a URL.
    const base = process.env.R2_PUBLIC_URL;
    if (!base) throw new Error('R2_PUBLIC_URL not set');
    return {
      url: `${base.replace(/\/$/, '')}/${pathname}`,
      cached: true,
    };
  }

  // Cache miss — call ElevenLabs.
  const eleven = getClient();
  const audio = await eleven.textToSpeech.convert(opts.voiceId, {
    text: opts.text,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    model_id: MODEL_ID,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    output_format: OUTPUT_FORMAT,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    voice_settings: VOICE_SETTINGS,
  });

  const chunks: Buffer[] = [];
  for await (const chunk of audio as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  if (buffer.length < 500) {
    throw new Error(
      `[elevenlabs-tts] suspiciously small audio: ${buffer.length} bytes`,
    );
  }

  const { url } = await put(pathname, buffer, {
    contentType: 'audio/mpeg',
    access: 'public',
  });

  return { url, cached: false };
}

// ────────────────────────────────────────────────────────────────────────────
// Internal — cache key derivation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hash the (voice, model, format, text) tuple. Including voice/model/format
 * means changing any of them naturally invalidates old cache entries — we
 * never accidentally serve stale audio against a new voice.
 */
function computeCacheKey(opts: SynthesizeOptions): string {
  const payload = JSON.stringify({
    v: opts.voiceId,
    m: MODEL_ID,
    f: OUTPUT_FORMAT,
    t: opts.text.trim(),
  });
  return createHash('sha256').update(payload).digest('hex');
}
