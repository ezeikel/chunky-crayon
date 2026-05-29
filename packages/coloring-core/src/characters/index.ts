/**
 * Character picker data + pure logic — the React-Native-safe subset.
 *
 * Exposed via the `@one-colored-pixel/coloring-core/characters` subpath so
 * the mobile app (Metro) can import the catalogue + name generator WITHOUT
 * dragging the package's root barrel (AI SDK, sharp, resvg, openai — all
 * Node-only). Same model as the `./scene` subpath.
 *
 * Everything here is pure: zero Node / native / FontAwesome deps. Per-option
 * PRESENTATION (FA icons + duotone palettes) lives in each app's UI layer,
 * keyed by `key`. Keep it that way — if a new character file pulls in
 * something Node-only or FA, do NOT add it to this barrel.
 *
 * NOT exported here (web/server-only): build-prompt-from-picks, portrait-prompt,
 * trait-extraction, voice-personas (reads env), voice-lines, outfits.
 */

export {
  SPECIES_OPTIONS,
  COLOR_OPTIONS,
  TRAIT_OPTIONS,
  VOICE_TILES,
  MAX_TRAITS,
} from "./picker-catalog";
export type {
  SpeciesKey,
  SpeciesOption,
  ColorKey,
  ColorOption,
  TraitKey,
  TraitOption,
  VoicePersonaKey,
  VoiceTileOption,
} from "./picker-catalog";

export { generateCharacterName } from "./name-generator";
