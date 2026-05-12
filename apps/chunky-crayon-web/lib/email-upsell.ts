/**
 * Daily-email upsell rotation. Returns the pitch to surface in today's
 * email based on day-of-week — no per-user state, no DB lookups,
 * deterministic and replayable.
 *
 * Cadence (medium aggression):
 *   Mon  subscription (Rainbow — most popular)
 *   Tue  bundle (themed; latest published)
 *   Wed  app download (iOS / Android)
 *   Thu  subscription (Splash — entry tier)
 *   Fri  bundle (weekend prep angle)
 *   Sat  share/refer (no commercial ask)
 *   Sun  comic-strip teaser (pure value)
 *
 * The send-time code is responsible for resolving the actual bundle
 * (we just say "show today's bundle"), since the daily cron has
 * access to the DB. Variants without a runtime resolution (subscription,
 * app, share, comic-strip) are fully self-contained.
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

export type SubscriptionUpsell = {
  kind: 'subscription';
  tier: 'splash' | 'rainbow';
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
};

export type BundleUpsell = {
  kind: 'bundle';
  /** The send loop fills these in by querying `bundles` at send time. */
  bundleSlug?: string;
  bundleName?: string;
  bundleTagline?: string;
  bundlePriceDisplay?: string;
  headline: string;
  ctaLabel: string;
  /** Built by the send loop from `bundleSlug`. */
  ctaUrl?: string;
  /** Whether to attempt a bundle lookup at all. False here would be
   *  a dead branch — kept on the type so caller code doesn't have to
   *  special-case. */
  shouldFetchBundle: true;
};

export type AppUpsell = {
  kind: 'app';
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
};

export type ShareUpsell = {
  kind: 'share';
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
};

export type ComicStripUpsell = {
  kind: 'comic-strip';
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
};

export type DailyUpsell =
  | SubscriptionUpsell
  | BundleUpsell
  | AppUpsell
  | ShareUpsell
  | ComicStripUpsell;

const SUBSCRIPTION_RAINBOW: SubscriptionUpsell = {
  kind: 'subscription',
  tier: 'rainbow',
  headline: "Save your kid's coloring forever",
  body: 'Rainbow unlocks 4 profiles, 500 custom pages a month, and saved progress across devices. Free for 7 days.',
  ctaLabel: 'See Rainbow — £13.99/mo',
  ctaUrl: `${baseUrl}/pricing?utm_source=daily-email&utm_medium=email&utm_campaign=upsell-rainbow`,
};

const SUBSCRIPTION_SPLASH: SubscriptionUpsell = {
  kind: 'subscription',
  tier: 'splash',
  headline: 'Want a custom page every day?',
  body: 'Splash unlocks the generator: type any subject ("a fox in a spacesuit"), get a print-ready page in 30 seconds. 250 a month.',
  ctaLabel: 'Try Splash — £7.99/mo',
  ctaUrl: `${baseUrl}/pricing?utm_source=daily-email&utm_medium=email&utm_campaign=upsell-splash`,
};

const APP_DOWNLOAD: AppUpsell = {
  kind: 'app',
  headline: 'Coloring on the iPad?',
  body: 'Our iPad app lets your kid colour right on the tablet — same daily pages, no printer needed. Free to install.',
  ctaLabel: 'Get the iPad app',
  ctaUrl: `${baseUrl}/?utm_source=daily-email&utm_medium=email&utm_campaign=upsell-app#app-store`,
};

const SHARE: ShareUpsell = {
  kind: 'share',
  headline: "Know a parent who'd love this?",
  body: "Send them today's page. They'll get tomorrow's in their inbox if they sign up.",
  ctaLabel: "Share today's page",
  ctaUrl: `${baseUrl}/?utm_source=daily-email&utm_medium=email&utm_campaign=share-saturday`,
};

const COMIC_STRIP: ComicStripUpsell = {
  kind: 'comic-strip',
  headline: "Free weekly: this week's Chunky comic",
  body: "Every week we draw a 4-panel comic strip about Colo the crayon. This week's is up — read it free.",
  ctaLabel: "Read this week's comic",
  ctaUrl: `${baseUrl}/comics?utm_source=daily-email&utm_medium=email&utm_campaign=comic-sunday`,
};

const BUNDLE_TUESDAY: BundleUpsell = {
  kind: 'bundle',
  headline: "Today's featured bundle",
  ctaLabel: 'See the bundle',
  shouldFetchBundle: true,
};

const BUNDLE_FRIDAY: BundleUpsell = {
  kind: 'bundle',
  headline: 'Weekend printing pack',
  ctaLabel: 'Grab this bundle for the weekend',
  shouldFetchBundle: true,
};

/**
 * Pick today's upsell variant.
 *
 * `date` defaults to "now" so callers can `getDailyUpsell()` without
 * args; tests + admin previews pass a fixed date to deterministically
 * render a specific variant.
 */
export const getDailyUpsell = (date: Date = new Date()): DailyUpsell => {
  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const dow = date.getUTCDay();
  switch (dow) {
    case 1:
      return SUBSCRIPTION_RAINBOW;
    case 2:
      return BUNDLE_TUESDAY;
    case 3:
      return APP_DOWNLOAD;
    case 4:
      return SUBSCRIPTION_SPLASH;
    case 5:
      return BUNDLE_FRIDAY;
    case 6:
      return SHARE;
    case 0:
    default:
      return COMIC_STRIP;
  }
};
