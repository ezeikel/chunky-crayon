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
 *   - `thumbnail` — the BUNDLED illustration PNG (require()'d), the same
 *     pattern as scene-thumbnails + profile avatars. We bundle 256² PNGs
 *     under assets/character-thumbnails/<layer>/ rather than fetching the
 *     1024² R2 originals at runtime, so tiles render instantly + offline +
 *     with no R2-URL env dependency. Resolved from the shared option's
 *     `thumbnailKey` via `thumb()`; falls back to the FA icon if missing.
 *   - `icon` + `duotone` — the FontAwesome fallback (shown only if the
 *     illustration is missing). Icon CHOICES + duotone PAIRINGS match web's
 *     picker-catalog; only the colour format differs (hex here,
 *     `hsl(var(--crayon-*))` on web).
 *   - colours map to their CRAYON hex swatch.
 *
 * To add an option: add it to the shared catalogue, generate + upload its
 * R2 illustration (scripts/generate-character-thumbnails.ts on web), then
 * download the PNG, `sips --resampleHeightWidth 256 256` it into
 * assets/character-thumbnails/<layer>/, and add the require() to
 * CHARACTER_THUMBNAILS below (Metro needs static literal require paths — no
 * dynamic require by key).
 *
 * Keeping icons + thumbnails out of the shared package stops @fortawesome +
 * the asset bundle bloating the worker (coloring-core is server-side too).
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

// Static literal require()s — Metro can't resolve dynamic require-by-key.
// Keys mirror the shared catalogue's `thumbnailKey`
// (character-thumbnails/<layer>/<key>.png). 256² PNGs, bundled.
const CHARACTER_THUMBNAILS: Record<string, ImageSourcePropType> = {
  // species
  "character-thumbnails/species/dragon.png": require("@/assets/character-thumbnails/species/dragon.png"),
  "character-thumbnails/species/puppy.png": require("@/assets/character-thumbnails/species/puppy.png"),
  "character-thumbnails/species/kitten.png": require("@/assets/character-thumbnails/species/kitten.png"),
  "character-thumbnails/species/unicorn.png": require("@/assets/character-thumbnails/species/unicorn.png"),
  "character-thumbnails/species/robot.png": require("@/assets/character-thumbnails/species/robot.png"),
  "character-thumbnails/species/kid.png": require("@/assets/character-thumbnails/species/kid.png"),
  "character-thumbnails/species/fairy.png": require("@/assets/character-thumbnails/species/fairy.png"),
  "character-thumbnails/species/monster.png": require("@/assets/character-thumbnails/species/monster.png"),
  // traits
  "character-thumbnails/trait/brave.png": require("@/assets/character-thumbnails/trait/brave.png"),
  "character-thumbnails/trait/sleepy.png": require("@/assets/character-thumbnails/trait/sleepy.png"),
  "character-thumbnails/trait/silly.png": require("@/assets/character-thumbnails/trait/silly.png"),
  "character-thumbnails/trait/shy.png": require("@/assets/character-thumbnails/trait/shy.png"),
  "character-thumbnails/trait/loves-snacks.png": require("@/assets/character-thumbnails/trait/loves-snacks.png"),
  "character-thumbnails/trait/bouncy.png": require("@/assets/character-thumbnails/trait/bouncy.png"),
  "character-thumbnails/trait/curious.png": require("@/assets/character-thumbnails/trait/curious.png"),
  "character-thumbnails/trait/sparkly.png": require("@/assets/character-thumbnails/trait/sparkly.png"),
  // voice personas
  "character-thumbnails/voice/warm-girl-7yo.png": require("@/assets/character-thumbnails/voice/warm-girl-7yo.png"),
  "character-thumbnails/voice/warm-boy-7yo.png": require("@/assets/character-thumbnails/voice/warm-boy-7yo.png"),
  "character-thumbnails/voice/playful-girl-5yo.png": require("@/assets/character-thumbnails/voice/playful-girl-5yo.png"),
  "character-thumbnails/voice/playful-boy-5yo.png": require("@/assets/character-thumbnails/voice/playful-boy-5yo.png"),
  "character-thumbnails/voice/sleepy-neutral.png": require("@/assets/character-thumbnails/voice/sleepy-neutral.png"),
  "character-thumbnails/voice/brave-neutral.png": require("@/assets/character-thumbnails/voice/brave-neutral.png"),
  "character-thumbnails/voice/silly-neutral.png": require("@/assets/character-thumbnails/voice/silly-neutral.png"),
  "character-thumbnails/voice/gentle-neutral.png": require("@/assets/character-thumbnails/voice/gentle-neutral.png"),
};

/** Resolve a shared catalogue thumbnailKey to its bundled PNG (or null). */
const thumb = (thumbnailKey: string | null): ImageSourcePropType | null =>
  thumbnailKey ? (CHARACTER_THUMBNAILS[thumbnailKey] ?? null) : null;

type IconPresentation = {
  icon: IconDefinition;
  duotone: DuotoneStyle;
};

// ─── Species ──────────────────────────────────────────────────────────────

export type SpeciesTile = (typeof SHARED_SPECIES)[number] &
  IconPresentation & { thumbnail: ImageSourcePropType | null };

const SPECIES_PRESENTATION: Record<SpeciesKey, IconPresentation> = {
  dragon: { icon: faDragon, duotone: cv("purple", "pink") },
  puppy: { icon: faDog, duotone: cv("orange", "yellow") },
  kitten: { icon: faCat, duotone: cv("pink", "purple") },
  unicorn: { icon: faStar, duotone: cv("yellow", "pink") },
  robot: { icon: faRobot, duotone: cv("teal", "purple") },
  kid: { icon: faChildReaching, duotone: cv("orange", "teal") },
  fairy: { icon: faHatWizard, duotone: cv("purple", "yellow") },
  monster: { icon: faGhost, duotone: cv("green", "teal") },
};

export const SPECIES_TILES: readonly SpeciesTile[] = SHARED_SPECIES.map(
  (o) => ({
    ...o,
    ...SPECIES_PRESENTATION[o.key],
    thumbnail: thumb(o.thumbnailKey),
  }),
);

// ─── Colour ─────────────────────────────────────────────────────────────────

export type ColorTile = (typeof SHARED_COLORS)[number] & { swatch: string };

export const COLOR_TILES: readonly ColorTile[] = SHARED_COLORS.map((o) => ({
  ...o,
  swatch: CRAYON[o.key as CrayonKey].base,
}));

// ─── Traits ───────────────────────────────────────────────────────────────

export type TraitTile = (typeof SHARED_TRAITS)[number] &
  IconPresentation & { thumbnail: ImageSourcePropType | null };

const TRAIT_PRESENTATION: Record<TraitKey, IconPresentation> = {
  brave: { icon: faShieldHalved, duotone: cv("orange", "yellow") },
  sleepy: { icon: faMoon, duotone: cv("purple", "teal") },
  silly: { icon: faFaceLaughBeam, duotone: cv("yellow", "orange") },
  shy: { icon: faHeart, duotone: cv("pink", "purple") },
  "loves-snacks": { icon: faCookie, duotone: cv("orange", "pink") },
  bouncy: { icon: faBaseballBatBall, duotone: cv("green", "teal") },
  curious: { icon: faMagnifyingGlass, duotone: cv("teal", "green") },
  sparkly: { icon: faBolt, duotone: cv("yellow", "pink") },
};

export const TRAIT_TILES: readonly TraitTile[] = SHARED_TRAITS.map((o) => ({
  ...o,
  ...TRAIT_PRESENTATION[o.key],
  thumbnail: thumb(o.thumbnailKey),
}));

// ─── Voice ──────────────────────────────────────────────────────────────────

export type VoiceTile = (typeof SHARED_VOICE_TILES)[number] &
  IconPresentation & { thumbnail: ImageSourcePropType | null };

const VOICE_PRESENTATION: Record<VoicePersonaKey, IconPresentation> = {
  "warm-girl-7yo": { icon: faFaceSmileBeam, duotone: cv("yellow", "orange") },
  "warm-boy-7yo": { icon: faFaceSmile, duotone: cv("yellow", "pink") },
  "playful-girl-5yo": { icon: faFaceGrinStars, duotone: cv("yellow", "pink") },
  "playful-boy-5yo": { icon: faFaceGrinTongue, duotone: cv("yellow", "green") },
  "sleepy-neutral": { icon: faFaceSleeping, duotone: cv("yellow", "purple") },
  "brave-neutral": { icon: faFaceAwesome, duotone: cv("yellow", "orange") },
  "silly-neutral": { icon: faFaceLaughBeam, duotone: cv("yellow", "green") },
  "gentle-neutral": { icon: faFaceSmileRelaxed, duotone: cv("yellow", "teal") },
};

export const VOICE_PERSONA_TILES: readonly VoiceTile[] = SHARED_VOICE_TILES.map(
  (o) => ({
    ...o,
    ...VOICE_PRESENTATION[o.key],
    thumbnail: thumb(o.thumbnailKey),
  }),
);
