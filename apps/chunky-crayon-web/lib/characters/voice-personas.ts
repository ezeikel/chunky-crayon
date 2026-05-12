/**
 * Voice persona library.
 *
 * The trait-extraction step picks one of these keys based on the parent's
 * description (see lib/characters/trait-extraction.ts EXTRACTION_SYSTEM).
 * The parent can override the suggestion in the create modal's voice step.
 * Either way the persona key is stored on Character.voicePersona — this
 * file maps it to the actual ElevenLabs voiceId used at synthesis time.
 *
 * Keys MUST stay aligned with the enum in trait-extraction.ts. Adding a
 * new persona is a two-line change:
 *   1. Add the key to the enum there.
 *   2. Add a row here with the ElevenLabs voiceId.
 *
 * voiceIds are sourced from env vars so the same code can run against
 * dev / prod ElevenLabs accounts without code changes. Missing env vars
 * fall back to the default narrator voice — characters still get a
 * working voice line even before the per-persona voices are provisioned.
 *
 * IMPORTANT: ElevenLabs voiceIds aren't bundled with this commit. They
 * need to be created (or sourced from the ElevenLabs voice library) and
 * the corresponding ELEVENLABS_VOICE_* env vars set. Until then every
 * character speaks with the default narrator voice — perfect for dev /
 * staging, but parents will notice the lack of variation in prod.
 */

import { VoicePersonaKey } from './voice-persona-types';

type PersonaConfig = {
  /** ElevenLabs voice id for this persona. */
  voiceId: string;
  /** Optional friendly description used for parent-facing UI later. */
  description: string;
};

/**
 * Default narrator voice — used by /api/voice/follow-up etc. Falls back
 * here when a persona-specific env var isn't set so character voices
 * keep working before the full library is provisioned.
 */
const DEFAULT_VOICE_ID =
  process.env.ELEVENLABS_NARRATOR_VOICE_ID ?? 'JBFqnCBsd6RMkjVDRZzb'; // Rachel — safe ElevenLabs library default

const personaEnv = (key: string): string =>
  process.env[`ELEVENLABS_VOICE_${key}`] ?? DEFAULT_VOICE_ID;

/**
 * Map of persona key → ElevenLabs config. Keep the order matched to the
 * picker order in CreateCharacterModal so the suggested-first persona
 * lines up visually with the LLM's pick.
 */
const VOICE_PERSONAS: Record<VoicePersonaKey, PersonaConfig> = {
  'warm-girl-7yo': {
    voiceId: personaEnv('WARM_GIRL_7YO'),
    description: 'Soft, warm voice. Good fit for cuddly cuddly characters.',
  },
  'warm-boy-7yo': {
    voiceId: personaEnv('WARM_BOY_7YO'),
    description: 'Steady and warm. Good fit for grounded characters.',
  },
  'playful-girl-5yo': {
    voiceId: personaEnv('PLAYFUL_GIRL_5YO'),
    description: 'Bouncy and silly. Good fit for energetic characters.',
  },
  'playful-boy-5yo': {
    voiceId: personaEnv('PLAYFUL_BOY_5YO'),
    description: 'Bouncy and silly. Good fit for cheeky characters.',
  },
  'sleepy-neutral': {
    voiceId: personaEnv('SLEEPY_NEUTRAL'),
    description: 'Slow and gentle. Good fit for dreamy characters.',
  },
  'brave-neutral': {
    voiceId: personaEnv('BRAVE_NEUTRAL'),
    description: 'Bold and bright. Good fit for adventurous characters.',
  },
  'silly-neutral': {
    voiceId: personaEnv('SILLY_NEUTRAL'),
    description: 'Goofy and laugh-y. Good fit for clown-y characters.',
  },
  'gentle-neutral': {
    voiceId: personaEnv('GENTLE_NEUTRAL'),
    description: 'Hushed and kind. Good fit for shy characters.',
  },
};

/**
 * Resolve a persona key (or undefined / unknown) to a usable voiceId.
 * Never throws — unknown keys quietly fall back to the default narrator
 * so a typo in the DB can't break voice playback.
 */
export const resolveVoiceId = (
  personaKey: string | null | undefined,
): string => {
  if (!personaKey) return DEFAULT_VOICE_ID;
  const persona = (VOICE_PERSONAS as Record<string, PersonaConfig>)[personaKey];
  return persona?.voiceId ?? DEFAULT_VOICE_ID;
};

export { VOICE_PERSONAS };
