/**
 * Image generation quality tiers.
 *
 * GPT Image 2 has three quality levels with a ~30-50× speed delta. For kid
 * coloring pages (line art, simple compositions) `low` is usually
 * indistinguishable from `high` while costing 1/35th of the wait time. We
 * default new + free users to `low` so cold paid traffic doesn't bounce on
 * the 3-4 minute wait that `high` produces.
 *
 * See plan: ~/.claude/plans/mobile-coloring-experience-and-quality-tiers.md
 */
export type ImageQuality = "low" | "medium" | "high";

export type ImageQualityTier = {
  /** OpenAI quality value (passed straight to images.edit). */
  quality: ImageQuality;
  /** Short label shown under the icon. ASCII only — no em dashes. */
  label: string;
  /** Approximate wait shown in tooltips. Source: OpenAI public benchmarks. */
  approxWait: string;
  /** Marketing-friendly description. Used in tooltips, emails, copy. */
  description: string;
};

export const IMAGE_QUALITY_TIERS: Record<ImageQuality, ImageQualityTier> = {
  low: {
    quality: "low",
    label: "Fast",
    approxWait: "Ready before they get bored",
    description: "Quick page, ready in seconds.",
  },
  medium: {
    quality: "medium",
    label: "Better",
    approxWait: "A minute, and it'll look sharper",
    description: "More polish, still fast.",
  },
  high: {
    quality: "high",
    label: "Best",
    approxWait: "Three minutes. Comes out gorgeous",
    description: "Full detail. Worth the wait.",
  },
};

/**
 * Default quality per user tier. The split is the load-bearing decision —
 * cold paid + guest users get the fast experience that makes them stay; paid
 * subscribers get the polished output they paid for.
 */
export const DEFAULT_QUALITY_FOR_GUEST: ImageQuality = "low";
export const DEFAULT_QUALITY_FOR_FREE: ImageQuality = "low";
export const DEFAULT_QUALITY_FOR_SUBSCRIBER: ImageQuality = "high";

/**
 * Which quality tiers a given user can pick. Currently every user can pick
 * every tier — the speed/quality choice is the whole point of the picker, so
 * we don't gate it. Subscription becomes a value perk elsewhere (more daily
 * generations, sticker collections, etc.) rather than gating the speed knob.
 *
 * The arrays are still tier-keyed in case we ever want to gate, e.g. an
 * "Insane" tier later. Today they're identical.
 */
export const ALLOWED_QUALITY_FOR_GUEST: readonly ImageQuality[] = [
  "low",
  "medium",
  "high",
];
export const ALLOWED_QUALITY_FOR_FREE: readonly ImageQuality[] = [
  "low",
  "medium",
  "high",
];
export const ALLOWED_QUALITY_FOR_SUBSCRIBER: readonly ImageQuality[] = [
  "low",
  "medium",
  "high",
];

/**
 * Resolve the right default quality for a given user state. Used both as the
 * initial UI selection and as the server-side fallback when a request comes
 * in without an explicit quality param.
 */
export function resolveDefaultQuality(args: {
  isSubscriber: boolean;
}): ImageQuality {
  return args.isSubscriber
    ? DEFAULT_QUALITY_FOR_SUBSCRIBER
    : DEFAULT_QUALITY_FOR_GUEST;
}

/**
 * Clamp a requested quality to what the user is allowed to pick. Free/guest
 * users requesting `high` get bumped down to `medium` server-side rather
 * than 403'd — same experience as the UI lock state, just defensive in case
 * the client sends a tampered payload.
 */
export function clampQuality(args: {
  requested: ImageQuality;
  isSubscriber: boolean;
}): ImageQuality {
  const allowed = args.isSubscriber
    ? ALLOWED_QUALITY_FOR_SUBSCRIBER
    : ALLOWED_QUALITY_FOR_GUEST;
  if (allowed.includes(args.requested)) return args.requested;
  // Subscribers get what they ask for; non-subscribers fall back to the
  // highest tier they're allowed.
  return allowed[allowed.length - 1] ?? "low";
}
