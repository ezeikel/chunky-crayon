/**
 * Character picker catalogues — the React-Native-safe, data-only subset.
 *
 * A "character" is a kid-created reusable creature (species + colour + up
 * to 3 traits + a voice persona) that can later appear in generated
 * coloring pages. The Create Character flow is icon-first: every choice
 * is a chunky icon tap, zero typing.
 *
 * Why data-only (no FA icons, no duotone) — same reasoning as the scene
 * catalogue (see ../scene/scene-catalog.ts): coloring-core is also
 * imported by the worker (server). Pulling @fortawesome icon data in
 * would bloat the server bundle. So per-option PRESENTATION (FA icon +
 * duotone palette) lives in each app's UI layer, keyed by `key`:
 *   - web:    a key→{icon, duotone(css var)} map in lib/characters
 *   - mobile: a key→{icon, duotone(hex)} map next to CharacterBuilder
 *
 * The server constructs the generation prompt deterministically from
 * these picks (see web's lib/characters/build-prompt-from-picks.ts) — no
 * LLM trait-extraction in the icon path: the picks ARE the structured
 * profile. `thumbnailKey` is an R2 key an illustration pipeline fills;
 * each app falls back to its FA icon when null.
 *
 * Keep this file pure: no Node / native / FA deps. Anything presentation
 * or server-only stays out.
 */

export type VoicePersonaKey =
  | "warm-girl-7yo"
  | "warm-boy-7yo"
  | "playful-girl-5yo"
  | "playful-boy-5yo"
  | "sleepy-neutral"
  | "brave-neutral"
  | "silly-neutral"
  | "gentle-neutral";

// ─── Species ──────────────────────────────────────────────────────────────

export type SpeciesKey =
  | "dragon"
  | "puppy"
  | "kitten"
  | "unicorn"
  | "robot"
  | "kid"
  | "fairy"
  | "monster";

export type SpeciesOption = {
  key: SpeciesKey;
  /** Tiny label shown under the icon for parents. */
  label: string;
  /** Singular noun fragment used when building the prompt. */
  noun: string;
  /** R2 key for the tile illustration; app falls back to its FA icon while null. */
  thumbnailKey: string | null;
};

export const SPECIES_OPTIONS: readonly SpeciesOption[] = [
  {
    key: "dragon",
    label: "Dragon",
    noun: "dragon",
    thumbnailKey: "character-thumbnails/species/dragon.png",
  },
  {
    key: "puppy",
    label: "Puppy",
    noun: "puppy",
    thumbnailKey: "character-thumbnails/species/puppy.png",
  },
  {
    key: "kitten",
    label: "Kitten",
    noun: "kitten",
    thumbnailKey: "character-thumbnails/species/kitten.png",
  },
  {
    key: "unicorn",
    label: "Unicorn",
    noun: "unicorn",
    thumbnailKey: "character-thumbnails/species/unicorn.png",
  },
  {
    key: "robot",
    label: "Robot",
    noun: "robot",
    thumbnailKey: "character-thumbnails/species/robot.png",
  },
  {
    key: "kid",
    label: "Kid",
    noun: "kid",
    thumbnailKey: "character-thumbnails/species/kid.png",
  },
  {
    key: "fairy",
    label: "Fairy",
    noun: "fairy",
    thumbnailKey: "character-thumbnails/species/fairy.png",
  },
  {
    key: "monster",
    label: "Monster",
    noun: "monster",
    thumbnailKey: "character-thumbnails/species/monster.png",
  },
] as const;

// ─── Colour ─────────────────────────────────────────────────────────────────

export type ColorKey =
  | "purple"
  | "orange"
  | "teal"
  | "pink"
  | "green"
  | "yellow";

export type ColorOption = {
  key: ColorKey;
  /** Tiny label shown under the swatch. */
  label: string;
  /** Adjective fragment used when building the prompt. */
  promptWord: string;
};

export const COLOR_OPTIONS: readonly ColorOption[] = [
  { key: "purple", label: "Purple", promptWord: "purple" },
  { key: "orange", label: "Orange", promptWord: "orange" },
  { key: "teal", label: "Teal", promptWord: "teal" },
  { key: "pink", label: "Pink", promptWord: "pink" },
  { key: "green", label: "Green", promptWord: "green" },
  { key: "yellow", label: "Yellow", promptWord: "yellow" },
] as const;

