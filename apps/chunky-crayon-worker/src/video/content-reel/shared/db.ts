/**
 * Bridge between Prisma's `content_reels` row shape and the in-memory
 * `ContentReel` shape the renderer/cover use.
 *
 * Why this layer exists:
 *   The Prisma enums (ContentReelKind, ContentReelCategory, etc.) use
 *   SCREAMING_SNAKE because that's the SQL convention; the TS types use
 *   kebab-case because that's what reads naturally in the cover/template
 *   JSX and existing fixtures. Two sources of truth would drift; one
 *   small mapper file keeps them aligned and gives us one place to add
 *   validation when rows arrive from the DB.
 *
 *   Caption tokens come back as `Json` (Prisma) which is `unknown` to TS;
 *   we cast through a runtime check so a malformed row throws on read
 *   instead of silently rendering an empty hook.
 */

import type { ContentReel as PrismaContentReel } from "@one-colored-pixel/db";

import type {
  CaptionToken,
  ContentReel,
  ContentReelCategory,
  ContentReelKind,
  ContentReelTemplate,
  FactCheckConfidence,
} from "./types";

// ---------------------------------------------------------------------------
// SCREAMING_SNAKE  ↔  kebab-case enum mapping. Single declaration each
// way so both directions stay in sync at edit time.
// ---------------------------------------------------------------------------

const KIND_TO_DB = {
  stat: "STAT",
  fact: "FACT",
  tip: "TIP",
  myth: "MYTH",
} as const satisfies Record<ContentReelKind, string>;

const KIND_FROM_DB = {
  STAT: "stat",
  FACT: "fact",
  TIP: "tip",
  MYTH: "myth",
} as const;

const TEMPLATE_TO_DB = {
  shock: "SHOCK",
  warm: "WARM",
  quiet: "QUIET",
} as const satisfies Record<ContentReelTemplate, string>;

const TEMPLATE_FROM_DB = {
  SHOCK: "shock",
  WARM: "warm",
  QUIET: "quiet",
} as const;

const CATEGORY_TO_DB = {
  "screen-time": "SCREEN_TIME",
  attention: "ATTENTION",
  anxiety: "ANXIETY",
  "fine-motor": "FINE_MOTOR",
  creativity: "CREATIVITY",
  "family-bonding": "FAMILY_BONDING",
  "parenting-tip": "PARENTING_TIP",
  "brain-development": "BRAIN_DEVELOPMENT",
  sleep: "SLEEP",
  "common-misconception": "COMMON_MISCONCEPTION",
} as const satisfies Record<ContentReelCategory, string>;

const CATEGORY_FROM_DB = {
  SCREEN_TIME: "screen-time",
  ATTENTION: "attention",
  ANXIETY: "anxiety",
  FINE_MOTOR: "fine-motor",
  CREATIVITY: "creativity",
  FAMILY_BONDING: "family-bonding",
  PARENTING_TIP: "parenting-tip",
  BRAIN_DEVELOPMENT: "brain-development",
  SLEEP: "sleep",
  COMMON_MISCONCEPTION: "common-misconception",
} as const;

const CONFIDENCE_TO_DB = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
} as const satisfies Record<FactCheckConfidence, string>;

const CONFIDENCE_FROM_DB = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

// ---------------------------------------------------------------------------
// Caption tokens — Prisma's `Json` is `unknown` to TS. Validate shape on
// read so a malformed row throws clearly instead of rendering blanks.
// ---------------------------------------------------------------------------

const isCaptionToken = (v: unknown): v is CaptionToken =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as CaptionToken).text === "string" &&
  typeof (v as CaptionToken).fromMs === "number" &&
  typeof (v as CaptionToken).toMs === "number";

const toCaptionTokens = (v: unknown): CaptionToken[] | undefined => {
  if (v === null || v === undefined) return undefined;
  if (!Array.isArray(v)) {
    throw new Error(
      `Expected CaptionToken[] in DB Json column, got ${typeof v}`,
    );
  }
  if (!v.every(isCaptionToken)) {
    throw new Error("Malformed CaptionToken in DB Json column");
  }
  return v;
};

// ---------------------------------------------------------------------------
// Public mappers.
// ---------------------------------------------------------------------------

export function fromPrisma(row: PrismaContentReel): ContentReel {
  return {
    id: row.id,
    kind: KIND_FROM_DB[row.kind],
    hook: row.hook,
    payoff: row.payoff,
    centerBlock: row.centerBlock,
    coverTeaser: row.coverTeaser ?? undefined,
    sourceTitle: row.sourceTitle ?? undefined,
    sourceUrl: row.sourceUrl ?? undefined,
    category: CATEGORY_FROM_DB[row.category],
    templateOverride: row.templateOverride
      ? TEMPLATE_FROM_DB[row.templateOverride]
      : undefined,
    hookTokens: toCaptionTokens(row.hookTokens),
    payoffTokens: toCaptionTokens(row.payoffTokens),
    factCheckedAt: row.factCheckedAt
      ? row.factCheckedAt.toISOString().slice(0, 10)
      : undefined,
    factCheckConfidence: row.factCheckConfidence
      ? CONFIDENCE_FROM_DB[row.factCheckConfidence]
      : undefined,
    factCheckNotes: row.factCheckNotes ?? undefined,
  };
}

/**
 * Build a Prisma `create` input from an in-memory ContentReel. The DB
 * generates the id; we accept whatever id is on the in-memory object as
 * the slug to write since fixtures use stable slugs already.
 */
export function toPrismaCreate(reel: ContentReel) {
  return {
    id: reel.id,
    kind: KIND_TO_DB[reel.kind],
    hook: reel.hook,
    payoff: reel.payoff,
    centerBlock: reel.centerBlock,
    coverTeaser: reel.coverTeaser ?? null,
    sourceTitle: reel.sourceTitle ?? null,
    sourceUrl: reel.sourceUrl ?? null,
    category: CATEGORY_TO_DB[reel.category],
    templateOverride: reel.templateOverride
      ? TEMPLATE_TO_DB[reel.templateOverride]
      : null,
    // Stored as JSON — Prisma serialises arrays directly.
    hookTokens: reel.hookTokens ?? null,
    payoffTokens: reel.payoffTokens ?? null,
    factCheckedAt: reel.factCheckedAt ? new Date(reel.factCheckedAt) : null,
    factCheckConfidence: reel.factCheckConfidence
      ? CONFIDENCE_TO_DB[reel.factCheckConfidence]
      : null,
    factCheckNotes: reel.factCheckNotes ?? null,
  } as const;
}
