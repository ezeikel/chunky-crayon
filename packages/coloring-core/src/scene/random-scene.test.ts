import { describe, expect, it } from "vitest";
import { rollRandomScene } from "./random-scene";
import { buildSceneDescription } from "./build-scene-description";
import {
  LOCATION_OPTIONS,
  WEATHER_OPTIONS,
  ACTIVITY_OPTIONS,
  ACCENT_OPTIONS,
} from "./scene-catalog";

/**
 * The dice button must always produce a valid, colourable scene. A roll
 * that yields the `your-character` sentinel (dangling reference), an empty
 * subject list, or a missing location would either confuse the prompt or
 * waste a credit. Determinism under a seed is required for the shuffle
 * animation to replay and for these assertions to be stable.
 */

const locationKeys = new Set(LOCATION_OPTIONS.map((o) => o.key));
const weatherKeys = new Set(WEATHER_OPTIONS.map((o) => o.key));
const activityKeys = new Set(ACTIVITY_OPTIONS.map((o) => o.key));
const accentKeys = new Set(ACCENT_OPTIONS.map((o) => o.key));

describe("rollRandomScene", () => {
  it("is deterministic for a given seed", () => {
    expect(rollRandomScene(12345)).toEqual(rollRandomScene(12345));
  });

  it("different seeds generally differ", () => {
    const a = JSON.stringify(rollRandomScene(1));
    const b = JSON.stringify(rollRandomScene(999999));
    expect(a).not.toBe(b);
  });

  it("always sets a valid location", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const r = rollRandomScene(seed);
      expect(locationKeys.has(r.location)).toBe(true);
    }
  });

  it("always picks 1 or 2 subjects, never zero, never over the cap", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const r = rollRandomScene(seed);
      expect(r.subjects.length).toBeGreaterThanOrEqual(1);
      expect(r.subjects.length).toBeLessThanOrEqual(2);
    }
  });

  it("never auto-picks the your-character sentinel", () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const r = rollRandomScene(seed);
      expect(r.subjects).not.toContain("your-character");
    }
  });

  it("never repeats a subject within a roll", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const r = rollRandomScene(seed);
      expect(new Set(r.subjects).size).toBe(r.subjects.length);
    }
  });

  it("optional layers are either null or a valid key", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const r = rollRandomScene(seed);
      if (r.weather != null) expect(weatherKeys.has(r.weather)).toBe(true);
      if (r.activity != null) expect(activityKeys.has(r.activity)).toBe(true);
      if (r.accent != null) expect(accentKeys.has(r.accent)).toBe(true);
    }
  });

  it("produces a non-empty description for every seeded roll", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const r = rollRandomScene(seed);
      const desc = buildSceneDescription(r);
      expect(desc.length).toBeGreaterThan(0);
      expect(desc).not.toBe("a friendly animal in a happy scene");
    }
  });
});
