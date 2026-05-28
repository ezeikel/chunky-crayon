import { describe, expect, it } from "vitest";
import { buildSceneDescription } from "./build-scene-description";

/**
 * The Scene Builder description is the prompt that a credit-paying kid's
 * coloring page is generated from. A malformed string (dangling "and",
 * empty prompt, wrong word order) wastes credits and breaks the core
 * experience, so the contract is pinned here.
 */

describe("buildSceneDescription", () => {
  it("builds a single-subject + location scene", () => {
    expect(
      buildSceneDescription({ subjects: ["horse"], location: "beach" }),
    ).toBe("a horse at the beach");
  });

  it('joins two subjects with "and"', () => {
    expect(
      buildSceneDescription({ subjects: ["dog", "cat"], location: "forest" }),
    ).toBe("a dog and a cat in a forest");
  });

  it("uses an Oxford-style list for three subjects", () => {
    expect(
      buildSceneDescription({
        subjects: ["dog", "cat", "horse"],
        location: "beach",
      }),
    ).toBe("a dog, a cat, and a horse at the beach");
  });

  it("orders parts as subjects, location, activity, weather, accent", () => {
    expect(
      buildSceneDescription({
        subjects: ["dragon"],
        location: "sea",
        weather: "sunny",
        activity: "swimming",
        accent: "sparkles",
      }),
    ).toBe(
      "a friendly dragon out at sea swimming on a sunny day with magical sparkles",
    );
  });

  it("substitutes the resolved character name for the sentinel", () => {
    expect(
      buildSceneDescription({
        subjects: ["your-character", "dragon"],
        location: "sea",
        characterName: "Sparky",
      }),
    ).toBe("Sparky and a friendly dragon out at sea");
  });

  it('drops the sentinel (no dangling "and") when no character name is supplied', () => {
    expect(
      buildSceneDescription({
        subjects: ["your-character", "dog"],
        location: "forest",
      }),
    ).toBe("a dog in a forest");
  });

  it("drops the sentinel even when it is the only subject", () => {
    // No name + only the sentinel -> nouns empty but location present.
    expect(
      buildSceneDescription({
        subjects: ["your-character"],
        location: "beach",
      }),
    ).toBe("at the beach");
  });

  it("trims a whitespace-only character name as if absent", () => {
    expect(
      buildSceneDescription({
        subjects: ["your-character"],
        location: "beach",
        characterName: "   ",
      }),
    ).toBe("at the beach");
  });

  it("returns a safe fallback when subjects and location are both empty", () => {
    expect(buildSceneDescription({ subjects: [], location: null })).toBe(
      "a friendly animal in a happy scene",
    );
  });

  it("handles optional layers independently", () => {
    expect(
      buildSceneDescription({
        subjects: ["cat"],
        location: "mountains",
        weather: "snowy",
      }),
    ).toBe("a cat in the mountains on a snowy day");

    expect(
      buildSceneDescription({
        subjects: ["cat"],
        location: "mountains",
        activity: "sleeping",
      }),
    ).toBe("a cat in the mountains curled up sleeping");
  });

  it("never emits an em dash or double spaces", () => {
    const out = buildSceneDescription({
      subjects: ["horse", "cow"],
      location: "football-game",
      weather: "rainbow",
      activity: "running",
      accent: "balloons",
    });
    expect(out).not.toMatch(/—/);
    expect(out).not.toMatch(/ {2,}/);
    expect(out).toBe(
      "a horse and a cow at a football game running and playing with a big rainbow in the sky with party balloons everywhere",
    );
  });
});
