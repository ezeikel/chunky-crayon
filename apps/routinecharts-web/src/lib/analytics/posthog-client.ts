import posthog from "posthog-js";
import { inject } from "@vercel/analytics";

const KEY = import.meta.env.PUBLIC_POSTHOG_KEY;
const HOST = import.meta.env.PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

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
      ph.register({ app: "routinecharts" });
    },
  });
} else if (import.meta.env.PROD) {
  console.warn(
    "[posthog] PUBLIC_POSTHOG_KEY not set in production — analytics disabled",
  );
}
