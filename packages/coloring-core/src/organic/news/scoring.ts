/**
 * Engagement scoring for the news engine — PURE.
 *
 * The sister project's lever is an "outrage factor" score that biases the
 * picker toward stories that make people argue. We keep that lever but
 * temper it for a kids brand: debate/relatability/timeliness count, raw
 * rage is capped, and anything the model flagged as divisive-in-a-bad-way
 * is penalised. The model returns the sub-signals (0..1 each); this
 * function combines + clamps them into a single 0..1 score the DB picker
 * orders by.
 *
 * Tested because a bad weight here silently changes WHAT publishes — the
 * whole engine's editorial taste lives in these numbers.
 */

export type EngagementSignals = {
  /** Will parents/teachers argue or weigh in? Good. */
  debate: number;
  /** Does it hit a real weekly pain? Good. */
  relatability: number;
  /** Is it fresh / timely? Good. */
  timeliness: number;
  /** Easy to summarise in a 15-30s reel? Good. */
  visualClarity: number;
  /** Divisive in a culture-war / pile-on way? BAD — penalise. */
  toxicity: number;
};

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * Weighted blend. Debate + relatability dominate (that's the flywheel),
 * timeliness + clarity are tiebreakers, toxicity is a hard penalty that
 * can drive an otherwise-spicy story down so it loses to a calmer one.
 */
export const scoreEngagement = (raw: EngagementSignals): number => {
  const s = {
    debate: clamp01(raw.debate),
    relatability: clamp01(raw.relatability),
    timeliness: clamp01(raw.timeliness),
    visualClarity: clamp01(raw.visualClarity),
    toxicity: clamp01(raw.toxicity),
  };
  const positive =
    s.debate * 0.4 +
    s.relatability * 0.3 +
    s.timeliness * 0.2 +
    s.visualClarity * 0.1;
  // Toxicity removes up to half the score — a high-rage culture-war story
  // can still be edged out by a calm relatable one even before the
  // brand-safety jury hard-blocks it.
  const penalised = positive * (1 - s.toxicity * 0.5);
  return clamp01(penalised);
};

/** Minimum score to be worth publishing at all. Below this, skip the run. */
export const MIN_PUBLISHABLE_SCORE = 0.35;
