/**
 * Zod schemas for every Json column on Persona and UgcAd. The DB stores
 * raw Json, but **every read and write goes through these parsers**.
 * Drift between schema.prisma and these types = silent breakage in the
 * generator and the admin UI. Always parse, never trust the column.
 *
 * The plain TS types below are exported alongside so callers can declare
 * variables typed by the schema (i.e. `FaceBrief`, not `z.infer<...>`).
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────
// FaceBrief — single source of truth for what a persona looks/lives like.
// Feeds the still generator (GPT Image 2 prompt), the Voice Design prompt,
// the warm-up content prompts, and the judge (face-drift check between
// frames). If you add a field here, update the still-generator prompt
// template to use it — otherwise the column drifts.
// ─────────────────────────────────────────────────────────────────────
export const FaceBriefSchema = z.object({
  /** Numeric range, e.g. "30-34". Kept as string so Claude can hedge. */
  ageRange: z.string().min(1),
  /** Free-form. e.g. "Latina (Mexican-American)", "Black (East African)". */
  ethnicity: z.string().min(1),
  /** "Austin, TX", "Manchester, UK", etc. Drives local-account follow research. */
  city: z.string().min(1),
  /** "stay-at-home mom", "barista", "preschool teacher", etc. */
  profession: z.string().min(1),
  /** Vibe in one line — "warm, slightly tired, real". */
  vibe: z.string().min(1),
  /** Hair description; goes verbatim into the still prompt. */
  hairDescription: z.string().min(1),
  /**
   * Skin description that intentionally calls out imperfections —
   * pores, blemishes, oiliness. The anti-AI-sheen instruction.
   */
  skinDescription: z.string().min(1),
  /** Typical outfit. Keep mundane — old t-shirt > styled blouse. */
  clothing: z.string().min(1),
  /**
   * The persona's kitchen (or other home setting). Specific clutter:
   * "banana on counter, magnetic to-do list on cabinet, coffee mug".
   * Avoid showroom-clean. This is what makes the background readable
   * as a real apartment vs an AI stage.
   */
  kitchenStyle: z.string().min(1),
  /** "soft window light camera-left", etc. */
  lightingNotes: z.string().min(1),
  /**
   * How the persona talks — for the ElevenLabs Voice Design prompt.
   * Accent, pace, vocal fry, filler words. Match to the demographic.
   */
  speechPatterns: z.string().min(1),
  /**
   * Explicit negatives the still generator must respect. Helps prevent
   * the AI default of glamour shots. Examples:
   *   "no makeup retouching"
   *   "no studio lighting"
   *   "no commercial polish"
   *   "no glossy skin"
   */
  doNotInclude: z.array(z.string().min(1)).min(2),
});

export type FaceBrief = z.infer<typeof FaceBriefSchema>;

// ─────────────────────────────────────────────────────────────────────
// FollowList — Perplexity-researched accounts the persona should follow
// during warm-up, split by category. Ratios from the persona authenticity
// research (~30-40% niche, 15-25% adjacent, 10-20% big, 10-15% local,
// 5-10% unrelated). System validates the ratios at write time.
// ─────────────────────────────────────────────────────────────────────
const FollowEntrySchema = z.object({
  /** TikTok handle WITHOUT the leading @. */
  handle: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_.]+$/, {
      message: 'handle must be a valid TikTok handle (letters, digits, _ or .)',
    }),
  /**
   * Short reason this account belongs in this bucket. Useful for the
   * operator reviewing the plan + for re-running research later.
   */
  why: z.string().min(1),
});

export const FollowListSchema = z.object({
  /** ~30-40% — actual niche the persona "lives in". Mostly micro-creators. */
  niche: z.array(FollowEntrySchema).min(8),
  /** ~15-25% — adjacent lifestyle (food, comedy, couples, pets). */
  adjacent: z.array(FollowEntrySchema).min(4),
  /** ~10-20% — A-list celebs to look like a "normal user". */
  big: z.array(FollowEntrySchema).min(3),
  /** ~10-15% — local accounts in the persona's city. Strong "real human" signal. */
  local: z.array(FollowEntrySchema).min(3),
  /** ~5-10% — random noise (viral clips, sports, music). */
  unrelated: z.array(FollowEntrySchema).min(2),
});

