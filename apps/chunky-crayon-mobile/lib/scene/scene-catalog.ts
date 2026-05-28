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
 * This file re-attaches the MOBILE presentation — the FontAwesome icon +
 * a HEX duotone palette — onto each shared option, keyed by `key`. The
 * icon CHOICES + duotone colour PAIRINGS match web's
 * `apps/chunky-crayon-web/lib/scene/scene-catalog.ts` exactly; only the
 * colour format differs (hex here, CSS `hsl(var(--crayon-*))` on web).
 *
 * Keeping icons out of the shared package stops @fortawesome bloating the
 * worker bundle (coloring-core is imported server-side too).
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

type Presentation = { icon: IconDefinition; duotone: DuotoneStyle };

// Mirror of web's `cv()` — maps a crayon family key to its base hex for
// primary + secondary. (Web uses `hsl(var(--crayon-X))`; the underlying
// HSL values resolve to these exact hexes — see lib/design/colors.ts.)
const cv = (primary: CrayonKey, secondary: CrayonKey): DuotoneStyle => ({
  primary: CRAYON[primary].base,
  secondary: CRAYON[secondary].base,
});

// ─── Per-key presentation maps (icon + duotone) — match web exactly ─────────
// Note: web maps `teal` to its --crayon-teal (the warm peach). Mobile's
// CRAYON.teal.base is the same #F1AE7E peach, so the pairings line up.

const SUBJECT_PRESENTATION: Record<SubjectKey, Presentation> = {
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

const LOCATION_PRESENTATION: Record<LocationKey, Presentation> = {
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

const WEATHER_PRESENTATION: Record<WeatherKey, Presentation> = {
  sunny: { icon: faSun, duotone: cv("yellow", "orange") },
  snowy: { icon: faSnowflake, duotone: cv("teal", "purple") },
  rainy: { icon: faCloudRain, duotone: cv("teal", "green") },
  night: { icon: faMoon, duotone: cv("purple", "yellow") },
  rainbow: { icon: faRainbow, duotone: cv("pink", "teal") },
  cloudy: { icon: faCloud, duotone: cv("teal", "orange") },
};

const ACTIVITY_PRESENTATION: Record<ActivityKey, Presentation> = {
  playing: { icon: faFutbol, duotone: cv("green", "yellow") },
  sleeping: { icon: faMoon, duotone: cv("purple", "teal") },
  running: { icon: faPersonRunning, duotone: cv("orange", "pink") },
  swimming: { icon: faPersonSwimming, duotone: cv("teal", "purple") },
  "flying-a-kite": { icon: faKite, duotone: cv("pink", "teal") },
  "riding-a-bike": { icon: faBicycle, duotone: cv("orange", "yellow") },
  "having-a-picnic": { icon: faIceCream, duotone: cv("yellow", "green") },
  dancing: { icon: faMusic, duotone: cv("pink", "purple") },
};

const ACCENT_PRESENTATION: Record<AccentKey, Presentation> = {
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
  (o) => ({ ...o, ...SUBJECT_PRESENTATION[o.key] }),
);
export const LOCATION_OPTIONS: readonly LocationOption[] = SHARED_LOCATIONS.map(
  (o) => ({ ...o, ...LOCATION_PRESENTATION[o.key] }),
);
export const WEATHER_OPTIONS: readonly WeatherOption[] = SHARED_WEATHER.map(
  (o) => ({ ...o, ...WEATHER_PRESENTATION[o.key] }),
);
export const ACTIVITY_OPTIONS: readonly ActivityOption[] =
  SHARED_ACTIVITIES.map((o) => ({ ...o, ...ACTIVITY_PRESENTATION[o.key] }));
export const ACCENT_OPTIONS: readonly AccentOption[] = SHARED_ACCENTS.map(
  (o) => ({ ...o, ...ACCENT_PRESENTATION[o.key] }),
);
