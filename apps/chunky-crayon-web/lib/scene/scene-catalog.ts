/**
 * Picker catalogues for the kid-driven Scene Builder — the privacy-first
 * default create mode.
 *
 * Five layers, all tap-only, zero typing (the whole point: no free-text,
 * mic or camera in the default path):
 *
 *   - SUBJECT_OPTIONS:  who/what is in the scene. MULTI-select, capped at
 *     MAX_SUBJECTS. Includes the `your-character` sentinel — picking it
 *     mixes the kid's saved Character into the scene (handled by the form,
 *     not this catalogue: the sentinel produces no prompt fragment here).
 *   - LOCATION_OPTIONS: where the scene happens. SINGLE-select.
 *   - WEATHER_OPTIONS:  weather / time of day. SINGLE-select, optional.
 *   - ACTIVITY_OPTIONS: what the subjects are doing. SINGLE-select, optional.
 *   - ACCENT_OPTIONS:   a decorative flourish. SINGLE-select, optional.
 *
 * Same idiom as `lib/characters/picker-catalog.ts`: typed keys, readonly
 * option arrays, per-item duotone palettes so the FA placeholder tiles read
 * as a playful rainbow rather than a mono-orange row
 * (`feedback_fontawesome_over_emojis`). `thumbnailKey` is null until the
 * Phase 7 asset pipeline fills it with a generated colourful illustration;
 * the FA `icon` is the permanent graceful fallback.
 *
 * The scene description string is built deterministically from these picks
 * (see lib/scene/build-scene-description.ts). No LLM is needed in the
 * picker path: the picks ARE the structured scene. The string rides the
 * existing text-mode pipeline (createPendingColoringImage) unchanged.
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
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

// ─── Shared types ───────────────────────────────────────────────────────────

/**
 * Each option gets a duotone palette so the FA placeholder tiles shine
 * before the generated illustrations land. CSS vars from the crayon
 * palette — same pattern as picker-catalog.ts — varied per option.
 */
export type DuotoneStyle = {
  primary: string; // CSS color string for --fa-primary-color
  secondary: string; // CSS color string for --fa-secondary-color
};

/** Common shape for every catalogue entry across the five layers. */
type SceneOptionBase = {
  /** Tiny label shown under the tile for parents who like to read. */
  label: string;
  /** FA fallback icon, shown until/if the generated thumbnail is missing. */
  icon: IconDefinition;
  /** Duotone palette for the FA fallback. */
  duotone: DuotoneStyle;
  /**
   * Colourful kid-style illustration for the tile. `null` until the Phase 7
   * `generate-scene-thumbnails` script populates it from R2. The tile
   * component falls back to `icon` when this is null or 404s.
   */
  thumbnailKey: string | null;
};

// ─── Subject (multi-select, capped) ─────────────────────────────────────────

export type SubjectKey =
  | 'your-character'
  | 'horse'
  | 'cow'
  | 'sheep'
  | 'dog'
  | 'cat'
  | 'fox'
  | 'lion'
  | 'fish'
  | 'dragon'
  | 'bird'
  | 'kid'
  | 'astronaut';

export type SubjectOption = SceneOptionBase & {
  key: SubjectKey;
  /**
   * Noun fragment used when building the scene description, e.g. `a horse`.
   * `null` for the `your-character` sentinel — the form substitutes the
   * real character name, this catalogue stays character-agnostic.
   */
  promptNoun: string | null;
};

