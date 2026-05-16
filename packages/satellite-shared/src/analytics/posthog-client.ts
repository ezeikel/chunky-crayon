import posthog from "posthog-js";
import { inject } from "@vercel/analytics";

/**
 * Initialise PostHog + Vercel Analytics for a satellite site.
 *
 * Was a top-level side-effect in the app; now an explicit call so the
 * package can be imported without firing analytics, and so each site
 * tags its events with its own slug. Call once from the app's PostHog
 * entry script (PostHog.astro).
 *
 * Reads PUBLIC_POSTHOG_KEY/HOST from import.meta.env — these are app-level
 * env vars Astro exposes to the client bundle, so the read stays here.
 */
export const initAnalytics = (slug: string): void => {
  const KEY = import.meta.env.PUBLIC_POSTHOG_KEY;
  const HOST =
    import.meta.env.PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

  // Vercel Analytics — first-party pageview + custom-event dashboard.
  // Framework-agnostic inject() (Astro has no React root to mount <Analytics/>).
  inject();

  if (KEY) {
    posthog.init(KEY, {
      api_host: HOST,
      ui_host: "https://eu.posthog.com",
      defaults: "2025-05-24",
      loaded: (ph) => {
        // Tag every event from this site so cross-site funnels work in
        // CC's shared PostHog project (110135). Pair with utm_source on
        // outbound links to chunkycrayon.com to attribute conversions.
        ph.register({ app: slug });
      },
    });
  } else if (import.meta.env.PROD) {
    console.warn(
      "[posthog] PUBLIC_POSTHOG_KEY not set in production — analytics disabled",
    );
  }
};
