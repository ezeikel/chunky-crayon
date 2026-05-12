/**
 * Email list slugs — the value space of the `lists` column on
 * `email_subscribers`. Keep in sync with the doc comment on
 * `EmailSubscriber.lists` in packages/db/prisma/schema.prisma.
 *
 * Why slug-based instead of an enum: we want to ship new lists
 * (seasonal campaigns, one-off announcements, future programs) as a
 * string-literal change with no schema migration. Enum would force a
 * migration per list. Trade-off accepted: lose compile-time enum
 * safety, gain runtime additive flexibility.
 *
 * Default for new signups via the daily-coloring CTAs (homepage,
 * footer, modal). Other surfaces pass their own slug.
 */

export const EMAIL_LIST = {
  /** Daily 1-image coloring email (8:30 UTC). The primary list. */
  DAILY_COLORING: 'daily-coloring',
  /** Weekly comic-strip drop notification. */
  COMIC_STRIP: 'comic-strip',
  /** New themed bundle launches (Dino Dance Party, etc). */
  BUNDLES_ANNOUNCE: 'bundles-announce',
  /** Broader product/feature announcements (new tools, subscription tiers). */
  DIGITAL_PRODUCTS: 'digital-products',
} as const;

export type EmailListSlug = (typeof EMAIL_LIST)[keyof typeof EMAIL_LIST];

export const DEFAULT_LISTS: readonly EmailListSlug[] = [
  EMAIL_LIST.DAILY_COLORING,
];

/** Allowlist used by the signup action to validate caller-supplied
 *  list slugs from form data — never trust raw form input. */
export const VALID_LIST_SLUGS = new Set<string>(Object.values(EMAIL_LIST));