export const SUBJECT_OPTIONS: readonly SubjectOption[] = [
  // Sentinel first so it's the obvious "add my own" affordance. No prompt
  // fragment — the create form swaps in the resolved Character.
  {
    key: 'your-character',
    label: 'My Character',
    icon: faStar,
    promptNoun: null,
    thumbnailKey: null,
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-pink))',
    },
  },
  {
    key: 'horse',
    label: 'Horse',
    icon: faHorse,
    promptNoun: 'a horse',
    thumbnailKey: 'scene-thumbnails/subject/horse.png',
    duotone: {
      primary: 'hsl(var(--crayon-orange))',
      secondary: 'hsl(var(--crayon-yellow))',
    },
  },
  {
    key: 'cow',
    label: 'Cow',
    icon: faCow,
    promptNoun: 'a cow',
    thumbnailKey: 'scene-thumbnails/subject/cow.png',
    duotone: {
      primary: 'hsl(var(--crayon-pink))',
      secondary: 'hsl(var(--crayon-purple))',
    },
  },
  {
    key: 'sheep',
    label: 'Sheep',
    icon: faSheep,
    promptNoun: 'a sheep',
    thumbnailKey: 'scene-thumbnails/subject/sheep.png',
    duotone: {
      primary: 'hsl(var(--crayon-teal))',
      secondary: 'hsl(var(--crayon-green))',
    },
  },
  {
    key: 'dog',
    label: 'Dog',
    icon: faDog,
    promptNoun: 'a dog',
    thumbnailKey: 'scene-thumbnails/subject/dog.png',
    duotone: {
      primary: 'hsl(var(--crayon-orange))',
      secondary: 'hsl(var(--crayon-teal))',
    },
  },
  {
    key: 'cat',
    label: 'Cat',
    icon: faCat,
    promptNoun: 'a cat',
    thumbnailKey: 'scene-thumbnails/subject/cat.png',
    duotone: {
      primary: 'hsl(var(--crayon-purple))',
      secondary: 'hsl(var(--crayon-pink))',
    },
  },
  // No pro-duotone fox/lion in the icon pool — a paw reads "wild animal"
  // and works as the fallback anchor. The generated thumbnail (Phase 7)
  // will show the actual animal; the prompt noun carries the real meaning.
  {
    key: 'fox',
    label: 'Fox',
    icon: faPaw,
    promptNoun: 'a fox',
    thumbnailKey: 'scene-thumbnails/subject/fox.png',
    duotone: {
      primary: 'hsl(var(--crayon-orange))',
      secondary: 'hsl(var(--crayon-yellow))',
    },
  },
  {
    key: 'lion',
    label: 'Lion',
    icon: faPaw,
    promptNoun: 'a lion',
    thumbnailKey: 'scene-thumbnails/subject/lion.png',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-orange))',
    },
  },
  {
    key: 'fish',
    label: 'Fish',
    icon: faFish,
    promptNoun: 'a fish',
    thumbnailKey: 'scene-thumbnails/subject/fish.png',
    duotone: {
      primary: 'hsl(var(--crayon-teal))',
      secondary: 'hsl(var(--crayon-purple))',
    },
  },
  {
    key: 'dragon',
    label: 'Dragon',
    icon: faDragon,
    promptNoun: 'a friendly dragon',
    thumbnailKey: 'scene-thumbnails/subject/dragon.png',
    duotone: {
      primary: 'hsl(var(--crayon-green))',
      secondary: 'hsl(var(--crayon-teal))',
    },
  },
  {
    key: 'bird',
    label: 'Bird',
    icon: faBird,
    promptNoun: 'a bird',
    thumbnailKey: 'scene-thumbnails/subject/bird.png',
    duotone: {
      primary: 'hsl(var(--crayon-teal))',
      secondary: 'hsl(var(--crayon-yellow))',
    },
  },
  {
    key: 'kid',
    label: 'Kid',
    icon: faChild,
    promptNoun: 'a happy child',
    thumbnailKey: 'scene-thumbnails/subject/kid.png',
    duotone: {
      primary: 'hsl(var(--crayon-orange))',
      secondary: 'hsl(var(--crayon-pink))',
    },
  },
  {
    key: 'astronaut',
    label: 'Astronaut',
    icon: faUserAstronaut,
    promptNoun: 'an astronaut',
    thumbnailKey: 'scene-thumbnails/subject/astronaut.png',
    duotone: {
      primary: 'hsl(var(--crayon-purple))',
      secondary: 'hsl(var(--crayon-teal))',
    },
  },
] as const;

/**
 * Hard cap on subjects. 2 keeps the mental model tiny for a 3-8yo (their
 * character + one friend) and stops gpt-image-2 from crowding the page,
 * which it does past ~2-3 subjects. The wizard's multi-select toggle
 * "slip-oldest" so a 3rd tap drops the oldest pick rather than rejecting
 * — kids never hit a "you can't pick another" wall. The `your-character`
 * sentinel counts toward this cap.
 */
