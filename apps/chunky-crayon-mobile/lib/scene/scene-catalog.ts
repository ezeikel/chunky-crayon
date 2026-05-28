/**
 * Mobile presentation layer over the SHARED scene catalogue.
 *
 * The catalogue DATA (keys, labels, prompt fragments, thumbnail keys,
 * MAX_SUBJECTS, SCENE_LAYERS) lives in
 * `@one-colored-pixel/coloring-core/scene` (the RN-safe subpath — see that
 * package's `src/scene/index.ts` for why we don't import the root barrel).
 * Web + mobile share one source of truth: add a scene option once, both
 * platforms get it.
 *
 * This file re-attaches the MOBILE presentation onto each shared option,
 * keyed by `key`:
 *   - `thumbnail` — the BUNDLED illustration PNG (require()'d), the same
 *     pattern as profile avatars (see lib/avatars.ts). We bundle 256²
 *     PNGs under assets/scene-thumbnails/ rather than fetching the 1024²
 *     R2 originals at runtime, so tiles render instantly + offline + no
 *     R2-URL env dependency. Falls back to the FA icon if null.
 *   - `icon` + `duotone` — the FontAwesome fallback (shown only if the
 *     illustration is missing). Icon CHOICES + duotone PAIRINGS match
 *     web's scene-catalog exactly; only the colour format differs (hex
 *     here, CSS `hsl(var(--crayon-*))` on web).
 *
 * To add a scene option: add it to the shared catalogue, generate +
 * upload its R2 illustration, then download the PNG, `sips --resample-
 * HeightWidth 256 256` it into assets/scene-thumbnails/<layer>/, and add
 * the require() to SCENE_THUMBNAILS below (Metro needs static literal
 * require paths — no dynamic require by key).
 *
 * Keeping icons + thumbnails out of the shared package stops @fortawesome
 * + the asset bundle bloating the worker (coloring-core is server-side too).
 */

