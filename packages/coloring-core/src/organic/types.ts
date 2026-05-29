/**
 * Organic content engine — shared types.
 *
 * Two engines (NEWS, DATASET) produce posts that REUSE the ContentReel
 * reel renderer / voice / cover by mapping onto the same content shape
 * (hook / centerBlock / payoff / coverTeaser). See
 * ~/.claude/plans/cc-organic-content-engine.md.
 *
 * String-literal unions here are the lower-cased mirror of the Prisma
 * enums (OrganicEngine, OrganicCategory, SafetyVerdict). The worker's
 * fromPrisma/toPrisma helpers map between the two, same convention as
 * the ContentReel `shared/types.ts` <-> schema.prisma mapping.
 */

export type OrganicEngine = "news" | "dataset";

/** Reel template — mirror of the Prisma ContentReelTemplate enum, lower-cased. */
export type OrganicTemplate = "shock" | "warm" | "quiet";

export type OrganicCategory =
  // News flashpoints (research-ranked)
  | "school-policy"
  | "screen-time"
  | "reading-literacy"
  | "childcare-cost"
  | "school-food"
  | "homework"
  | "teacher-support"
  | "childhood-play"
  // Dataset families
  | "baby-names"
  | "milestones"
  // Shared / fallback
  | "creativity"
  | "nostalgia";

export type SafetyVerdictValue = "pending" | "approved" | "blocked";

/**
 * The content payload a post-builder must produce. Maps 1:1 onto the
 * ContentReel reel shape so the existing renderer can consume it.
 */
export type OrganicContent = {
  /** Setup line for the hook beat. Problem/curiosity-first framing. */
  hook: string;
  /** Resolution narration over the reveal/payoff beat. */
  payoff: string;
  /**
   * The dramatic reveal block. Short — it lands big on screen:
   *   news:    a verdict-ish phrase ("Banned", "23 days")
   *   dataset: the headline number/phrase ("500+", "by age 3")
   */
  centerBlock: string;
  /** Question-shaped cover string. Falls back to `hook` if absent. */
  coverTeaser?: string;
  /** Topic — drives template default + the picker's category cooldown. */
  category: OrganicCategory;
  /** Source attribution. */
  sourceTitle?: string;
  sourceUrl?: string;
};

/**
 * Category -> reel template default. Shock for the punchy / debate-y
 * surfaces, warm for reassurance, quiet for nostalgia/calm. Mirrors the
 * ContentReel CATEGORY_TEMPLATE intent. The DB-level `templateOverride`
 * wins when present.
 */
export const ORGANIC_CATEGORY_TEMPLATE: Record<
  OrganicCategory,
  OrganicTemplate
> = {
  "school-policy": "shock",
  "screen-time": "shock",
  "reading-literacy": "shock",
  "childcare-cost": "shock",
  "school-food": "shock",
  homework: "warm",
  "teacher-support": "warm",
  "childhood-play": "warm",
  "baby-names": "quiet",
  milestones: "warm",
  creativity: "warm",
  nostalgia: "quiet",
};

export const templateForOrganicCategory = (
  category: OrganicCategory,
  override?: OrganicTemplate | null,
): OrganicTemplate => {
  if (override) return override;
  return ORGANIC_CATEGORY_TEMPLATE[category];
};
