/**
 * Shared persona key type. Split into its own module so trait-extraction
 * and voice-personas can both import it without a circular dependency.
 */

export type VoicePersonaKey =
  | 'warm-girl-7yo'
  | 'warm-boy-7yo'
  | 'playful-girl-5yo'
  | 'playful-boy-5yo'
  | 'sleepy-neutral'
  | 'brave-neutral'
  | 'silly-neutral'
  | 'gentle-neutral';
