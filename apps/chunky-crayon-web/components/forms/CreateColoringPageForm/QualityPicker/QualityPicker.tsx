'use client';

/**
 * Kid-friendly quality picker for the create form.
 *
 * Three-tier segmented control mapping over GPT Image 2's quality knob.
 * Icons do the talking; the small label below is supporting copy. Hover/tap
 * exposes the approximate wait so people understand the trade-off.
 *
 *  ⚡ Fast    (~10s)   low      — default for free + guest users
 *  ✨ Better  (~1 min) medium   — free upgrade
 *  🧠 Best    (~3 min) high     — subscribers only
 *
 * Why a tier picker exists: gpt-image-2's `high` quality runs the full
 * Understand-Plan-Generate-Review loop and takes 3-4 minutes. For kid
 * coloring pages (line art, simple compositions) `low` is usually
 * indistinguishable while costing 1/35th the wait. Cold paid traffic was
 * bouncing on the long wait — this lets users self-select fast over polish.
 */

import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faSparkles,
  faBrainCircuit,
  faLock,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  type ImageQuality,
  IMAGE_QUALITY_TIERS,
} from '@one-colored-pixel/coloring-core/image-quality';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';

const TIER_ICONS: Record<ImageQuality, IconDefinition> = {
  low: faBolt,
  medium: faSparkles,
  high: faBrainCircuit,
};

const TIERS: ImageQuality[] = ['low', 'medium', 'high'];

const STORAGE_KEY = 'cc-quality-tier';

type QualityPickerProps = {
  /** Current selected tier. Lifted to the parent form so the form can
   *  forward it to createPendingColoringImage on submit. */
  value: ImageQuality;
  /** Called when the user clicks a tier. Parent owns state. */
  onChange: (next: ImageQuality) => void;
  /** Whether the user has a paid subscription. Drives the lock state on
   *  the 'high' tier. */
  isSubscriber: boolean;
  className?: string;
};

const QualityPicker = ({
  value,
  onChange,
  isSubscriber,
  className,
}: QualityPickerProps) => {
  // Hydrate the saved choice on mount. We only read from localStorage on the
  // client to avoid SSR/CSR mismatch — the parent provides the initial value.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && TIERS.includes(saved as ImageQuality) && saved !== value) {
      // Only restore if the saved tier is allowed for this user.
      const tier = saved as ImageQuality;
      if (tier === 'high' && !isSubscriber) return;
      onChange(tier);
    }
    // Run once on mount.
  }, []);

  const handleSelect = (tier: ImageQuality) => {
    if (tier === value) return;
    if (tier === 'high' && !isSubscriber) {
      // Locked tier — surface the upsell. Don't change the picker; clicking
      // the locked button is itself the signal. We track the click anyway
      // so we can measure interest.
      trackEvent(TRACKING_EVENTS.QUALITY_TIER_SELECTED, {
        quality: tier,
        previousQuality: value,
        isSubscriber,
      });
      // TODO(phase 1.5): trigger the pricing upsell modal here once it lands.
      return;
    }
    trackEvent(TRACKING_EVENTS.QUALITY_TIER_SELECTED, {
      quality: tier,
      previousQuality: value,
      isSubscriber,
    });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, tier);
    }
    onChange(tier);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Image quality"
      className={cn(
        // Segmented control — chunky pill row, kid-friendly. Each cell ≥44pt
        // tap target per audience-aware UI memory. Brand-orange highlight on
        // the active tier.
        'grid grid-cols-3 gap-2 p-1.5 bg-paper-cream-dark/40 rounded-2xl',
        className,
      )}
    >
      {TIERS.map((tier) => {
        const meta = IMAGE_QUALITY_TIERS[tier];
        const isActive = tier === value;
        const isLocked = tier === 'high' && !isSubscriber;
        return (
          <button
            key={tier}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-disabled={isLocked}
            onClick={() => handleSelect(tier)}
            title={`${meta.label} — ${meta.approxWait}. ${meta.description}`}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1 py-3 px-2 min-h-[64px] rounded-xl transition-all',
              'text-text-secondary hover:text-text-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange focus-visible:ring-offset-1',
              isActive &&
                'bg-crayon-orange text-white shadow-md hover:text-white',
              !isActive && !isLocked && 'hover:bg-white/60',
              isLocked && 'opacity-60 cursor-not-allowed',
            )}
          >
            <FontAwesomeIcon icon={TIER_ICONS[tier]} className="text-2xl" />
            <span className="text-xs font-bold leading-none">{meta.label}</span>
            <span
              className={cn(
                'text-[10px] leading-none',
                isActive ? 'text-white/80' : 'text-text-secondary/70',
              )}
            >
              {meta.approxWait}
            </span>
            {isLocked && (
              <span className="absolute top-1 right-1 text-text-secondary">
                <FontAwesomeIcon icon={faLock} className="text-[10px]" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default QualityPicker;
