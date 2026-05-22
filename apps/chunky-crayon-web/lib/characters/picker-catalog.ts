/**
 * Picker catalogues for the kid-driven Create Character flow.
 *
 * Three pickers, all icon-first:
 *
 *   - SPECIES_OPTIONS: 8 creature types. Tap the icon to pick.
 *   - COLOR_OPTIONS: 6 brand-palette colours. Drives the character's
 *     primary colour and is the strongest signal we can give gpt-image-2.
 *   - TRAIT_OPTIONS: 8 personality traits with an icon each. Multi-select
 *     up to 3. These become Character.traits AND get inlined into the
 *     generated prompt as the personality cue.
 *
 * Everything is constructed so that a 3-8yo can complete the picker with
 * zero typing — every choice is a chunky icon tap with a small text label
 * underneath for parents who like to read.
 *
 * The server constructs `shortPrompt` deterministically from these picks
 * (see lib/characters/build-prompt-from-picks.ts). No LLM trait-extraction
 * is needed in the icon path: the picks ARE the structured profile.
 */

import {
  faDragon,
  faDog,
  faCat,
  faHatWizard,
  faRobot,
  faChildReaching,
  faGhost,
  faStar as faStarSparkle,
  faBolt,
  faMoon,
  faFaceLaughBeam,
  faShieldHalved,
  faCookie,
  faHeart,
  faBaseballBatBall,
  faMagnifyingGlass,
  faFaceSmileBeam,
  faFaceGrinStars,
  faFaceSmile,
  faFaceSleeping,
  faFaceAwesome,
  faFaceGrinTongue,
  faFaceSmileRelaxed,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { VoicePersonaKey } from './voice-persona-types';

// ─── Species ──────────────────────────────────────────────────────────────

export type SpeciesKey =
  | 'dragon'
  | 'puppy'
  | 'kitten'
  | 'unicorn'
  | 'robot'
  | 'kid'
  | 'fairy'
  | 'monster';

/**
 * Each option gets a duotone palette so the FA icons actually shine. We
 * read CSS vars from the crayon palette — same pattern as
 * ParentalGateModal — and vary them per option so the grid pops as a
 * playful rainbow rather than a row of identical grey shapes.
 *
 * Memory rule (`feedback_fontawesome_over_emojis.md`): vary colour
 * per-item; don't mono-orange a whole row.
 */
export type DuotoneStyle = {
  primary: string; // CSS color string for --fa-primary-color
  secondary: string; // CSS color string for --fa-secondary-color
};

export type SpeciesOption = {
  key: SpeciesKey;
  /** Tiny label shown under the icon for parents. */
  label: string;
  icon: IconDefinition;
  /** Singular noun fragment used when building shortPrompt. */
  noun: string;
  /** Duotone palette for the icon (FA fallback when no illustration). */
  duotone: DuotoneStyle;
  /**
   * R2 key for the tile illustration, e.g.
   * `character-thumbnails/species/dragon.png`. Resolved to a public URL
   * at render time via `resolveThumbnailUrl`. `null` until the
   * generation script (`generate-character-thumbnails.ts`) fills it;
   * the SceneTile falls back to the FA `icon` while null.
   */
  thumbnailKey: string | null;
};

export const SPECIES_OPTIONS: readonly SpeciesOption[] = [
  {
    key: 'dragon',
    label: 'Dragon',
    icon: faDragon,
    noun: 'dragon',
    duotone: {
      primary: 'hsl(var(--crayon-purple))',
      secondary: 'hsl(var(--crayon-pink))',
    },
    thumbnailKey: 'character-thumbnails/species/dragon.png',
  },
  {
    key: 'puppy',
    label: 'Puppy',
    icon: faDog,
    noun: 'puppy',
    duotone: {
      primary: 'hsl(var(--crayon-orange))',
      secondary: 'hsl(var(--crayon-yellow))',
    },
    thumbnailKey: 'character-thumbnails/species/puppy.png',
  },
  {
    key: 'kitten',
    label: 'Kitten',
    icon: faCat,
    noun: 'kitten',
    duotone: {
      primary: 'hsl(var(--crayon-pink))',
      secondary: 'hsl(var(--crayon-purple))',
    },
    thumbnailKey: 'character-thumbnails/species/kitten.png',
  },
  // No pro-duotone unicorn icon in the codebase's existing pool —
  // a star/sparkle reads "magical" and works as the unicorn anchor.
  {
    key: 'unicorn',
    label: 'Unicorn',
    icon: faStarSparkle,
    noun: 'unicorn',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-pink))',
    },
    thumbnailKey: 'character-thumbnails/species/unicorn.png',
  },
  {
    key: 'robot',
    label: 'Robot',
    icon: faRobot,
    noun: 'robot',
    duotone: {
      primary: 'hsl(var(--crayon-teal))',
      secondary: 'hsl(var(--crayon-purple))',
    },
    thumbnailKey: 'character-thumbnails/species/robot.png',
  },
  {
    key: 'kid',
    label: 'Kid',
    icon: faChildReaching,
    noun: 'kid',
    duotone: {
      primary: 'hsl(var(--crayon-orange))',
      secondary: 'hsl(var(--crayon-teal))',
    },
    thumbnailKey: 'character-thumbnails/species/kid.png',
  },
  {
    key: 'fairy',
    label: 'Fairy',
    icon: faHatWizard,
    noun: 'fairy',
    duotone: {
      primary: 'hsl(var(--crayon-purple))',
      secondary: 'hsl(var(--crayon-yellow))',
    },
    thumbnailKey: 'character-thumbnails/species/fairy.png',
  },
  {
    key: 'monster',
    label: 'Monster',
    icon: faGhost,
    noun: 'monster',
    duotone: {
      primary: 'hsl(var(--crayon-green))',
      secondary: 'hsl(var(--crayon-teal))',
    },
    thumbnailKey: 'character-thumbnails/species/monster.png',
  },
] as const;