// ─── Traits ───────────────────────────────────────────────────────────────

export type TraitKey =
  | "brave"
  | "sleepy"
  | "silly"
  | "shy"
  | "loves-snacks"
  | "bouncy"
  | "curious"
  | "sparkly";

export type TraitOption = {
  key: TraitKey;
  /** Tiny label shown under the icon. */
  label: string;
  /** Phrase fragment used when building the prompt. */
  promptPhrase: string;
  /** Persona key suggestion if this is the first trait picked. */
  suggestedPersona: VoicePersonaKey;
  /** R2 key for the tile illustration; app falls back to its FA icon while null. */
  thumbnailKey: string | null;
};

export const TRAIT_OPTIONS: readonly TraitOption[] = [
  {
    key: "brave",
    label: "Brave",
    promptPhrase: "brave",
    suggestedPersona: "brave-neutral",
    thumbnailKey: "character-thumbnails/trait/brave.png",
  },
  {
    key: "sleepy",
    label: "Sleepy",
    promptPhrase: "sleepy",
    suggestedPersona: "sleepy-neutral",
    thumbnailKey: "character-thumbnails/trait/sleepy.png",
  },
  {
    key: "silly",
    label: "Silly",
    promptPhrase: "silly",
    suggestedPersona: "silly-neutral",
    thumbnailKey: "character-thumbnails/trait/silly.png",
  },
  {
    key: "shy",
    label: "Shy",
    promptPhrase: "shy and gentle",
    suggestedPersona: "gentle-neutral",
    thumbnailKey: "character-thumbnails/trait/shy.png",
  },
  {
    key: "loves-snacks",
    label: "Snacky",
    promptPhrase: "always hungry",
    suggestedPersona: "playful-girl-5yo",
    thumbnailKey: "character-thumbnails/trait/loves-snacks.png",
  },
  {
    key: "bouncy",
    label: "Bouncy",
    promptPhrase: "bouncy and full of energy",
    suggestedPersona: "playful-boy-5yo",
    thumbnailKey: "character-thumbnails/trait/bouncy.png",
  },
  {
    key: "curious",
    label: "Curious",
    promptPhrase: "curious about everything",
    suggestedPersona: "warm-girl-7yo",
    thumbnailKey: "character-thumbnails/trait/curious.png",
  },
  {
    key: "sparkly",
    label: "Sparkly",
    promptPhrase: "sparkly and bright",
    suggestedPersona: "warm-boy-7yo",
    thumbnailKey: "character-thumbnails/trait/sparkly.png",
  },
] as const;

/** Hard cap on trait picks. More than 3 confuses the image model. */
export const MAX_TRAITS = 3;

// ─── Voice personas ────────────────────────────────────────────────────────

export type VoiceTileOption = {
  key: VoicePersonaKey;
  /** Tiny label shown under the tile. */
  label: string;
  /** R2 key for the tile illustration; app falls back to its FA icon while null. */
  thumbnailKey: string | null;
};

export const VOICE_TILES: readonly VoiceTileOption[] = [
  {
    key: "warm-girl-7yo",
    label: "Warm",
    thumbnailKey: "character-thumbnails/voice/warm-girl-7yo.png",
  },
  {
    key: "warm-boy-7yo",
    label: "Cosy",
    thumbnailKey: "character-thumbnails/voice/warm-boy-7yo.png",
  },
  {
    key: "playful-girl-5yo",
    label: "Bouncy",
    thumbnailKey: "character-thumbnails/voice/playful-girl-5yo.png",
  },
  {
    key: "playful-boy-5yo",
    label: "Playful",
    thumbnailKey: "character-thumbnails/voice/playful-boy-5yo.png",
  },
  {
    key: "sleepy-neutral",
    label: "Sleepy",
    thumbnailKey: "character-thumbnails/voice/sleepy-neutral.png",
  },
  {
    key: "brave-neutral",
    label: "Brave",
    thumbnailKey: "character-thumbnails/voice/brave-neutral.png",
  },
  {
    key: "silly-neutral",
    label: "Silly",
    thumbnailKey: "character-thumbnails/voice/silly-neutral.png",
  },
  {
    key: "gentle-neutral",
    label: "Gentle",
    thumbnailKey: "character-thumbnails/voice/gentle-neutral.png",
  },
] as const;
