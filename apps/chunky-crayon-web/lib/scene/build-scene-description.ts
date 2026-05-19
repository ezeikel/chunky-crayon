/**
 * Build a clean scene description from the kid's structured picks.
 *
 * The Scene Builder gives us fully structured input (subjects + location +
 * optional weather/activity/accent). That means no LLM is needed in this
 * path — we construct a guaranteed well-formed natural-language description
 * server-side-equivalent (it's a pure fn, callable from client or server)
 * and feed it straight into the existing text-mode pipeline
 * (`createPendingColoringImage({ mode: 'text', description })`).
 *
 * Output shape (deterministic, comma-light per `feedback_no_em_dashes` and
 * readability — no em dashes, plain sentence):
 *
 *   `<subjects> <location>[ <activity>][ <weather>][ <accent>]`
 *
 * Examples:
 *   a horse at the beach
 *   a dog and a cat in a forest playing together on a sunny day
 *   Sparky and a friendly dragon out at sea with magical sparkles
 *
 * The `your-character` subject is special: this builder is character-
 * agnostic, so the create form resolves the saved Character and passes its
 * display name in via `characterName`. If the sentinel is picked but no
 * name is supplied (character not yet resolved), the sentinel is dropped
 * from the subject list rather than emitting a dangling "and".
 *
 * Single point of correctness: a malformed description here produces a
 * confusing coloring page the kid paid credits for. Pinned by
 * build-scene-description.test.ts (ships in the same commit).
 */

import {
  SUBJECT_OPTIONS,
  LOCATION_OPTIONS,
  WEATHER_OPTIONS,
  ACTIVITY_OPTIONS,
  ACCENT_OPTIONS,
  type SubjectKey,
  type LocationKey,
  type WeatherKey,
  type ActivityKey,
  type AccentKey,
} from './scene-catalog';

export type ScenePicks = {
  /** 1..MAX_SUBJECTS subject keys. Order is preserved in the output. */
  subjects: readonly SubjectKey[];
  /** Required for a valid scene. */
  location: LocationKey | null;
  weather?: WeatherKey | null;
  activity?: ActivityKey | null;
  accent?: AccentKey | null;
  /**
   * Display name of the resolved saved Character, supplied by the create
   * form when the `your-character` sentinel is among `subjects`. Undefined
   * when the kid hasn't picked their character or it isn't resolved yet.
   */
  characterName?: string;
};

const subjectNoun = (
  key: SubjectKey,
  characterName?: string,
): string | null => {
  if (key === 'your-character') {
    // Character-agnostic catalogue: only emit a fragment if the form
    // resolved a real name. Otherwise the sentinel contributes nothing.
    return characterName?.trim() ? characterName.trim() : null;
  }
  return SUBJECT_OPTIONS.find((s) => s.key === key)?.promptNoun ?? null;
};

const locationPhrase = (key: LocationKey): string =>
  LOCATION_OPTIONS.find((l) => l.key === key)?.promptPhrase ?? '';

const weatherPhrase = (key: WeatherKey): string =>
  WEATHER_OPTIONS.find((w) => w.key === key)?.promptPhrase ?? '';

const activityPhrase = (key: ActivityKey): string =>
  ACTIVITY_OPTIONS.find((a) => a.key === key)?.promptPhrase ?? '';

const accentPhrase = (key: AccentKey): string =>
  ACCENT_OPTIONS.find((a) => a.key === key)?.promptPhrase ?? '';

/** "a" -> "a", "a and b" -> "a and b", "a, b, and c" for 3+. */
const joinSubjects = (nouns: string[]): string => {
  if (nouns.length === 1) return nouns[0];
  if (nouns.length === 2) return `${nouns[0]} and ${nouns[1]}`;
  return `${nouns.slice(0, -1).join(', ')}, and ${nouns[nouns.length - 1]}`;
};

/**
 * Pure picks -> description string. Never throws: an empty/invalid pick set
 * degrades gracefully (the form's Create-enable rule is the real guard;
 * this stays defensive so a stale client state can't crash the action).
 */
export const buildSceneDescription = (picks: ScenePicks): string => {
  const nouns = picks.subjects
    .map((k) => subjectNoun(k, picks.characterName))
    .filter((n): n is string => Boolean(n && n.trim()));

  // Defensive fallback: required layers missing. The form prevents this in
  // the happy path; keep a sensible string so a stale submit still yields
  // a colourable page rather than an empty prompt.
  if (nouns.length === 0 && !picks.location) {
    return 'a friendly animal in a happy scene';
  }

  const parts: string[] = [];
  if (nouns.length > 0) parts.push(joinSubjects(nouns));
  if (picks.location) parts.push(locationPhrase(picks.location));
  if (picks.activity) parts.push(activityPhrase(picks.activity));
  if (picks.weather) parts.push(weatherPhrase(picks.weather));
  if (picks.accent) parts.push(accentPhrase(picks.accent));

  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
};