export const MAX_SUBJECTS = 2;

// ─── Location (single-select, required) ─────────────────────────────────────

export type LocationKey =
  | 'beach'
  | 'sea'
  | 'football-game'
  | 'busy-street'
  | 'shopping-mall'
  | 'desert-island'
  | 'forest'
  | 'mountains'
  | 'train-station';

export type LocationOption = SceneOptionBase & {
  key: LocationKey;
  /** Place fragment, e.g. `at the beach`. Always present (required layer). */
  promptPhrase: string;
};

export const LOCATION_OPTIONS: readonly LocationOption[] = [
  {
    key: 'beach',
    label: 'Beach',
    icon: faUmbrellaBeach,
    promptPhrase: 'at the beach',
    thumbnailKey: 'scene-thumbnails/location/beach.png',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-teal))',
    },
  },
  {
    key: 'sea',
    label: 'At Sea',
    icon: faSailboat,
    promptPhrase: 'out at sea',
    thumbnailKey: 'scene-thumbnails/location/sea.png',
    duotone: {
      primary: 'hsl(var(--crayon-teal))',
      secondary: 'hsl(var(--crayon-purple))',
    },
  },
  {
    key: 'football-game',
    label: 'Football',
    icon: faFutbol,
    promptPhrase: 'at a football game',
    thumbnailKey: 'scene-thumbnails/location/football-game.png',
    duotone: {
      primary: 'hsl(var(--crayon-green))',
      secondary: 'hsl(var(--crayon-yellow))',
    },
  },
  {
    key: 'busy-street',
    label: 'Busy Street',
    icon: faCity,
    promptPhrase: 'on a busy street',
    thumbnailKey: 'scene-thumbnails/location/busy-street.png',
    duotone: {
      primary: 'hsl(var(--crayon-orange))',
      secondary: 'hsl(var(--crayon-purple))',
    },
  },
  {
    key: 'shopping-mall',
    label: 'Mall',
    icon: faStore,
    promptPhrase: 'in a shopping mall',
    thumbnailKey: 'scene-thumbnails/location/shopping-mall.png',
    duotone: {
      primary: 'hsl(var(--crayon-pink))',
      secondary: 'hsl(var(--crayon-orange))',
    },
  },
  {
    key: 'desert-island',
    label: 'Island',
    icon: faTreePalm,
    promptPhrase: 'on a desert island',
    thumbnailKey: 'scene-thumbnails/location/desert-island.png',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-green))',
    },
  },
  {
    key: 'forest',
    label: 'Forest',
    icon: faTree,
    promptPhrase: 'in a forest',
    thumbnailKey: 'scene-thumbnails/location/forest.png',
    duotone: {
      primary: 'hsl(var(--crayon-green))',
      secondary: 'hsl(var(--crayon-teal))',
    },
  },
  {
    key: 'mountains',
    label: 'Mountains',
    icon: faMountain,
    promptPhrase: 'in the mountains',
    thumbnailKey: 'scene-thumbnails/location/mountains.png',
    duotone: {
      primary: 'hsl(var(--crayon-purple))',
      secondary: 'hsl(var(--crayon-teal))',
    },
  },
  {
    key: 'train-station',
    label: 'Station',
    icon: faTrain,
    promptPhrase: 'at a train station',
    thumbnailKey: 'scene-thumbnails/location/train-station.png',
    duotone: {
      primary: 'hsl(var(--crayon-orange))',
      secondary: 'hsl(var(--crayon-yellow))',
    },
  },
] as const;

// ─── Weather / time of day (single-select, optional) ────────────────────────

export type WeatherKey =
  | 'sunny'
  | 'snowy'
  | 'rainy'
  | 'night'
  | 'rainbow'
  | 'cloudy';

export type WeatherOption = SceneOptionBase & {
  key: WeatherKey;
  /** Trailing fragment, e.g. `on a sunny day`. */
  promptPhrase: string;
};