export type FollowList = z.infer<typeof FollowListSchema>;
export type FollowEntry = z.infer<typeof FollowEntrySchema>;

// ─────────────────────────────────────────────────────────────────────
// Like / comment research — what the persona engages with during warm-up.
// Same shape as FollowList entries but a flat array, since we don't need
// the category split for likes.
// ─────────────────────────────────────────────────────────────────────
export const EngagementTargetsSchema = z.array(
  z.object({
    handle: z.string().min(1),
    contentDescription: z.string().min(1),
    why: z.string().min(1),
  }),
);

export type EngagementTargets = z.infer<typeof EngagementTargetsSchema>;

// ─────────────────────────────────────────────────────────────────────
// WarmUpAction — one row in the operator's checklist for a given warm-up
// day. Mirrors the UgcWarmUpAction Prisma model field-for-field; this
// schema is what the persona-generator outputs before insert.
// ─────────────────────────────────────────────────────────────────────
export const WarmUpActionTypeSchema = z.enum([
  'SCROLL_FYP',
  'FOLLOW_ACCOUNT',
  'LIKE_VIDEO',
  'COMMENT_VIDEO',
  'POST_WARMUP_CLIP',
  'ADD_LINK_IN_BIO',
]);

export type WarmUpActionType = z.infer<typeof WarmUpActionTypeSchema>;

export const WarmUpActionSchema = z.object({
  day: z.number().int().min(1).max(14),
  type: WarmUpActionTypeSchema,
  /**
   * Type-dependent: a handle for FOLLOW_ACCOUNT, a video URL for
   * LIKE_VIDEO/COMMENT_VIDEO, a UgcWarmUpClip sequence for
   * POST_WARMUP_CLIP, omitted for SCROLL_FYP / ADD_LINK_IN_BIO.
   */
  target: z.string().optional(),
  /** Human-readable for the admin checklist row. */
  description: z.string().min(1),
});

export type WarmUpAction = z.infer<typeof WarmUpActionSchema>;

// ─────────────────────────────────────────────────────────────────────
// JudgeReport — output of the frame-by-frame QC pass on a generated ad.
// Stored on UgcAd.judgeReportJson. Used by the admin UI to show why
// a clip got FAILED_QC and to surface specific failure modes to the
// operator (so they know what to tweak in the next render).
// ─────────────────────────────────────────────────────────────────────
const JudgeCheckSchema = z.object({
  name: z.enum([
    'page_integrity',
    'face_drift',
    'hand_anatomy',
    'eye_life',
    'audio_sync',
  ]),
  passed: z.boolean(),
  /** Which frame(s) failed (e.g. ["frame_006.jpg", "frame_012.jpg"]). */
  failedFrames: z.array(z.string()).optional(),
  /** One-line human-readable reason. */
  reason: z.string().min(1),
});

export const JudgeReportSchema = z.object({
  passed: z.boolean(),
  checks: z.array(JudgeCheckSchema).min(1),
  /** Total frames inspected (informational). */
  framesInspected: z.number().int().min(1),
  /** Wall-clock duration of the inspected video, seconds. */
  videoDurationSec: z.number().positive(),
});

export type JudgeReport = z.infer<typeof JudgeReportSchema>;

// ─────────────────────────────────────────────────────────────────────
// Helpers — every persistence path goes through one of these.
// ─────────────────────────────────────────────────────────────────────

/** Parse a FaceBrief value coming out of the DB. Throws on drift. */
export const parseFaceBrief = (raw: unknown): FaceBrief =>
  FaceBriefSchema.parse(raw);

/** Parse a FollowList value coming out of the DB. Throws on drift. */
export const parseFollowList = (raw: unknown): FollowList =>
  FollowListSchema.parse(raw);

/** Parse an EngagementTargets array coming out of the DB. */
export const parseEngagementTargets = (raw: unknown): EngagementTargets =>
  EngagementTargetsSchema.parse(raw);

/** Parse a JudgeReport coming out of the DB. */
export const parseJudgeReport = (raw: unknown): JudgeReport =>
  JudgeReportSchema.parse(raw);
