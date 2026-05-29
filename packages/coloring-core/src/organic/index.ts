/**
 * Organic content engine — barrel.
 *
 * Imported by the worker (pick/publish/news-discover + ingest script) and
 * the web app (captions/digest). See
 * ~/.claude/plans/cc-organic-content-engine.md.
 */

export {
  type OrganicEngine,
  type OrganicCategory,
  type OrganicTemplate,
  type SafetyVerdictValue,
  type OrganicContent,
  ORGANIC_CATEGORY_TEMPLATE,
  templateForOrganicCategory,
} from "./types";

export {
  SAFETY_BLOCK_TERMS,
  hasBlockedTerm,
  vetOrganicPost,
  type SafetyResult,
} from "./brand-safety";

// News engine
export {
  scoreEngagement,
  MIN_PUBLISHABLE_SCORE,
  type EngagementSignals,
} from "./news/scoring";
export {
  NEWS_VEINS,
  NEWS_DISCOVERY_SYSTEM,
  buildNewsScriptPrompt,
  type NewsVein,
} from "./news/prompts";
export {
  discoverNewsStory,
  type DiscoveredNews,
  type NewsCandidate,
} from "./news/discovery";

// Dataset engine
export {
  buildBabyNameContent,
  babyNameExternalId,
  countDeltaPct,
  isPostWorthyPair,
  BABY_NAMES_SOURCE_UK,
  BABY_NAMES_SOURCE_US,
  type BabyNameRow,
  type BabyNameRegion,
  type BabyNameSex,
} from "./dataset/babynames";
export {
  buildMilestoneContent,
  MILESTONE_SEED,
  MILESTONE_SOURCE,
  type MilestoneRow,
  type MilestoneDomain,
} from "./dataset/milestones";
export {
  buildScreenTimeContent,
  SCREEN_TIME_SEED,
  SCREEN_TIME_SOURCE,
  type ScreenTimeRow,
} from "./dataset/screentime";
