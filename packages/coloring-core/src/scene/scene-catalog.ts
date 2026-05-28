/**
 * Shared scene-builder catalogue — DATA ONLY.
 *
 * The kid-driven Scene Builder is CC's privacy-first default create mode:
 * five tap-only layers, zero typing. This catalogue is the single source
 * of truth for the option keys, labels, prompt fragments and thumbnail
 * keys across web AND mobile.
 *
 * Why data-only (no FA icons, no duotone): coloring-core is also imported
 * by the worker (server). Pulling @fortawesome icon data into it would
 * bloat the server bundle. So the per-option PRESENTATION (FA icon +
 * duotone palette) lives in each app's own layer, keyed by `key`:
 *   - web:    a key→{icon, duotone(css var)} map in the form's UI layer
 *   - mobile: a key→{icon, duotone(hex)} map next to the SceneBuilder
 * Both map against the SAME keys exported here, so the catalogue stays
 * the one place an option is added/removed.
 *
 * Five layers:
 *   - SUBJECT_OPTIONS:  who/what. MULTI-select, capped at MAX_SUBJECTS.
 *     Includes the `your-character` sentinel (promptNoun null — the form
 *     swaps in the resolved Character name; catalogue stays char-agnostic).
 *   - LOCATION_OPTIONS: where. SINGLE-select, required.
 *   - WEATHER_OPTIONS:  weather/time. SINGLE-select, optional.
 *   - ACTIVITY_OPTIONS: what they're doing. SINGLE-select, optional.
 *   - ACCENT_OPTIONS:   decorative flourish. SINGLE-select, optional.
 *
 * The scene description is built deterministically from picks (see
 * build-scene-description.ts) — no LLM in the picker path. `thumbnailKey`
 * is an R2 key (env-agnostic); the app resolves it to a full URL at
 * render time and falls back to the per-app FA icon when null/404.
 */

/** Common shape for every catalogue entry. Presentation lives per-app. */
type SceneOptionBase = {
  /** Tiny label shown under the tile. */
  label: string;
  /**
   * R2 key for the generated kid-style illustration. `null` until the
   * thumbnail pipeline fills it; the app falls back to its FA icon.
   */
  thumbnailKey: string | null;
};

// ─── Subject (multi-select, capped) ─────────────────────────────────────────

export type SubjectKey =
  | "your-character"
  | "horse"
  | "cow"
  | "sheep"
  | "dog"
  | "cat"
  | "fox"
  | "lion"
  | "fish"
  | "dragon"
  | "bird"
  | "kid"
  | "astronaut";

export type SubjectOption = SceneOptionBase & {
  key: SubjectKey;
  /**
   * Noun fragment for the description, e.g. `a horse`. `null` for the
   * `your-character` sentinel — the form substitutes the real name.
   */
  promptNoun: string | null;
};

export const SUBJECT_OPTIONS: readonly SubjectOption[] = [
  {
    key: "your-character",
    label: "My Character",
    promptNoun: null,
    thumbnailKey: null,
  },
  {
    key: "horse",
    label: "Horse",
    promptNoun: "a horse",
    thumbnailKey: "scene-thumbnails/subject/horse.png",
  },
  {
    key: "cow",
    label: "Cow",
    promptNoun: "a cow",
    thumbnailKey: "scene-thumbnails/subject/cow.png",
  },
  {
    key: "sheep",
    label: "Sheep",
    promptNoun: "a sheep",
    thumbnailKey: "scene-thumbnails/subject/sheep.png",
  },
  {
    key: "dog",
    label: "Dog",
    promptNoun: "a dog",
    thumbnailKey: "scene-thumbnails/subject/dog.png",
  },
  {
    key: "cat",
    label: "Cat",
    promptNoun: "a cat",
    thumbnailKey: "scene-thumbnails/subject/cat.png",
  },
  {
    key: "fox",
    label: "Fox",
    promptNoun: "a fox",
    thumbnailKey: "scene-thumbnails/subject/fox.png",
  },
  {
    key: "lion",
    label: "Lion",
    promptNoun: "a lion",
    thumbnailKey: "scene-thumbnails/subject/lion.png",
  },
  {
    key: "fish",
    label: "Fish",
    promptNoun: "a fish",
    thumbnailKey: "scene-thumbnails/subject/fish.png",
  },
  {
    key: "dragon",
    label: "Dragon",
    promptNoun: "a friendly dragon",
    thumbnailKey: "scene-thumbnails/subject/dragon.png",
  },
  {
    key: "bird",
    label: "Bird",
    promptNoun: "a bird",
    thumbnailKey: "scene-thumbnails/subject/bird.png",
  },
  {
    key: "kid",
    label: "Kid",
    promptNoun: "a happy child",
    thumbnailKey: "scene-thumbnails/subject/kid.png",
  },
  {
    key: "astronaut",
    label: "Astronaut",
    promptNoun: "an astronaut",
    thumbnailKey: "scene-thumbnails/subject/astronaut.png",
  },
] as const;

