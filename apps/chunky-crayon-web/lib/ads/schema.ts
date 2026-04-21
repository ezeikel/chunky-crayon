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
  /** What goes to GPT Image 1.5 / Gemini to generate the line-art page. */
  prompt: string;
  /**
   * Optional: when true, also generate a GPT Image 1.5 `images.edit`
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
   * If kind === 'broll', we render this via Seedance 2. Prompt is fed to
   * the image-to-video or text-to-video endpoint. imageUrl (when present)
   * triggers image-to-video mode using that frame as the seed.
   */
  broll?: {
    prompt: string;
    imageUrl?: string;
    /** Seconds. Seedance 2 supports 5 or 10. */
    clipDuration: 5 | 10;
  };
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
   * Optional: colored-in variant produced via GPT Image 1.5 `images.edit`.
   * Only present when the campaign asset sets generateColoredVariant: true.
   */
  coloredUrl?: string;
  generatedAt: string;
};