export const WEATHER_OPTIONS: readonly WeatherOption[] = [
  {
    key: 'sunny',
    label: 'Sunny',
    icon: faSun,
    promptPhrase: 'on a sunny day',
    thumbnailKey: 'scene-thumbnails/weather/sunny.png',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-orange))',
    },
  },
  {
    key: 'snowy',
    label: 'Snowy',
    icon: faSnowflake,
    promptPhrase: 'on a snowy day',
    thumbnailKey: 'scene-thumbnails/weather/snowy.png',
    duotone: {
      primary: 'hsl(var(--crayon-teal))',
      secondary: 'hsl(var(--crayon-purple))',
    },
  },
  {
    key: 'rainy',
    label: 'Rainy',
    icon: faCloudRain,
    promptPhrase: 'on a rainy day',
    thumbnailKey: 'scene-thumbnails/weather/rainy.png',
    duotone: {
      primary: 'hsl(var(--crayon-teal))',
      secondary: 'hsl(var(--crayon-green))',
    },
  },
  {
    key: 'night',
    label: 'Night',
    icon: faMoon,
    promptPhrase: 'at night under the stars',
    thumbnailKey: 'scene-thumbnails/weather/night.png',
    duotone: {
      primary: 'hsl(var(--crayon-purple))',
      secondary: 'hsl(var(--crayon-yellow))',
    },
  },
  {
    key: 'rainbow',
    label: 'Rainbow',
    icon: faRainbow,
    promptPhrase: 'with a big rainbow in the sky',
    thumbnailKey: 'scene-thumbnails/weather/rainbow.png',
    duotone: {
      primary: 'hsl(var(--crayon-pink))',
      secondary: 'hsl(var(--crayon-teal))',
    },
  },
  {
    key: 'cloudy',
    label: 'Cloudy',
    icon: faCloud,
    promptPhrase: 'on a cloudy day',
    thumbnailKey: 'scene-thumbnails/weather/cloudy.png',
    duotone: {
      primary: 'hsl(var(--crayon-teal))',
      secondary: 'hsl(var(--crayon-orange))',
    },
  },
] as const;

// ─── Activity (single-select, optional) ─────────────────────────────────────

export type ActivityKey =
  | 'playing'
  | 'sleeping'
  | 'running'
  | 'swimming'
  | 'flying-a-kite'
  | 'riding-a-bike'
  | 'having-a-picnic'
  | 'dancing';

export type ActivityOption = SceneOptionBase & {
  key: ActivityKey;
  /** Verb fragment, e.g. `playing together`. */
  promptPhrase: string;
};

export const ACTIVITY_OPTIONS: readonly ActivityOption[] = [
  {
    key: 'playing',
    label: 'Playing',
    icon: faFutbol,
    promptPhrase: 'playing together',
    thumbnailKey: 'scene-thumbnails/activity/playing.png',
    duotone: {
      primary: 'hsl(var(--crayon-green))',
      secondary: 'hsl(var(--crayon-yellow))',
    },
  },
  {
    key: 'sleeping',
    label: 'Sleeping',
    icon: faMoon,
    promptPhrase: 'curled up sleeping',
    thumbnailKey: 'scene-thumbnails/activity/sleeping.png',
    duotone: {
      primary: 'hsl(var(--crayon-purple))',
      secondary: 'hsl(var(--crayon-teal))',
    },
  },
  {
    key: 'running',
    label: 'Running',
    icon: faPersonRunning,
    promptPhrase: 'running and playing',
    thumbnailKey: 'scene-thumbnails/activity/running.png',
    duotone: {
      primary: 'hsl(var(--crayon-orange))',
      secondary: 'hsl(var(--crayon-pink))',
    },
  },
  {
    key: 'swimming',
    label: 'Swimming',
    icon: faPersonSwimming,
    promptPhrase: 'swimming',
    thumbnailKey: 'scene-thumbnails/activity/swimming.png',
    duotone: {
      primary: 'hsl(var(--crayon-teal))',
      secondary: 'hsl(var(--crayon-purple))',
    },
  },
  {
    key: 'flying-a-kite',
    label: 'Kite',
    icon: faKite,
    promptPhrase: 'flying a kite',
    thumbnailKey: 'scene-thumbnails/activity/flying-a-kite.png',
    duotone: {
      primary: 'hsl(var(--crayon-pink))',
      secondary: 'hsl(var(--crayon-teal))',
    },
  },
  {
    key: 'riding-a-bike',
    label: 'Biking',
    icon: faBicycle,
    promptPhrase: 'riding a bike',
    thumbnailKey: 'scene-thumbnails/activity/riding-a-bike.png',
    duotone: {
      primary: 'hsl(var(--crayon-orange))',
      secondary: 'hsl(var(--crayon-yellow))',
    },
  },
  {
    key: 'having-a-picnic',
    label: 'Picnic',
    icon: faIceCream,
    promptPhrase: 'having a picnic',
    thumbnailKey: 'scene-thumbnails/activity/having-a-picnic.png',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-green))',
    },
  },
  {
    key: 'dancing',
    label: 'Dancing',
    icon: faMusic,
    promptPhrase: 'dancing',
    thumbnailKey: 'scene-thumbnails/activity/dancing.png',
    duotone: {
      primary: 'hsl(var(--crayon-pink))',
      secondary: 'hsl(var(--crayon-purple))',
    },
  },
] as const;

