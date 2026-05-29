import { describe, expect, it } from "vitest";

import {
  MIN_PUBLISHABLE_SCORE,
  scoreEngagement,
  type EngagementSignals,
} from "./scoring";

/**
 * The engagement score decides which news story (if any) becomes the
 * day's reel. The editorial taste of the whole news engine lives in these
 * weights, so they're pinned: a clamp bug or a flipped toxicity sign would
 * silently start publishing the wrong thing under a kids brand.
 */

const sig = (over: Partial<EngagementSignals>): EngagementSignals => ({
  debate: 0.5,
  relatability: 0.5,
  timeliness: 0.5,
  visualClarity: 0.5,
  toxicity: 0,
  ...over,
});

describe("scoreEngagement", () => {
  it("returns a high score for a debate-y, relatable, fresh, clean story", () => {
    const s = scoreEngagement(
      sig({
        debate: 1,
        relatability: 1,
        timeliness: 1,
        visualClarity: 1,
        toxicity: 0,
      }),
    );
    expect(s).toBeCloseTo(1, 5);
  });

  it("penalises toxicity — a high-rage story loses to a calm relatable one", () => {
    const toxic = scoreEngagement(
      sig({ debate: 1, relatability: 1, toxicity: 1 }),
    );
    const calm = scoreEngagement(
      sig({ debate: 0.7, relatability: 0.9, toxicity: 0 }),
    );
    expect(toxic).toBeLessThan(calm);
  });

  it("clamps out-of-range inputs to [0,1]", () => {
    const s = scoreEngagement(
      sig({
        debate: 5,
        relatability: -3,
        timeliness: 2,
        visualClarity: -1,
        toxicity: 9,
      }),
    );
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("weights debate above the tiebreakers", () => {
    const debateHeavy = scoreEngagement(
      sig({ debate: 1, relatability: 0, timeliness: 0, visualClarity: 0 }),
    );
    const clarityHeavy = scoreEngagement(
      sig({ debate: 0, relatability: 0, timeliness: 0, visualClarity: 1 }),
    );
    expect(debateHeavy).toBeGreaterThan(clarityHeavy);
  });

  it("a fully zero signal is below the publishable floor", () => {
    expect(
      scoreEngagement(
        sig({ debate: 0, relatability: 0, timeliness: 0, visualClarity: 0 }),
      ),
    ).toBeLessThan(MIN_PUBLISHABLE_SCORE);
  });
});
