// Ad campaign schema — the contract every ad in /dev/ads must satisfy.
//
// A "campaign" is one ad creative end-to-end: image prompt → static render →
// (optionally) video render. Each campaign has a stable id used as the URL
// slug (/dev/ads/<id>) and the filename stem when exported to public/ads/.
//
// Adding a new ad = appending one Campaign object to campaigns.ts and running
// pnpm tsx scripts/generate-ad-assets.ts — no component changes required.

export type AdTemplate = 'hero' | 'app-screen' | 'before-after';

/** Image prompts for the coloring page this campaign features. */
export type CampaignAsset = {
  /** Stable key used in ad-assets.json (e.g. 'trex', 'foxes'). */
  key: string;
  /** What goes to GPT Image 2 / Gemini to generate the line-art page. */
  prompt: string;
  /**
   * Optional: when true, also generate a GPT Image 2 `images.edit`
   * "colored-in by a child" variant and store it as coloredUrl in the
   * assets file. Used for Before/After templates.
   */
  generateColoredVariant?: boolean;
};

/** Text shown on the ad canvas itself. */
export type OnCanvasCopy = {
  /** Main headline — biggest text on the ad. */
  headline: string;
  /**
   * Optional secondary line beneath the headline. Convention: 1-2 sentences
   * max, because on-canvas space is tight.
   */
  subhead?: string;
  /** Text on the CTA button. Keep under 24 chars. */
  cta: string;
  /**
   * Optional template-specific eyebrow / overline above the headline
   * (used by before-after template).
   */
  eyebrow?: string;
  /**
   * Optional template-specific proof quote (hero template uses this
   * beneath the card). Keep it short — one sentence, idiomatic.
   */
  proofQuote?: string;
};

/**
 * Copy that goes into the Meta ad composer (primary text, description, etc.)
 * — not rendered on the canvas. Kept per-campaign so we can A/B multiple
 * versions without touching the creative.
 */
export type MetaCopy = {
  /** 125 chars is the truncation line on feed. Short line wins. */
  primaryText: string[];
  /** Optional one-line description shown on desktop feed. */
  description?: string;
};

/**
 * Which video model generates this clip. Each has different strengths:
 *
 *   - seedance-2: photoreal + subtle motion, strong with end-frame
 *     interpolation. Our baseline. $0.30/s at 720p.
 *   - kling-v3-pro: strong on human-figure motion and physical objects
 *     (cloth, paper), likes terse prompts with explicit camera direction.
 *     $0.112/s at 720p — ~3× cheaper than Seedance.
 *   - veo-3.1: cinematographic language, realistic lighting, excellent
 *     start-to-end coherence. Only 4/6/8s durations. $0.20/s at 720p.
 *
 * Changing a BrollSpec's model forces a re-generation (the pipeline keys
 * broll-assets.json by stableId, so bump stableId or pass --force).
 */
export type BrollModel = 'seedance-2' | 'kling-v3-pro' | 'veo-3.1';

/**
 * B-roll scene spec — everything the i2v pipeline needs to produce a
 * clip. Lives inside a VideoScene's `broll` field. This is the SINGLE
 * SOURCE OF TRUTH for b-roll generation.
 *
 * Prompts are NOT written directly here — they're expanded at generation
 * time from a named template + variables. See lib/ads/prompt-templates.ts.
 * This keeps the ~230-word realism boilerplate in one place and makes a
 * new campaign's broll entry 6 lines instead of 230 words.
 *
 * Adding a new shot type = add a new template in prompt-templates.ts.
 */
export type BrollSpec = {
  /**
   * Stable identifier used for the output folder + broll-assets.json key.
   * Kebab-case, unique across all campaigns. Change this to force a
   * regeneration; keep it the same to reuse cached URLs.
   */
  stableId: string;
  /**
   * Which model generates this clip. See BrollModel for tradeoffs.
   * Default: 'seedance-2'.
   */
  model?: BrollModel;
  /**
   * Which prompt template to use. Matches a template.id in
   * lib/ads/prompt-templates.ts (e.g. 'over-shoulder-colouring').
   */
  template: string;
  /**
   * Variables plugged into the template's buildStill + buildMotion
   * functions. Required keys depend on the template — expand-time
   * validation throws if any are missing.
   */
  templateVars: Record<string, string>;
  /**
   * Asset key from ad-assets.json to use as Nano Banana's reference image
   * (e.g. 'trex' → use the T-rex coloring page). When set, the still gets
   * this as an `<image>` input so the page content stays faithful.
   */
  referenceImageKey?: string;
  /**
   * If true, ALSO generate an end still via the template's buildStill
   * (passed to Seedance's end_image_url for interpolation). Most templates
   * are single-frame — only set this if the template is designed to
   * interpolate between two different frames.
   */
  generateEndStill?: boolean;
  /** Video resolution. Default 720p. */
  resolution?: '480p' | '720p' | '1080p';
  /**
   * Duration in seconds. Seedance accepts 4-15, Veo only 4/6/8, Kling up
   * to 10. Default 5 (valid for all three).
   */
  durationSeconds?: 4 | 5 | 6 | 7 | 8 | 9 | 10;
};

