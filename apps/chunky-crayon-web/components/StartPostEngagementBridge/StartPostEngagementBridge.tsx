'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faXmark,
} from '@fortawesome/pro-duotone-svg-icons';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import cn from '@/utils/cn';

type StartPostEngagementBridgeProps = {
  /** utm_campaign key, forwarded for post-conversion attribution. */
  campaign: string;
  /**
   * Whether the visitor has interacted with the hero canvas at least
   * once. The bridge only appears post-engagement — showing it before
   * any interaction would just be a second CTA competing with the hero.
   */
  hasInteracted: boolean;
  /**
   * Whether the visitor has printed or downloaded their coloured page.
   * This is peak intent (they finished and wanted the artifact), so the
   * copy escalates from a soft nudge to a direct "make your own".
   */
  hasExported: boolean;
};

/**
 * Post-engagement conversion bridge for the /start hero.
 *
 * Why this exists: PostHog (fbclid cohort, 2026-05) showed 46% of paid
 * visitors actively colour the embedded hero canvas and 10% print it —
 * engagement is strong — but only ~5% reach the create flow and ~2.5%
 * see pricing. The embedded canvas delivers the full free value (a
 * coloured, printed page) with no bridge to the product the ad actually
 * sold ("describe a scene → get your own page"). The visitor is
 * maximally warm right after colouring/printing; the only CTA at that
 * moment is a generic signin/pricing link clicked by 8 of 37 engaged.
 *
 * This component is the missing bridge: after first interaction it
 * slides in a dismissible prompt that pivots "you coloured ours" →
 * "make your OWN — describe anything", routing into the existing guest
 * create flow on the homepage (createPendingColoringImage, designed for
 * guests on homepage/start). No auth wall.
 *
 * Gated by exp-start-post-engagement-bridge=bridge — the `control`
 * variant never mounts this, so the existing /start funnel is the
 * holdout. Measured via START_BRIDGE_SHOWN / _CLICKED / _DISMISSED.
 */
const StartPostEngagementBridge = ({
  campaign,
  hasInteracted,
  hasExported,
}: StartPostEngagementBridgeProps) => {
  const { track } = useAnalytics();
  const [dismissed, setDismissed] = useState(false);
  const shownTrackedRef = useRef(false);

  const visible = hasInteracted && !dismissed;

  // Fire START_BRIDGE_SHOWN exactly once, the first time the prompt
  // becomes visible (i.e. first interaction). Subsequent re-renders
  // (e.g. hasExported flipping) don't re-fire it.
  useEffect(() => {
    if (!visible || shownTrackedRef.current) return;
    shownTrackedRef.current = true;
    track(TRACKING_EVENTS.START_BRIDGE_SHOWN, { campaign });
  }, [visible, campaign, track]);

  if (!visible) return null;

  // Homepage hosts the guest create flow (CreateColoringPageForm with
  // guest support). Carry attribution so the post-conversion funnel can
  // tie a created page back to the bridge + campaign.
  const href = `/?from=start-bridge&campaign=${encodeURIComponent(campaign)}`;

  const handleDismiss = () => {
    setDismissed(true);
    track(TRACKING_EVENTS.START_BRIDGE_DISMISSED, { campaign, hasExported });
  };

  const handleClick = () => {
    track(TRACKING_EVENTS.START_BRIDGE_CLICKED, { campaign, hasExported });
  };

  return (
    <div
      className={cn(
        'w-full max-w-[400px] rounded-2xl border-2 border-crayon-orange/30',
        'bg-crayon-yellow-light/40 px-5 py-4 shadow-sm',
        'animate-in fade-in slide-in-from-bottom-2 duration-300',
      )}
      role="region"
      aria-label="Make your own coloring page"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-tondo font-bold text-text-primary text-base leading-snug">
          {hasExported
            ? 'Love it? Your kid can make their very own — a dinosaur chef, a space cat, anything they can dream up.'
            : 'Want your kid to make their own? Describe any scene and get a fresh page in about 2 minutes.'}
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="shrink-0 -mt-1 -mr-1 p-1.5 text-text-muted hover:text-text-primary transition-colors"
        >
          <FontAwesomeIcon icon={faXmark} className="text-base" />
        </button>
      </div>
      <Link
        href={href}
        onClick={handleClick}
        className={cn(
          'mt-3 inline-flex items-center gap-2 rounded-full',
          'bg-crayon-orange px-6 py-3 font-rooney-sans font-bold text-white',
          'shadow-sm transition-transform hover:scale-[1.02] active:scale-95',
        )}
      >
        <FontAwesomeIcon icon={faWandMagicSparkles} className="text-lg" />
        Make your own
      </Link>
    </div>
  );
};

export default StartPostEngagementBridge;