// ─── Accent / flourish (single-select, optional) ────────────────────────────

export type AccentKey =
  | 'birthday'
  | 'sparkles'
  | 'underwater-bubbles'
  | 'flowers'
  | 'space-stars'
  | 'balloons';

export type AccentOption = SceneOptionBase & {
  key: AccentKey;
  /** Trailing flourish fragment, e.g. `with party balloons everywhere`. */
  promptPhrase: string;
};

export const ACCENT_OPTIONS: readonly AccentOption[] = [
  {
    key: 'birthday',
    label: 'Birthday',
    icon: faCakeCandles,
    promptPhrase: 'with birthday party decorations',
    thumbnailKey: 'scene-thumbnails/accent/birthday.png',
    duotone: {
      primary: 'hsl(var(--crayon-pink))',
      secondary: 'hsl(var(--crayon-yellow))',
    },
  },
  {
    key: 'sparkles',
    label: 'Sparkles',
    icon: faStar,
    promptPhrase: 'with magical sparkles',
    thumbnailKey: 'scene-thumbnails/accent/sparkles.png',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-pink))',
    },
  },
  {
    key: 'underwater-bubbles',
    label: 'Bubbles',
    icon: faFish,
    promptPhrase: 'with underwater bubbles',
    thumbnailKey: 'scene-thumbnails/accent/underwater-bubbles.png',
    duotone: {
      primary: 'hsl(var(--crayon-teal))',
      secondary: 'hsl(var(--crayon-purple))',
    },
  },
  {
    key: 'flowers',
    label: 'Flowers',
    icon: faTree,
    promptPhrase: 'with lots of flowers',
    thumbnailKey: 'scene-thumbnails/accent/flowers.png',
    duotone: {
      primary: 'hsl(var(--crayon-green))',
      secondary: 'hsl(var(--crayon-pink))',
    },
  },
  {
    key: 'space-stars',
    label: 'Stars',
    icon: faRocket,
    promptPhrase: 'with stars and planets in the sky',
    thumbnailKey: 'scene-thumbnails/accent/space-stars.png',
    duotone: {
      primary: 'hsl(var(--crayon-purple))',
      secondary: 'hsl(var(--crayon-teal))',
    },
  },
  {
    key: 'balloons',
    label: 'Balloons',
    icon: faGift,
    promptPhrase: 'with party balloons everywhere',
    thumbnailKey: 'scene-thumbnails/accent/balloons.png',
    duotone: {
      primary: 'hsl(var(--crayon-orange))',
      secondary: 'hsl(var(--crayon-pink))',
    },
  },
] as const;

// ─── Aggregate (used by the random/dice picker + UI layer config) ───────────

/**
 * The five layers in render order. `kind` drives single vs multi select in
 * the UI and `required` drives the Create-button enable rule (only
 * subject + location are required for a valid scene).
 */
export const SCENE_LAYERS = [
  { id: 'subject', kind: 'multi', required: true },
  { id: 'location', kind: 'single', required: true },
  { id: 'weather', kind: 'single', required: false },
  { id: 'activity', kind: 'single', required: false },
  { id: 'accent', kind: 'single', required: false },
] as const;

export type SceneLayerId = (typeof SCENE_LAYERS)[number]['id'];