/** Video ad config — phase 2. Shapes the Remotion comp + Seedance b-roll. */
export type VideoScene = {
  /** Seconds from start. */
  start: number;
  /** Duration in seconds (must sum to 15 across scenes for a 15s ad). */
  duration: number;
  /** Brief description for the scene (used as Remotion comp label). */
  label: string;
  /** What Remotion renders: 'text-reveal', 'line-art-draw', 'brand-outro', etc. */
  kind:
    | 'text-reveal'
    | 'phone-mockup'
    | 'line-art-draw'
    | 'brand-outro'
    | 'broll';
  /**
   * Required when kind === 'broll'. Fully declarative — generate-broll.ts
   * reads this and writes URLs to broll-assets.json keyed by stableId.
   */
  broll?: BrollSpec;
  /** Optional caption shown overlaid via Remotion. */
  caption?: string;
};

/**
 * Music track config. ElevenLabs music-gen endpoint (same pipeline we
 * already use for ambient sounds + demo reels). Remotion mixes the track
 * underneath the clip at the specified volume.
 */
export type VideoMusic = {
  /** ElevenLabs music-gen prompt. Keep it short and mood-led. */
  prompt: string;
  /** Seconds. Must match the sum of scene durations. */
  durationSeconds: number;
  /** 0-1, default 0.3. Parents who unmute should hear the clip, not the music. */
  volume?: number;
};

export type VideoConfig = {
  /** Which of the 3 input modes this video ad shows off. */
  mode: 'text' | 'voice' | 'image';
  /** Ordered scene list — Remotion composes these in sequence. */
  scenes: VideoScene[];
  /**
   * Optional music track. Recommended for Stories/Reels placements where
   * audio autoplays. Voiceover is deliberately not in the schema — we use
   * on-screen captions via <TypeReveal> for "voice" instead.
   */
  music?: VideoMusic;
};

export type Campaign = {
  /** URL slug + export filename stem. Kebab-case, stable. */
  id: string;
  /** Human-readable name for the index page. */
  name: string;
  /** Which static template renders this campaign. */
  template: AdTemplate;
  /** The coloring page this ad features. */
  asset: CampaignAsset;
  /** On-canvas copy. */
  copy: OnCanvasCopy;
  /** Ad composer copy (Meta primary text, etc.). */
  meta: MetaCopy;
  /**
   * Optional video extension — if present, this campaign can also be
   * rendered as a 15s 9:16 Remotion video. Phase 2.
   */
  video?: VideoConfig;
  /** Optional notes visible only in the /dev/ads index (not exported). */
  notes?: string;
};

/** What we persist to ad-assets.json after running generate-ad-assets.ts. */
export type AdAsset = {
  /** Matches CampaignAsset.key. */
  key: string;
  /** DB id on the dev Neon branch. */
  id: string;
  title: string;
  description: string;
  /** Line-art page (webp). */
  url: string;
  /** Line-art page (svg). */
  svgUrl: string;
  /**
   * Optional: colored-in variant produced via GPT Image 2 `images.edit`.
   * Only present when the campaign asset sets generateColoredVariant: true.
   */
  coloredUrl?: string;
  generatedAt: string;
};

/**
 * What we persist to broll-assets.json after running generate-broll.ts.
 * Keyed by BrollSpec.stableId so re-renders are idempotent — the script
 * skips any stableId already in the file unless --force is passed.
 */
export type BrollAsset = {
  /** Matches BrollSpec.stableId. */
  stableId: string;
  /** Which model rendered this clip. */
  model: BrollModel;
  /** Public R2 URL of the start still (Nano Banana). */
  startStillUrl: string;
  /** Public R2 URL of the end still, if endStillPrompt was set. */
  endStillUrl?: string;
  /** MP4 URL returned by fal (NOT R2, since clips are transient). */
  videoUrl: string;
  /** Local relative path under test-clips/ for the downloaded clip. */
  localClipPath: string;
  generatedAt: string;
  /**
   * Seed used by the video model (Kling supports explicit seed → same
   * prompt + same seed = same clip). Regeneration bumps this.
   */
  seed?: number;
  /**
   * Auto-generated AI judgement from Opus 4.7 right after generation.
   * Stored so review CLI can surface it without re-running the judge.
   */
  judgement?: BrollJudgement;
  /**
   * Human-approval status from the review CLI.
   *   'pending'  — generated, awaiting human review
   *   'approved' — human said ship it (render-ad-videos.ts will use)
   *   'rejected' — human killed it; render-ad-videos.ts refuses to use
   */
  reviewStatus: 'pending' | 'approved' | 'rejected';
  /** When the review status was last set. */
  reviewedAt?: string;
};

/**
 * Opus 4.7 judgement of a generated b-roll clip. Populated automatically
 * after each generation via lib/ads/judge.ts. The rubric covers the
 * specific failure modes we've accumulated through manual review.
 */
export type BrollJudgement = {
  /** Overall call — SHIP: ready to use. ITERATE: usable but improvable.
   *  REGENERATE: clearly broken, retry. */
  verdict: 'SHIP' | 'ITERATE' | 'REGENERATE';
  /** One-line summary of the top issue (only populated if verdict !== SHIP). */
  topIssue?: string;
  /** Per-criterion evaluations. Each criterion: pass (boolean) + one-sentence evidence. */
  criteria: {
    artworkStability: { pass: boolean; evidence: string };
    compositionStability: { pass: boolean; evidence: string };
    handAnatomy: { pass: boolean; evidence: string };
    colourPersistence: { pass: boolean; evidence: string };
    motionPlausibility: { pass: boolean; evidence: string };
    aiGleam: { pass: boolean; evidence: string };
  };
  /** ISO timestamp of judgement. */
  judgedAt: string;
  /** Claude model id actually used (e.g. 'claude-opus-4-7'). */
  model: string;
};