/**
 * Hard cap on subjects. 2 keeps the mental model tiny for a 3-8yo and
 * stops the image model crowding the page. The `your-character` sentinel
 * counts toward this cap.
 */
export const MAX_SUBJECTS = 2;

// ─── Location (single-select, required) ─────────────────────────────────────

export type LocationKey =
  | "beach"
  | "sea"
  | "football-game"
  | "busy-street"
  | "shopping-mall"
  | "desert-island"
  | "forest"
  | "mountains"
  | "train-station";

export type LocationOption = SceneOptionBase & {
  key: LocationKey;
  /** Place fragment, e.g. `at the beach`. Always present (required layer). */
  promptPhrase: string;
};

export const LOCATION_OPTIONS: readonly LocationOption[] = [
  {
    key: "beach",
    label: "Beach",
    promptPhrase: "at the beach",
    thumbnailKey: "scene-thumbnails/location/beach.png",
  },
  {
    key: "sea",
    label: "At Sea",
    promptPhrase: "out at sea",
    thumbnailKey: "scene-thumbnails/location/sea.png",
  },
  {
    key: "football-game",
    label: "Football",
    promptPhrase: "at a football game",
    thumbnailKey: "scene-thumbnails/location/football-game.png",
  },
  {
    key: "busy-street",
    label: "Busy Street",
    promptPhrase: "on a busy street",
    thumbnailKey: "scene-thumbnails/location/busy-street.png",
  },
  {
    key: "shopping-mall",
    label: "Mall",
    promptPhrase: "in a shopping mall",
    thumbnailKey: "scene-thumbnails/location/shopping-mall.png",
  },
  {
    key: "desert-island",
    label: "Island",
    promptPhrase: "on a desert island",
    thumbnailKey: "scene-thumbnails/location/desert-island.png",
  },
  {
    key: "forest",
    label: "Forest",
    promptPhrase: "in a forest",
    thumbnailKey: "scene-thumbnails/location/forest.png",
  },
  {
    key: "mountains",
    label: "Mountains",
    promptPhrase: "in the mountains",
    thumbnailKey: "scene-thumbnails/location/mountains.png",
  },
  {
    key: "train-station",
    label: "Station",
    promptPhrase: "at a train station",
    thumbnailKey: "scene-thumbnails/location/train-station.png",
  },
] as const;

// ─── Weather / time of day (single-select, optional) ────────────────────────

export type WeatherKey =
  | "sunny"
  | "snowy"
  | "rainy"
  | "night"
  | "rainbow"
  | "cloudy";

export type WeatherOption = SceneOptionBase & {
  key: WeatherKey;
  /** Trailing fragment, e.g. `on a sunny day`. */
  promptPhrase: string;
};

export const WEATHER_OPTIONS: readonly WeatherOption[] = [
  {
    key: "sunny",
    label: "Sunny",
    promptPhrase: "on a sunny day",
    thumbnailKey: "scene-thumbnails/weather/sunny.png",
  },
  {
    key: "snowy",
    label: "Snowy",
    promptPhrase: "on a snowy day",
    thumbnailKey: "scene-thumbnails/weather/snowy.png",
  },
  {
    key: "rainy",
    label: "Rainy",
    promptPhrase: "on a rainy day",
    thumbnailKey: "scene-thumbnails/weather/rainy.png",
  },
  {
    key: "night",
    label: "Night",
    promptPhrase: "at night under the stars",
    thumbnailKey: "scene-thumbnails/weather/night.png",
  },
  {
    key: "rainbow",
    label: "Rainbow",
    promptPhrase: "with a big rainbow in the sky",
    thumbnailKey: "scene-thumbnails/weather/rainbow.png",
  },
  {
    key: "cloudy",
    label: "Cloudy",
    promptPhrase: "on a cloudy day",
    thumbnailKey: "scene-thumbnails/weather/cloudy.png",
  },
] as const;

