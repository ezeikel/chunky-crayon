'use server';

import { put } from '@/lib/storage';
import {
  generateText,
  getTracedModels,
  createColoVoiceScriptSystemPrompt,
  createColoVoiceScriptPrompt,
} from '@/lib/ai';
import { generateColoVoice } from '@/lib/elevenlabs';
import { getUserId } from '@/app/actions/user';
import { ACTIONS } from '@/constants';

export type LoadingAudioResult = {
  audioUrl: string;
  script: string;
  durationMs: number;
};

/**
 * Locale to language mapping for Colo's voice scripts.
 * Maps locale codes to language names for the AI prompt.
 */
const LOCALE_LANGUAGE_MAP: Record<
  string,
  { name: string; nativeName: string }
> = {
  en: { name: 'English', nativeName: 'English' },
  ja: { name: 'Japanese', nativeName: '日本語' },
  ko: { name: 'Korean', nativeName: '한국어' },
  de: { name: 'German', nativeName: 'Deutsch' },
  fr: { name: 'French', nativeName: 'Français' },
  es: { name: 'Spanish', nativeName: 'Español' },
};

/**
 * Generate Colo's personalized loading audio for a coloring page request.
 *
 * This action should be called in PARALLEL with image generation to avoid
 * adding latency to the user experience.
 *
 * Pipeline:
 * 1. Generate script using GPT-4o-mini (~500ms)
 * 2. Convert to speech using ElevenLabs (~1-2s)
 * 3. Upload to blob storage
 *
 * Total time: ~2-3s (runs in parallel with 30s image generation)
 *
 * @param description - The user's description of what they want to color
 * @param locale - Optional locale code for language (defaults to 'en')
 * @returns Audio URL and generated script
 */
export async function generateLoadingAudio(
  description: string,
  locale: string = 'en',
): Promise<LoadingAudioResult> {
  const startTime = Date.now();
  const userId = await getUserId(ACTIONS.GENERATE_LOADING_AUDIO);

  // Get language info for the locale (default to English if unknown)
  const languageInfo = LOCALE_LANGUAGE_MAP[locale] || LOCALE_LANGUAGE_MAP.en;

  // Get traced models for observability
  const tracedModels = getTracedModels({
    userId: userId || undefined,
    properties: { action: 'loading-audio-generation', locale },
  });

  // Step 1: Generate Colo's script using fast model (with language support)
  const { text: script } = await generateText({
    model: tracedModels.textFast,
    system: createColoVoiceScriptSystemPrompt(
      languageInfo.name,
      languageInfo.nativeName,
    ),
    prompt: createColoVoiceScriptPrompt(description, languageInfo.name),
  });

  // eslint-disable-next-line no-console
  console.log(`[LoadingAudio] Generated script: "${script}"`);

  // Step 2: Generate audio using ElevenLabs
  const { audioBuffer, durationMs: voiceDurationMs } =
    await generateColoVoice(script);

  // Step 3: Upload to blob storage (temporary file)
  const audioFileName = `temp/loading-audio/${Date.now()}-${Math.random().toString(36).substring(2)}.mp3`;
  const { url: audioUrl } = await put(audioFileName, audioBuffer, {
    access: 'public',
    contentType: 'audio/mpeg',
  });

  const totalDurationMs = Date.now() - startTime;

  // eslint-disable-next-line no-console
  console.log(
    `[LoadingAudio] Complete in ${totalDurationMs}ms (script: ${totalDurationMs - voiceDurationMs}ms, voice: ${voiceDurationMs}ms)`,
  );

  return {
    audioUrl,
    script,
    durationMs: totalDurationMs,
  };
}
