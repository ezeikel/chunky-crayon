import { describe, expect, it } from "vitest";
import {
  ALLOWED_QUALITY_FOR_GUEST,
  ALLOWED_QUALITY_FOR_SUBSCRIBER,
  clampQuality,
  resolveDefaultQuality,
} from "./image-quality";

/**
 * Quality tier resolution is the "cold paid traffic doesn't bounce on a
 * 3-minute wait" decision. resolveDefaultQuality picks the initial
 * experience; clampQuality is the server-side guard against a tampered
 * client payload. Both are pure and both directly affect conversion, so
 * they're pinned here — if the default for a guest ever silently flips to
 * `high`, that's a revenue regression we want a red test for.
 */

describe("resolveDefaultQuality", () => {
  it("defaults guests / non-subscribers to the fast tier", () => {
    expect(resolveDefaultQuality({ isSubscriber: false })).toBe("low");
  });

  it("defaults paying subscribers to the best tier", () => {
    expect(resolveDefaultQuality({ isSubscriber: true })).toBe("high");
  });
});

describe("clampQuality", () => {
  it.each(["low", "medium", "high"] as const)(
    "lets a subscriber keep their requested %s tier",
    (requested) => {
      expect(clampQuality({ requested, isSubscriber: true })).toBe(requested);
    },
  );

  it.each(["low", "medium", "high"] as const)(
    "lets a non-subscriber keep their requested %s tier (no gating today)",
    (requested) => {
      expect(clampQuality({ requested, isSubscriber: false })).toBe(requested);
    },
  );

  it("falls back to the highest allowed tier if a request is somehow not allowed", () => {
    // Today every tier is allowed for everyone, so this exercises the
    // fallback branch via a deliberately invalid value (simulating a
    // tampered/garbage client payload). It must never throw or return
    // undefined — it returns the top allowed tier.
    const result = clampQuality({
      // @ts-expect-error intentionally invalid to hit the clamp branch
      requested: "ultra",
      isSubscriber: false,
    });
    expect(ALLOWED_QUALITY_FOR_GUEST).toContain(result);
  });

  it("keeps the guest and subscriber allow-lists identical (gating is intentionally off)", () => {
    // If a future change gates a tier, this test should be updated
    // deliberately — it documents that the split is currently a no-op.
    expect([...ALLOWED_QUALITY_FOR_GUEST]).toEqual([
      ...ALLOWED_QUALITY_FOR_SUBSCRIBER,
    ]);
  });
});
