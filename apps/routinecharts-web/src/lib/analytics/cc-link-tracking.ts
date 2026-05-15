import { trackEvent } from "./events";

/**
 * Auto-track every outbound click to chunkycrayon.com as `cc_cta_click`.
 * This is the funnel-critical conversion event for the whole satellite
 * strategy. Delegated listener so footer, blog CTA, and any future CC
 * link are covered without per-component wiring.
 */
if (typeof document !== "undefined") {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.includes("chunkycrayon.com")) return;

      let utmCampaign = "";
      try {
        utmCampaign = new URL(href).searchParams.get("utm_campaign") ?? "";
      } catch {
        // href not a full URL; leave campaign empty
      }

      trackEvent("cc_cta_click", {
        href,
        utm_campaign: utmCampaign,
        location: anchor.dataset.ccCtaLocation ?? "unknown",
      });
    },
    { capture: true },
  );
}
