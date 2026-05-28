/**
 * Scene Builder data + pure logic — the React-Native-safe subset.
 *
 * Exposed via the `@one-colored-pixel/coloring-core/scene` subpath so the
 * mobile app (Metro) can import the catalogue + deterministic builder
 * WITHOUT dragging the package's root barrel — which re-exports the AI
 * SDK, sharp, resvg, potrace, openai, etc. Those are Node-only native
 * deps and would crash the Metro bundle on sight.
 *
 * Everything re-exported here is pure: it imports only from sibling scene
 * modules and has zero Node / native dependencies. Keep it that way — if
 * a new scene file pulls in something Node-only, do NOT add it to this
 * barrel.
 *
 * NOT exported here (Node-only or unneeded on mobile): ./prompts (pulls
 * ../utils/copy), ./seasonal-calendar (server-side daily-gen only).
 */

export {
  SUBJECT_OPTIONS,
  LOCATION_OPTIONS,
  WEATHER_OPTIONS,
  ACTIVITY_OPTIONS,
  ACCENT_OPTIONS,
  MAX_SUBJECTS,
  SCENE_LAYERS,
} from "./scene-catalog";
export type {
  SubjectKey,
  LocationKey,
  WeatherKey,
  ActivityKey,
  AccentKey,
  SubjectOption,
  LocationOption,
  WeatherOption,
  ActivityOption,
  AccentOption,
} from "./scene-catalog";
export { buildSceneDescription } from "./build-scene-description";
export type { ScenePicks } from "./build-scene-description";
export { rollRandomScene } from "./random-scene";
export type { RandomSceneResult } from "./random-scene";
export { GATEABLE_MODES, isGateableMode } from "./modes";
export type { GateableMode } from "./modes";
