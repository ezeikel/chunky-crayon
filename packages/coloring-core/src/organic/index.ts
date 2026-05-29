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

// Shared grounding / fact-check / dedup machinery (news + tips engines).
export {
  fetchArticleText,
  extractReadableText,
  type FetchedArticle,
} from "./shared/article";
export {
  groundedScript,
  verifyGrounding,
  type GroundedScript,
} from "./shared/grounding";
export { isDuplicateOfRecent, type RecentItem } from "./shared/dedup";

// News engine
export {
  scoreEngagement,
  MIN_PUBLISHABLE_SCORE,
  type EngagementSignals,
} from "./news/scoring";
export {
  NEWS_VEINS,
  NEWS_DISCOVERY_SYSTEM,
  type NewsVein,
} from "./news/prompts";
export {
  discoverNewsStory,
  type DiscoveredNews,
  type DiscoverNewsOptions,
  type NewsCandidate,
} from "./news/discovery";

// Tips engine (dynamic, grounded) — replaces the old hardcoded dataset.
export { TIP_VEINS, TIP_DISCOVERY_SYSTEM, type TipVein } from "./tips/veins";
export {
  discoverTip,
  type DiscoveredTip,
  type DiscoverTipOptions,
  type TipCandidate,
} from "./tips/discovery";