// ─── Activity (single-select, optional) ─────────────────────────────────────

export type ActivityKey =
  | "playing"
  | "sleeping"
  | "running"
  | "swimming"
  | "flying-a-kite"
  | "riding-a-bike"
  | "having-a-picnic"
  | "dancing";

export type ActivityOption = SceneOptionBase & {
  key: ActivityKey;
  /** Verb fragment, e.g. `playing together`. */
  promptPhrase: string;
};

export const ACTIVITY_OPTIONS: readonly ActivityOption[] = [
  {
    key: "playing",
    label: "Playing",
    promptPhrase: "playing together",
    thumbnailKey: "scene-thumbnails/activity/playing.png",
  },
  {
    key: "sleeping",
    label: "Sleeping",
    promptPhrase: "curled up sleeping",
    thumbnailKey: "scene-thumbnails/activity/sleeping.png",
  },
  {
    key: "running",
    label: "Running",
    promptPhrase: "running and playing",
    thumbnailKey: "scene-thumbnails/activity/running.png",
  },
  {
    key: "swimming",
    label: "Swimming",
    promptPhrase: "swimming",
    thumbnailKey: "scene-thumbnails/activity/swimming.png",
  },
  {
    key: "flying-a-kite",
    label: "Kite",
    promptPhrase: "flying a kite",
    thumbnailKey: "scene-thumbnails/activity/flying-a-kite.png",
  },
  {
    key: "riding-a-bike",
    label: "Biking",
    promptPhrase: "riding a bike",
    thumbnailKey: "scene-thumbnails/activity/riding-a-bike.png",
  },
  {
    key: "having-a-picnic",
    label: "Picnic",
    promptPhrase: "having a picnic",
    thumbnailKey: "scene-thumbnails/activity/having-a-picnic.png",
  },
  {
    key: "dancing",
    label: "Dancing",
    promptPhrase: "dancing",
    thumbnailKey: "scene-thumbnails/activity/dancing.png",
  },
] as const;

// ─── Accent / flourish (single-select, optional) ────────────────────────────

export type AccentKey =
  | "birthday"
  | "sparkles"
  | "underwater-bubbles"
  | "flowers"
  | "space-stars"
  | "balloons";

export type AccentOption = SceneOptionBase & {
  key: AccentKey;
  /** Trailing flourish fragment, e.g. `with party balloons everywhere`. */
  promptPhrase: string;
};

export const ACCENT_OPTIONS: readonly AccentOption[] = [
  {
    key: "birthday",
    label: "Birthday",
    promptPhrase: "with birthday party decorations",
    thumbnailKey: "scene-thumbnails/accent/birthday.png",
  },
  {
    key: "sparkles",
    label: "Sparkles",
    promptPhrase: "with magical sparkles",
    thumbnailKey: "scene-thumbnails/accent/sparkles.png",
  },
  {
    key: "underwater-bubbles",
    label: "Bubbles",
    promptPhrase: "with underwater bubbles",
    thumbnailKey: "scene-thumbnails/accent/underwater-bubbles.png",
  },
  {
    key: "flowers",
    label: "Flowers",
    promptPhrase: "with lots of flowers",
    thumbnailKey: "scene-thumbnails/accent/flowers.png",
  },
  {
    key: "space-stars",
    label: "Stars",
    promptPhrase: "with stars and planets in the sky",
    thumbnailKey: "scene-thumbnails/accent/space-stars.png",
  },
  {
    key: "balloons",
    label: "Balloons",
    promptPhrase: "with party balloons everywhere",
    thumbnailKey: "scene-thumbnails/accent/balloons.png",
  },
] as const;

// ─── Aggregate (used by the random/dice picker + UI layer config) ───────────

/**
 * The five layers in render order. `kind` drives single vs multi select in
 * the UI; `required` drives the Create-button enable rule (only subject +
 * location are required for a valid scene).
 */
export const SCENE_LAYERS = [
  { id: "subject", kind: "multi", required: true },
  { id: "location", kind: "single", required: true },
  { id: "weather", kind: "single", required: false },
  { id: "activity", kind: "single", required: false },
  { id: "accent", kind: "single", required: false },
] as const;
