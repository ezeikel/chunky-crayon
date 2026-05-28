/**
 * Dice-roll picker for the Scene Builder.
 *
 * Powers the "surprise me" dice button: a kid who doesn't want to choose
 * (or just loves the shuffle animation) taps the die and gets a complete,
 * always-valid scene. Seedable so the picker animation and the unit test
 * are deterministic — pass a seed for reproducibility, omit it for a fresh
 * random roll each tap.
 *
 * Rules baked in so the result is always a sensible coloring page:
 *   - 1..2 subjects (never the 3-cap — two animals already crowd a page;
 *     the manual picker still allows up to MAX_SUBJECTS).
 *   - Never auto-picks the `your-character` sentinel: the dice can't know
 *     if the kid has a saved character, and a dangling reference would
 *     confuse the prompt. Mixing the character in stays a deliberate tap.
 *   - Location is always set (required layer).
 *   - Weather / activity / accent: each independently ~60% chance of being
 *     included, so rolls vary between minimal and rich scenes.
 *
 * Pure + deterministic given a seed. Pinned by random-scene.test.ts.
 */

import {
  SUBJECT_OPTIONS,
  LOCATION_OPTIONS,
  WEATHER_OPTIONS,
  ACTIVITY_OPTIONS,
  ACCENT_OPTIONS,
} from "./scene-catalog";
import type {
  SubjectKey,
  LocationKey,
  WeatherKey,
  ActivityKey,
  AccentKey,
} from "./scene-catalog";

/**
 * Mulberry32 — tiny deterministic PRNG. We don't need crypto quality here;
 * we need "same seed -> same roll" for testable animations. Returns a
 * function yielding floats in [0, 1).
 */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T>(rand: () => number, arr: readonly T[]): T =>
  arr[Math.floor(rand() * arr.length)];

/** Subjects excluding the sentinel — the dice never auto-mixes a character. */
const ROLLABLE_SUBJECTS = SUBJECT_OPTIONS.filter(
  (s) => s.key !== "your-character",
);

/**
 * A dice roll always yields >=1 subject and a location (required layers),
 * with weather/activity/accent independently nullable. Assignable to
 * `ScenePicks` so it feeds `buildSceneDescription` directly.
 */
export type RandomSceneResult = {
  subjects: SubjectKey[];
  location: LocationKey;
  weather: WeatherKey | null;
  activity: ActivityKey | null;
  accent: AccentKey | null;
};

/**
 * Roll a complete, valid scene. `seed` makes it reproducible (used by the
 * shuffle animation + tests); omit for a fresh roll.
 */
export const rollRandomScene = (seed?: number): RandomSceneResult => {
  const rand = mulberry32(seed ?? Math.floor(Math.random() * 0xffffffff) >>> 0);

  // 1 or 2 distinct subjects.
  const wantTwo = rand() < 0.5;
  const first = pick(rand, ROLLABLE_SUBJECTS);
  const subjects = [first.key];
  if (wantTwo) {
    // Re-roll until distinct (small set, terminates fast).
    let second = pick(rand, ROLLABLE_SUBJECTS);
    let guard = 0;
    while (second.key === first.key && guard < 10) {
      second = pick(rand, ROLLABLE_SUBJECTS);
      guard += 1;
    }
    if (second.key !== first.key) subjects.push(second.key);
  }

  return {
    subjects,
    location: pick(rand, LOCATION_OPTIONS).key,
    weather: rand() < 0.6 ? pick(rand, WEATHER_OPTIONS).key : null,
    activity: rand() < 0.6 ? pick(rand, ACTIVITY_OPTIONS).key : null,
    accent: rand() < 0.6 ? pick(rand, ACCENT_OPTIONS).key : null,
  };
};
