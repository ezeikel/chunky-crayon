/**
 * Picker catalogues for the kid-driven Create Character flow — web view.
 *
 * The catalogue DATA (keys, labels, nouns, prompt fragments, thumbnailKeys,
 * suggested personas, MAX_TRAITS) now lives in the shared package
 * `@one-colored-pixel/coloring-core/characters` so web + mobile draw from a
 * single source of truth (same model as the scene catalogue). This module
 * layers web PRESENTATION on top — a per-key FA icon + duotone CSS-var
 * palette — and merges them into the option arrays consumers already import,
 * so every existing call site (`SPECIES_OPTIONS[i].icon`, etc.) keeps working.
 *
 * Mobile attaches its own icon/duotone(hex) map next to CharacterBuilder; it
 * never imports this file.
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
import {
  SPECIES_OPTIONS as SHARED_SPECIES,
  COLOR_OPTIONS as SHARED_COLORS,
  TRAIT_OPTIONS as SHARED_TRAITS,
  VOICE_TILES as SHARED_VOICE_TILES,
  MAX_TRAITS,
  type SpeciesKey,
  type ColorKey,
  type TraitKey,
  type VoicePersonaKey,
} from '@one-colored-pixel/coloring-core/characters';

// Re-export the shared bits consumers expect from this module.
export { MAX_TRAITS };
export type { SpeciesKey, ColorKey, TraitKey, VoicePersonaKey };

/**
 * Duotone palette for the FA tiles — CSS color strings for
 * `--fa-primary-color` / `--fa-secondary-color`. Web-only.
 *
 * Memory rule (`feedback_fontawesome_over_emojis.md`): vary colour
 * per-item; don't mono-orange a whole row.
 */
export type DuotoneStyle = {
  primary: string;
  secondary: string;
};

const cv = (primary: string, secondary: string): DuotoneStyle => ({
  primary: `hsl(var(--crayon-${primary}))`,
  secondary: `hsl(var(--crayon-${secondary}))`,
});

// ─── Species ──────────────────────────────────────────────────────────────

export type SpeciesOption = (typeof SHARED_SPECIES)[number] & {
  icon: IconDefinition;
  duotone: DuotoneStyle;
};

const SPECIES_PRESENTATION: Record<
  SpeciesKey,
  { icon: IconDefinition; duotone: DuotoneStyle }
> = {
  dragon: { icon: faDragon, duotone: cv('purple', 'pink') },
  puppy: { icon: faDog, duotone: cv('orange', 'yellow') },
  kitten: { icon: faCat, duotone: cv('pink', 'purple') },
  // No pro-duotone unicorn icon in the pool — a sparkle reads "magical".
  unicorn: { icon: faStarSparkle, duotone: cv('yellow', 'pink') },
  robot: { icon: faRobot, duotone: cv('teal', 'purple') },
  kid: { icon: faChildReaching, duotone: cv('orange', 'teal') },
  fairy: { icon: faHatWizard, duotone: cv('purple', 'yellow') },
  monster: { icon: faGhost, duotone: cv('green', 'teal') },
};

export const SPECIES_OPTIONS: readonly SpeciesOption[] = SHARED_SPECIES.map(
  (o) => ({ ...o, ...SPECIES_PRESENTATION[o.key] }),
);

// ─── Colour ─────────────────────────────────────────────────────────────────

export type ColorOption = (typeof SHARED_COLORS)[number] & {
  /** Tailwind background class for the swatch. */
  swatchClass: string;
};

const COLOR_SWATCH: Record<ColorKey, string> = {
  purple: 'bg-crayon-purple',
  orange: 'bg-crayon-orange',
  teal: 'bg-crayon-teal',
  pink: 'bg-crayon-pink',
  green: 'bg-crayon-green',
  yellow: 'bg-crayon-yellow',
};

export const COLOR_OPTIONS: readonly ColorOption[] = SHARED_COLORS.map((o) => ({
  ...o,
  swatchClass: COLOR_SWATCH[o.key],
}));

// ─── Traits ───────────────────────────────────────────────────────────────

export type TraitOption = (typeof SHARED_TRAITS)[number] & {
  icon: IconDefinition;
  duotone: DuotoneStyle;
};

const TRAIT_PRESENTATION: Record<
  TraitKey,
  { icon: IconDefinition; duotone: DuotoneStyle }
> = {
  brave: { icon: faShieldHalved, duotone: cv('orange', 'yellow') },
  sleepy: { icon: faMoon, duotone: cv('purple', 'teal') },
  silly: { icon: faFaceLaughBeam, duotone: cv('yellow', 'orange') },
  shy: { icon: faHeart, duotone: cv('pink', 'purple') },
  'loves-snacks': { icon: faCookie, duotone: cv('orange', 'pink') },
  bouncy: { icon: faBaseballBatBall, duotone: cv('green', 'teal') },
  curious: { icon: faMagnifyingGlass, duotone: cv('teal', 'green') },
  sparkly: { icon: faBolt, duotone: cv('yellow', 'pink') },
};

export const TRAIT_OPTIONS: readonly TraitOption[] = SHARED_TRAITS.map((o) => ({
  ...o,
  ...TRAIT_PRESENTATION[o.key],
}));

// ─── Voice personas ──────────────────────────────────────────────────────────

export type VoiceTileOption = (typeof SHARED_VOICE_TILES)[number] & {
  icon: IconDefinition;
  duotone: DuotoneStyle;
};

const VOICE_PRESENTATION: Record<
  VoicePersonaKey,
  { icon: IconDefinition; duotone: DuotoneStyle }
> = {
  'warm-girl-7yo': { icon: faFaceSmileBeam, duotone: cv('yellow', 'orange') },
  'warm-boy-7yo': { icon: faFaceSmile, duotone: cv('yellow', 'pink') },
  'playful-girl-5yo': { icon: faFaceGrinStars, duotone: cv('yellow', 'pink') },
  'playful-boy-5yo': { icon: faFaceGrinTongue, duotone: cv('yellow', 'green') },
  'sleepy-neutral': { icon: faFaceSleeping, duotone: cv('yellow', 'purple') },
  'brave-neutral': { icon: faFaceAwesome, duotone: cv('yellow', 'orange') },
  'silly-neutral': { icon: faFaceLaughBeam, duotone: cv('yellow', 'green') },
  'gentle-neutral': { icon: faFaceSmileRelaxed, duotone: cv('yellow', 'teal') },
};

export const VOICE_TILES: readonly VoiceTileOption[] = SHARED_VOICE_TILES.map(
  (o) => ({ ...o, ...VOICE_PRESENTATION[o.key] }),
);