// ─── Color ────────────────────────────────────────────────────────────────

export type ColorKey =
  | 'purple'
  | 'orange'
  | 'teal'
  | 'pink'
  | 'green'
  | 'yellow';

export type ColorOption = {
  key: ColorKey;
  /** Tiny label shown under the swatch. */
  label: string;
  /** Tailwind background class for the swatch. Uses CC's crayon palette. */
  swatchClass: string;
  /** Adjective fragment used when building shortPrompt. */
  promptWord: string;
};

export const COLOR_OPTIONS: readonly ColorOption[] = [
  {
    key: 'purple',
    label: 'Purple',
    swatchClass: 'bg-crayon-purple',
    promptWord: 'purple',
  },
  {
    key: 'orange',
    label: 'Orange',
    swatchClass: 'bg-crayon-orange',
    promptWord: 'orange',
  },
  {
    key: 'teal',
    label: 'Teal',
    swatchClass: 'bg-crayon-teal',
    promptWord: 'teal',
  },
  {
    key: 'pink',
    label: 'Pink',
    swatchClass: 'bg-crayon-pink',
    promptWord: 'pink',
  },
  {
    key: 'green',
    label: 'Green',
    swatchClass: 'bg-crayon-green',
    promptWord: 'green',
  },
  {
    key: 'yellow',
    label: 'Yellow',
    swatchClass: 'bg-crayon-yellow',
    promptWord: 'yellow',
  },
] as const;

// ─── Traits ───────────────────────────────────────────────────────────────

export type TraitKey =
  | 'brave'
  | 'sleepy'
  | 'silly'
  | 'shy'
  | 'loves-snacks'
  | 'bouncy'
  | 'curious'
  | 'sparkly';

export type TraitOption = {
  key: TraitKey;
  /** Tiny label shown under the icon. */
  label: string;
  icon: IconDefinition;
  /** Phrase fragment used when building shortPrompt. */
  promptPhrase: string;
  /** Persona key suggestion if this is the first trait picked. */
  suggestedPersona:
    | 'warm-girl-7yo'
    | 'warm-boy-7yo'
    | 'playful-girl-5yo'
    | 'playful-boy-5yo'
    | 'sleepy-neutral'
    | 'brave-neutral'
    | 'silly-neutral'
    | 'gentle-neutral';
  /** Duotone palette so the trait icons read as a playful rainbow. */
  duotone: DuotoneStyle;
  /**
   * R2 key for the tile illustration (FA `icon` is the fallback).
   * `null` until `generate-character-thumbnails.ts` fills it.
   */
  thumbnailKey: string | null;
};

