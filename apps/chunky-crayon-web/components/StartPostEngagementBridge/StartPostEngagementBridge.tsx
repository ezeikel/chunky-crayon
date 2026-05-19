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
import { Button } from '@/components/ui/button';
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
 * Styling deliberately mirrors the chunky kid-brand language: the CTA is
 * the SAME shared <Button> primitive (default variant) the /start hero
 * "Try it free" button uses — chunky bottom-drop lift, bouncy easing,
 * brand accent — so the two CTAs read as one family. The card itself
 * gets a confident fill + thick border + matching bottom-drop shadow so
 * it pops on the page instead of reading like an adult SaaS toast.
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

  const headline = hasExported
    ? 'Love it? Make your very own'
    : 'Want your kid to make their own?';
  const sub = hasExported
    ? 'A dinosaur chef, a space cat, anything they can dream up. Describe it, get a fresh page in about 2 minutes.'
    : 'Describe any scene and get a fresh printable page in about 2 minutes.';

  return (
    <div
      className={cn(
        'relative w-full max-w-[400px] rounded-3xl',
        // Clean white card, no border — the orange button is the only
        // loud element; the card is just a soft-elevated white surface
        // that frames it. (Earlier yellow-fill + thick orange ring +
        // icon chip stacked into an orange-on-orange pile-up that read
        // garish; the soft shadow alone lifts it off the page.)
        'bg-white px-6 pt-6 pb-7',
        'shadow-[0_10px_28px_-10px_rgb(0_0_0/0.18)]',
      )}
      // Sly entrance: slide-up + overshoot settle, then a single
      // delayed attention bob ~0.9s after it lands (visitor is
      // mid-colour, so the late nudge catches the eye). Pure CSS
      // keyframes (global.css), reduced-motion-safe.
      style={{
        animation:
          'bridge-in 420ms cubic-bezier(0.34,1.56,0.64,1) both, ' +
          'bridge-nudge 600ms ease-in-out 900ms 1',
      }}
      role="region"
      aria-label="Make your own coloring page"
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className={cn(
          'absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full',
          'text-text-muted hover:text-text-primary hover:bg-black/5',
          'transition-colors',
        )}
      >
        <FontAwesomeIcon icon={faXmark} className="text-base" />
      </button>

      <div className="pr-6">
        <h3 className="font-tondo font-bold text-text-primary text-xl leading-tight">
          {headline}
        </h3>
        <p className="mt-1.5 font-rooney-sans text-base text-text-secondary leading-snug">
          {sub}
        </p>
      </div>

      {/* SAME button as the /start hero "Try it free": shared <Button>
          primitive, default variant, asChild + <Link>, wand icon. This
          is intentionally the only saturated element in the card. */}
      <Button
        asChild
        className="mt-5 h-auto w-full rounded-full px-7 py-3.5 text-base"
      >
        <Link href={href} onClick={handleClick}>
          <FontAwesomeIcon icon={faWandMagicSparkles} className="text-lg" />
          Make your own
        </Link>
      </Button>
    </div>
  );
};

export default StartPostEngagementBridge;
