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
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

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

export type SpeciesOption = {
  key: SpeciesKey;
  /** Tiny label shown under the icon for parents. */
  label: string;
  icon: IconDefinition;
  /** Singular noun fragment used when building shortPrompt. */
  noun: string;
};

export const SPECIES_OPTIONS: readonly SpeciesOption[] = [
  { key: 'dragon', label: 'Dragon', icon: faDragon, noun: 'dragon' },
  { key: 'puppy', label: 'Puppy', icon: faDog, noun: 'puppy' },
  { key: 'kitten', label: 'Kitten', icon: faCat, noun: 'kitten' },
  // No pro-duotone unicorn icon in the codebase's existing pool —
  // a star/sparkle reads "magical" and works as the unicorn anchor.
  { key: 'unicorn', label: 'Unicorn', icon: faStarSparkle, noun: 'unicorn' },
  { key: 'robot', label: 'Robot', icon: faRobot, noun: 'robot' },
  { key: 'kid', label: 'Kid', icon: faChildReaching, noun: 'kid' },
  { key: 'fairy', label: 'Fairy', icon: faHatWizard, noun: 'fairy' },
  { key: 'monster', label: 'Monster', icon: faGhost, noun: 'monster' },
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
};

export const TRAIT_OPTIONS: readonly TraitOption[] = [
  {
    key: 'brave',
    label: 'Brave',
    icon: faShieldHalved,
    promptPhrase: 'brave',
    suggestedPersona: 'brave-neutral',
  },
  {
    key: 'sleepy',
    label: 'Sleepy',
    icon: faMoon,
    promptPhrase: 'sleepy',
    suggestedPersona: 'sleepy-neutral',
  },
  {
    key: 'silly',
    label: 'Silly',
    icon: faFaceLaughBeam,
    promptPhrase: 'silly',
    suggestedPersona: 'silly-neutral',
  },
  {
    key: 'shy',
    label: 'Shy',
    icon: faHeart,
    promptPhrase: 'shy and gentle',
    suggestedPersona: 'gentle-neutral',
  },
  {
    key: 'loves-snacks',
    label: 'Snacky',
    icon: faCookie,
    promptPhrase: 'always hungry',
    suggestedPersona: 'playful-girl-5yo',
  },
  {
    key: 'bouncy',
    label: 'Bouncy',
    icon: faBaseballBatBall,
    promptPhrase: 'bouncy and full of energy',
    suggestedPersona: 'playful-boy-5yo',
  },
  {
    key: 'curious',
    label: 'Curious',
    icon: faMagnifyingGlass,
    promptPhrase: 'curious about everything',
    suggestedPersona: 'warm-girl-7yo',
  },
  {
    key: 'sparkly',
    label: 'Sparkly',
    icon: faBolt,
    promptPhrase: 'sparkly and bright',
    suggestedPersona: 'warm-boy-7yo',
  },
] as const;

/** Hard cap on how many traits a kid can pick. More than 3 confuses gpt-image-2. */
export const MAX_TRAITS = 3;