export const TRAIT_OPTIONS: readonly TraitOption[] = [
  {
    key: 'brave',
    label: 'Brave',
    icon: faShieldHalved,
    promptPhrase: 'brave',
    suggestedPersona: 'brave-neutral',
    duotone: {
      primary: 'hsl(var(--crayon-orange))',
      secondary: 'hsl(var(--crayon-yellow))',
    },
    thumbnailKey: 'character-thumbnails/trait/brave.png',
  },
  {
    key: 'sleepy',
    label: 'Sleepy',
    icon: faMoon,
    promptPhrase: 'sleepy',
    suggestedPersona: 'sleepy-neutral',
    duotone: {
      primary: 'hsl(var(--crayon-purple))',
      secondary: 'hsl(var(--crayon-teal))',
    },
    thumbnailKey: 'character-thumbnails/trait/sleepy.png',
  },
  {
    key: 'silly',
    label: 'Silly',
    icon: faFaceLaughBeam,
    promptPhrase: 'silly',
    suggestedPersona: 'silly-neutral',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-orange))',
    },
    thumbnailKey: 'character-thumbnails/trait/silly.png',
  },
  {
    key: 'shy',
    label: 'Shy',
    icon: faHeart,
    promptPhrase: 'shy and gentle',
    suggestedPersona: 'gentle-neutral',
    duotone: {
      primary: 'hsl(var(--crayon-pink))',
      secondary: 'hsl(var(--crayon-purple))',
    },
    thumbnailKey: 'character-thumbnails/trait/shy.png',
  },
  {
    key: 'loves-snacks',
    label: 'Snacky',
    icon: faCookie,
    promptPhrase: 'always hungry',
    suggestedPersona: 'playful-girl-5yo',
    duotone: {
      primary: 'hsl(var(--crayon-orange))',
      secondary: 'hsl(var(--crayon-pink))',
    },
    thumbnailKey: 'character-thumbnails/trait/loves-snacks.png',
  },
  {
    key: 'bouncy',
    label: 'Bouncy',
    icon: faBaseballBatBall,
    promptPhrase: 'bouncy and full of energy',
    suggestedPersona: 'playful-boy-5yo',
    duotone: {
      primary: 'hsl(var(--crayon-green))',
      secondary: 'hsl(var(--crayon-teal))',
    },
    thumbnailKey: 'character-thumbnails/trait/bouncy.png',
  },
  {
    key: 'curious',
    label: 'Curious',
    icon: faMagnifyingGlass,
    promptPhrase: 'curious about everything',
    suggestedPersona: 'warm-girl-7yo',
    duotone: {
      primary: 'hsl(var(--crayon-teal))',
      secondary: 'hsl(var(--crayon-green))',
    },
    thumbnailKey: 'character-thumbnails/trait/curious.png',
  },
  {
    key: 'sparkly',
    label: 'Sparkly',
    icon: faBolt,
    promptPhrase: 'sparkly and bright',
    suggestedPersona: 'warm-boy-7yo',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-pink))',
    },
    thumbnailKey: 'character-thumbnails/trait/sparkly.png',
  },
] as const;

/** Hard cap on how many traits a kid can pick. More than 3 confuses gpt-image-2. */
export const MAX_TRAITS = 3;

// ─── Voice personas ────────────────────────────────────────────────────────

/**
 * Voice persona picker tiles. Moved here from CreateCharacterModal so the
 * thumbnail-generation script has one catalog to read. Decoupled from
 * voice-personas.ts (which reads env vars and must stay server-only) —
 * keys MUST stay aligned with VoicePersonaKey.
 *
 * Like species + traits, each tile carries an FA `icon` fallback and a
 * `thumbnailKey` the generation script fills with an illustration.
 */
export type VoiceTileOption = {
  key: VoicePersonaKey;
  /** Tiny label shown under the tile. */
  label: string;
  icon: IconDefinition;
  duotone: DuotoneStyle;
  thumbnailKey: string | null;
};

export const VOICE_TILES: readonly VoiceTileOption[] = [
  {
    key: 'warm-girl-7yo',
    label: 'Warm',
    icon: faFaceSmileBeam,
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-orange))',
    },
    thumbnailKey: 'character-thumbnails/voice/warm-girl-7yo.png',
  },
  {
    key: 'warm-boy-7yo',
    label: 'Cosy',
    icon: faFaceSmile,
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-pink))',
    },
    thumbnailKey: 'character-thumbnails/voice/warm-boy-7yo.png',
  },
  {
    key: 'playful-girl-5yo',
    label: 'Bouncy',
    icon: faFaceGrinStars,
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-pink))',
    },
    thumbnailKey: 'character-thumbnails/voice/playful-girl-5yo.png',
  },
  {
    key: 'playful-boy-5yo',
    label: 'Playful',
    icon: faFaceGrinTongue,
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-green))',
    },
    thumbnailKey: 'character-thumbnails/voice/playful-boy-5yo.png',
  },
  {
    key: 'sleepy-neutral',
    label: 'Sleepy',
    icon: faFaceSleeping,
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-purple))',
    },
    thumbnailKey: 'character-thumbnails/voice/sleepy-neutral.png',
  },
  {
    key: 'brave-neutral',
    label: 'Brave',
    icon: faFaceAwesome,
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-orange))',
    },
    thumbnailKey: 'character-thumbnails/voice/brave-neutral.png',
  },
  {
    key: 'silly-neutral',
    label: 'Silly',
    icon: faFaceLaughBeam,
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-green))',
    },
    thumbnailKey: 'character-thumbnails/voice/silly-neutral.png',
  },
  {
    key: 'gentle-neutral',
    label: 'Gentle',
    icon: faFaceSmileRelaxed,
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-teal))',
    },
    thumbnailKey: 'character-thumbnails/voice/gentle-neutral.png',
  },
] as const;
