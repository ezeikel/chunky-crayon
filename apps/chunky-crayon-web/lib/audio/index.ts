export { default as SoundManager, getSoundManager } from './SoundManager';
export type { SoundType, BrushSoundType } from './SoundManager';
// NOTE: `createMusicPrompt` is server-only (it calls Claude). Import it
// directly from `@/lib/audio/prompts` — do NOT re-export it here or the
// barrel will drag `sharp` / `detect-libc` into every client bundle that
// touches this file.
