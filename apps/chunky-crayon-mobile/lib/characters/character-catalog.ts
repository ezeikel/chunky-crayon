/**
 * Mobile presentation layer over the SHARED character picker catalogue.
 *
 * The catalogue DATA (keys, labels, nouns, prompt fragments, thumbnailKeys,
 * suggested personas, MAX_TRAITS) lives in
 * `@one-colored-pixel/coloring-core/characters` (the RN-safe subpath). Web +
 * mobile share one source of truth — same model as the scene catalogue.
 *
 * This file re-attaches MOBILE presentation onto each shared option, keyed
 * by `key`:
 *   - `icon` + `duotone` — the FontAwesome tile visual (hex duotone). Icon
 *     CHOICES + duotone PAIRINGS match web's picker-catalog; only the colour
 *     format differs (hex here, `hsl(var(--crayon-*))` on web).
 *   - `thumbnail` — bundled illustration PNG (like scene/avatars). null for
 *     now → tiles show the FA icon; bundle the 256² PNGs later as polish
 *     (same pattern as scene-thumbnails).
 *   - colours map to their CRAYON hex swatch.
 *
 * Keeping icons out of the shared package stops @fortawesome bloating the
 * worker (coloring-core is server-side too).
 */

import {
  faDragon,
  faDog,
  faCat,
  faHatWizard,
  faRobot,
  faChildReaching,
  faGhost,
  faStar,
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
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { ImageSourcePropType } from "react-native";
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
} from "@one-colored-pixel/coloring-core/characters";
import { CRAYON, type CrayonKey } from "@/lib/design";

export { MAX_TRAITS };
export type { SpeciesKey, ColorKey, TraitKey, VoicePersonaKey };

export type DuotoneStyle = { primary: string; secondary: string };

const cv = (primary: CrayonKey, secondary: CrayonKey): DuotoneStyle => ({
  primary: CRAYON[primary].base,
  secondary: CRAYON[secondary].base,
});

type IconPresentation = {
  icon: IconDefinition;
  duotone: DuotoneStyle;
  thumbnail: ImageSourcePropType | null;
};

// ─── Species ──────────────────────────────────────────────────────────────

export type SpeciesTile = (typeof SHARED_SPECIES)[number] & IconPresentation;

const SPECIES_PRESENTATION: Record<SpeciesKey, IconPresentation> = {
  dragon: { icon: faDragon, duotone: cv("purple", "pink"), thumbnail: null },
  puppy: { icon: faDog, duotone: cv("orange", "yellow"), thumbnail: null },
  kitten: { icon: faCat, duotone: cv("pink", "purple"), thumbnail: null },
  unicorn: { icon: faStar, duotone: cv("yellow", "pink"), thumbnail: null },
  robot: { icon: faRobot, duotone: cv("teal", "purple"), thumbnail: null },
  kid: {
    icon: faChildReaching,
    duotone: cv("orange", "teal"),
    thumbnail: null,
  },
  fairy: {
    icon: faHatWizard,
    duotone: cv("purple", "yellow"),
    thumbnail: null,
  },
  monster: { icon: faGhost, duotone: cv("green", "teal"), thumbnail: null },
};

export const SPECIES_TILES: readonly SpeciesTile[] = SHARED_SPECIES.map(
  (o) => ({
    ...o,
    ...SPECIES_PRESENTATION[o.key],
  }),
);

// ─── Colour ─────────────────────────────────────────────────────────────────

export type ColorTile = (typeof SHARED_COLORS)[number] & { swatch: string };

export const COLOR_TILES: readonly ColorTile[] = SHARED_COLORS.map((o) => ({
  ...o,
  swatch: CRAYON[o.key as CrayonKey].base,
}));

// ─── Traits ───────────────────────────────────────────────────────────────

export type TraitTile = (typeof SHARED_TRAITS)[number] & IconPresentation;

const TRAIT_PRESENTATION: Record<TraitKey, IconPresentation> = {
  brave: {
    icon: faShieldHalved,
    duotone: cv("orange", "yellow"),
    thumbnail: null,
  },
  sleepy: { icon: faMoon, duotone: cv("purple", "teal"), thumbnail: null },
  silly: {
    icon: faFaceLaughBeam,
    duotone: cv("yellow", "orange"),
    thumbnail: null,
  },
  shy: { icon: faHeart, duotone: cv("pink", "purple"), thumbnail: null },
  "loves-snacks": {
    icon: faCookie,
    duotone: cv("orange", "pink"),
    thumbnail: null,
  },
  bouncy: {
    icon: faBaseballBatBall,
    duotone: cv("green", "teal"),
    thumbnail: null,
  },
  curious: {
    icon: faMagnifyingGlass,
    duotone: cv("teal", "green"),
    thumbnail: null,
  },
  sparkly: { icon: faBolt, duotone: cv("yellow", "pink"), thumbnail: null },
};

export const TRAIT_TILES: readonly TraitTile[] = SHARED_TRAITS.map((o) => ({
  ...o,
  ...TRAIT_PRESENTATION[o.key],
}));

// ─── Voice ──────────────────────────────────────────────────────────────────

export type VoiceTile = (typeof SHARED_VOICE_TILES)[number] & IconPresentation;

const VOICE_PRESENTATION: Record<VoicePersonaKey, IconPresentation> = {
  "warm-girl-7yo": {
    icon: faFaceSmileBeam,
    duotone: cv("yellow", "orange"),
    thumbnail: null,
  },
  "warm-boy-7yo": {
    icon: faFaceSmile,
    duotone: cv("yellow", "pink"),
    thumbnail: null,
  },
  "playful-girl-5yo": {
    icon: faFaceGrinStars,
    duotone: cv("yellow", "pink"),
    thumbnail: null,
  },
  "playful-boy-5yo": {
    icon: faFaceGrinTongue,
    duotone: cv("yellow", "green"),
    thumbnail: null,
  },
  "sleepy-neutral": {
    icon: faFaceSleeping,
    duotone: cv("yellow", "purple"),
    thumbnail: null,
  },
  "brave-neutral": {
    icon: faFaceAwesome,
    duotone: cv("yellow", "orange"),
    thumbnail: null,
  },
  "silly-neutral": {
    icon: faFaceLaughBeam,
    duotone: cv("yellow", "green"),
    thumbnail: null,
  },
  "gentle-neutral": {
    icon: faFaceSmileRelaxed,
    duotone: cv("yellow", "teal"),
    thumbnail: null,
  },
};

export const VOICE_PERSONA_TILES: readonly VoiceTile[] = SHARED_VOICE_TILES.map(
  (o) => ({ ...o, ...VOICE_PRESENTATION[o.key] }),
);