import {
  faHorse,
  faCow,
  faSheep,
  faDog,
  faCat,
  faFish,
  faDragon,
  faBird,
  faChild,
  faUserAstronaut,
  faUmbrellaBeach,
  faSailboat,
  faFutbol,
  faCity,
  faStore,
  faTreePalm,
  faTree,
  faMountain,
  faTrain,
  faSun,
  faSnowflake,
  faCloudRain,
  faMoon,
  faRainbow,
  faCloud,
  faPersonRunning,
  faPersonSwimming,
  faKite,
  faBicycle,
  faPaw,
  faIceCream,
  faCakeCandles,
  faStar,
  faGift,
  faMusic,
  faRocket,
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { ImageSourcePropType } from "react-native";
import {
  SUBJECT_OPTIONS as SHARED_SUBJECTS,
  LOCATION_OPTIONS as SHARED_LOCATIONS,
  WEATHER_OPTIONS as SHARED_WEATHER,
  ACTIVITY_OPTIONS as SHARED_ACTIVITIES,
  ACCENT_OPTIONS as SHARED_ACCENTS,
  MAX_SUBJECTS,
  SCENE_LAYERS,
  type SubjectKey,
  type LocationKey,
  type WeatherKey,
  type ActivityKey,
  type AccentKey,
  type SubjectOption as SharedSubjectOption,
  type LocationOption as SharedLocationOption,
  type WeatherOption as SharedWeatherOption,
  type ActivityOption as SharedActivityOption,
  type AccentOption as SharedAccentOption,
} from "@one-colored-pixel/coloring-core/scene";
import { CRAYON, type CrayonKey } from "@/lib/design";

// Re-export the shared bits consumers expect from this module.
export {
  MAX_SUBJECTS,
  SCENE_LAYERS,
  type SubjectKey,
  type LocationKey,
  type WeatherKey,
  type ActivityKey,
  type AccentKey,
};

/** Hex duotone palette for the FA placeholder tiles. */
export type DuotoneStyle = {
  primary: string;
  secondary: string;
};

// The FA fallback half of the presentation — what the per-key maps hold.
type IconPresentation = { icon: IconDefinition; duotone: DuotoneStyle };

// Full presentation merged onto each option: the FA fallback + the
// bundled illustration (the primary visual; FA shows only if null).
type Presentation = IconPresentation & {
  /** Bundled illustration PNG, or null → fall back to the FA icon. */
  thumbnail: ImageSourcePropType | null;
};

// Mirror of web's `cv()` — maps a crayon family key to its base hex for
// primary + secondary. (Web uses `hsl(var(--crayon-X))`; the underlying
// HSL values resolve to these exact hexes — see lib/design/colors.ts.)
const cv = (primary: CrayonKey, secondary: CrayonKey): DuotoneStyle => ({
  primary: CRAYON[primary].base,
  secondary: CRAYON[secondary].base,
});

// Bundled scene illustrations, keyed by the shared catalogue's
// `thumbnailKey`. Metro needs STATIC literal require() paths — we can't
// require(key) dynamically — so this map is exhaustive + maintained by
// hand alongside the catalogue. 256² PNGs (see file header for how they
// were produced). The `your-character` sentinel has thumbnailKey null
// and no entry here (it renders the FA star / add affordance instead).
const SCENE_THUMBNAILS: Record<string, ImageSourcePropType> = {
  // subjects
  "scene-thumbnails/subject/horse.png": require("@/assets/scene-thumbnails/subject/horse.png"),
  "scene-thumbnails/subject/cow.png": require("@/assets/scene-thumbnails/subject/cow.png"),
  "scene-thumbnails/subject/sheep.png": require("@/assets/scene-thumbnails/subject/sheep.png"),
  "scene-thumbnails/subject/dog.png": require("@/assets/scene-thumbnails/subject/dog.png"),
  "scene-thumbnails/subject/cat.png": require("@/assets/scene-thumbnails/subject/cat.png"),
  "scene-thumbnails/subject/fox.png": require("@/assets/scene-thumbnails/subject/fox.png"),
  "scene-thumbnails/subject/lion.png": require("@/assets/scene-thumbnails/subject/lion.png"),
  "scene-thumbnails/subject/fish.png": require("@/assets/scene-thumbnails/subject/fish.png"),
  "scene-thumbnails/subject/dragon.png": require("@/assets/scene-thumbnails/subject/dragon.png"),
  "scene-thumbnails/subject/bird.png": require("@/assets/scene-thumbnails/subject/bird.png"),
  "scene-thumbnails/subject/kid.png": require("@/assets/scene-thumbnails/subject/kid.png"),
  "scene-thumbnails/subject/astronaut.png": require("@/assets/scene-thumbnails/subject/astronaut.png"),
  // locations
  "scene-thumbnails/location/beach.png": require("@/assets/scene-thumbnails/location/beach.png"),
  "scene-thumbnails/location/sea.png": require("@/assets/scene-thumbnails/location/sea.png"),
  "scene-thumbnails/location/football-game.png": require("@/assets/scene-thumbnails/location/football-game.png"),
  "scene-thumbnails/location/busy-street.png": require("@/assets/scene-thumbnails/location/busy-street.png"),
  "scene-thumbnails/location/shopping-mall.png": require("@/assets/scene-thumbnails/location/shopping-mall.png"),
  "scene-thumbnails/location/desert-island.png": require("@/assets/scene-thumbnails/location/desert-island.png"),
  "scene-thumbnails/location/forest.png": require("@/assets/scene-thumbnails/location/forest.png"),
  "scene-thumbnails/location/mountains.png": require("@/assets/scene-thumbnails/location/mountains.png"),
  "scene-thumbnails/location/train-station.png": require("@/assets/scene-thumbnails/location/train-station.png"),
  // weather
  "scene-thumbnails/weather/sunny.png": require("@/assets/scene-thumbnails/weather/sunny.png"),
  "scene-thumbnails/weather/snowy.png": require("@/assets/scene-thumbnails/weather/snowy.png"),
  "scene-thumbnails/weather/rainy.png": require("@/assets/scene-thumbnails/weather/rainy.png"),
  "scene-thumbnails/weather/night.png": require("@/assets/scene-thumbnails/weather/night.png"),
  "scene-thumbnails/weather/rainbow.png": require("@/assets/scene-thumbnails/weather/rainbow.png"),
  "scene-thumbnails/weather/cloudy.png": require("@/assets/scene-thumbnails/weather/cloudy.png"),
  // activities
  "scene-thumbnails/activity/playing.png": require("@/assets/scene-thumbnails/activity/playing.png"),
  "scene-thumbnails/activity/sleeping.png": require("@/assets/scene-thumbnails/activity/sleeping.png"),
  "scene-thumbnails/activity/running.png": require("@/assets/scene-thumbnails/activity/running.png"),
  "scene-thumbnails/activity/swimming.png": require("@/assets/scene-thumbnails/activity/swimming.png"),
  "scene-thumbnails/activity/flying-a-kite.png": require("@/assets/scene-thumbnails/activity/flying-a-kite.png"),
  "scene-thumbnails/activity/riding-a-bike.png": require("@/assets/scene-thumbnails/activity/riding-a-bike.png"),
  "scene-thumbnails/activity/having-a-picnic.png": require("@/assets/scene-thumbnails/activity/having-a-picnic.png"),
  "scene-thumbnails/activity/dancing.png": require("@/assets/scene-thumbnails/activity/dancing.png"),
  // accents
  "scene-thumbnails/accent/birthday.png": require("@/assets/scene-thumbnails/accent/birthday.png"),
  "scene-thumbnails/accent/sparkles.png": require("@/assets/scene-thumbnails/accent/sparkles.png"),
  "scene-thumbnails/accent/underwater-bubbles.png": require("@/assets/scene-thumbnails/accent/underwater-bubbles.png"),
  "scene-thumbnails/accent/flowers.png": require("@/assets/scene-thumbnails/accent/flowers.png"),
  "scene-thumbnails/accent/space-stars.png": require("@/assets/scene-thumbnails/accent/space-stars.png"),
  "scene-thumbnails/accent/balloons.png": require("@/assets/scene-thumbnails/accent/balloons.png"),
};

/** Resolve a shared catalogue thumbnailKey to its bundled PNG (or null). */
const thumb = (thumbnailKey: string | null): ImageSourcePropType | null =>
  thumbnailKey ? (SCENE_THUMBNAILS[thumbnailKey] ?? null) : null;

// ─── Per-key FA presentation maps (icon + duotone) — match web exactly ──────
// Note: web maps `teal` to its --crayon-teal (the warm peach). Mobile's
// CRAYON.teal.base is the same #F1AE7E peach, so the pairings line up.

const SUBJECT_PRESENTATION: Record<SubjectKey, IconPresentation> = {
  "your-character": { icon: faStar, duotone: cv("yellow", "pink") },
  horse: { icon: faHorse, duotone: cv("orange", "yellow") },
  cow: { icon: faCow, duotone: cv("pink", "purple") },
  sheep: { icon: faSheep, duotone: cv("teal", "green") },
  dog: { icon: faDog, duotone: cv("orange", "teal") },
  cat: { icon: faCat, duotone: cv("purple", "pink") },
  fox: { icon: faPaw, duotone: cv("orange", "yellow") },
  lion: { icon: faPaw, duotone: cv("yellow", "orange") },
  fish: { icon: faFish, duotone: cv("teal", "purple") },
  dragon: { icon: faDragon, duotone: cv("green", "teal") },
  bird: { icon: faBird, duotone: cv("teal", "yellow") },
  kid: { icon: faChild, duotone: cv("orange", "pink") },
  astronaut: { icon: faUserAstronaut, duotone: cv("purple", "teal") },
};

const LOCATION_PRESENTATION: Record<LocationKey, IconPresentation> = {
  beach: { icon: faUmbrellaBeach, duotone: cv("yellow", "teal") },
  sea: { icon: faSailboat, duotone: cv("teal", "purple") },
  "football-game": { icon: faFutbol, duotone: cv("green", "yellow") },
  "busy-street": { icon: faCity, duotone: cv("orange", "purple") },
  "shopping-mall": { icon: faStore, duotone: cv("pink", "orange") },
  "desert-island": { icon: faTreePalm, duotone: cv("yellow", "green") },
  forest: { icon: faTree, duotone: cv("green", "teal") },
  mountains: { icon: faMountain, duotone: cv("purple", "teal") },
  "train-station": { icon: faTrain, duotone: cv("orange", "yellow") },
};

const WEATHER_PRESENTATION: Record<WeatherKey, IconPresentation> = {
  sunny: { icon: faSun, duotone: cv("yellow", "orange") },
  snowy: { icon: faSnowflake, duotone: cv("teal", "purple") },
  rainy: { icon: faCloudRain, duotone: cv("teal", "green") },
  night: { icon: faMoon, duotone: cv("purple", "yellow") },
  rainbow: { icon: faRainbow, duotone: cv("pink", "teal") },
  cloudy: { icon: faCloud, duotone: cv("teal", "orange") },
};

const ACTIVITY_PRESENTATION: Record<ActivityKey, IconPresentation> = {
  playing: { icon: faFutbol, duotone: cv("green", "yellow") },
  sleeping: { icon: faMoon, duotone: cv("purple", "teal") },
  running: { icon: faPersonRunning, duotone: cv("orange", "pink") },
  swimming: { icon: faPersonSwimming, duotone: cv("teal", "purple") },
  "flying-a-kite": { icon: faKite, duotone: cv("pink", "teal") },
  "riding-a-bike": { icon: faBicycle, duotone: cv("orange", "yellow") },
  "having-a-picnic": { icon: faIceCream, duotone: cv("yellow", "green") },
  dancing: { icon: faMusic, duotone: cv("pink", "purple") },
};

const ACCENT_PRESENTATION: Record<AccentKey, IconPresentation> = {
  birthday: { icon: faCakeCandles, duotone: cv("pink", "yellow") },
  sparkles: { icon: faStar, duotone: cv("yellow", "pink") },
  "underwater-bubbles": { icon: faFish, duotone: cv("teal", "purple") },
  flowers: { icon: faTree, duotone: cv("green", "pink") },
  "space-stars": { icon: faRocket, duotone: cv("purple", "teal") },
  balloons: { icon: faGift, duotone: cv("orange", "pink") },
};

// ─── Merged option types + arrays (shared data + mobile presentation) ───────

export type SubjectOption = SharedSubjectOption & Presentation;
export type LocationOption = SharedLocationOption & Presentation;
export type WeatherOption = SharedWeatherOption & Presentation;
export type ActivityOption = SharedActivityOption & Presentation;
export type AccentOption = SharedAccentOption & Presentation;

export const SUBJECT_OPTIONS: readonly SubjectOption[] = SHARED_SUBJECTS.map(
  (o) => ({
    ...o,
    ...SUBJECT_PRESENTATION[o.key],
    thumbnail: thumb(o.thumbnailKey),
  }),
);
export const LOCATION_OPTIONS: readonly LocationOption[] = SHARED_LOCATIONS.map(
  (o) => ({
    ...o,
    ...LOCATION_PRESENTATION[o.key],
    thumbnail: thumb(o.thumbnailKey),
  }),
);
export const WEATHER_OPTIONS: readonly WeatherOption[] = SHARED_WEATHER.map(
  (o) => ({
    ...o,
    ...WEATHER_PRESENTATION[o.key],
    thumbnail: thumb(o.thumbnailKey),
  }),
);
export const ACTIVITY_OPTIONS: readonly ActivityOption[] =
  SHARED_ACTIVITIES.map((o) => ({
    ...o,
    ...ACTIVITY_PRESENTATION[o.key],
    thumbnail: thumb(o.thumbnailKey),
  }));
export const ACCENT_OPTIONS: readonly AccentOption[] = SHARED_ACCENTS.map(
  (o) => ({
    ...o,
    ...ACCENT_PRESENTATION[o.key],
    thumbnail: thumb(o.thumbnailKey),
  }),
);
