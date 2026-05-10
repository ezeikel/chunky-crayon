'use client';

/**
 * Quality picker — icon-led scale with a draggable thumb.
 *
 *    ⚡          ✨           🧠 ✦
 *   FAST       BETTER         BEST
 *  ━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *      A minute, and it'll look sharper
 *
 * The choice is a continuum from speed to quality. The draggable thumb
 * on the rail makes that continuous nature physical — kids' parents
 * can flick the thumb left or right; adults get the same affordance.
 * Click on a label or drag the thumb both work.
 *
 * All three tiers are available to every user. Default is 'low' for new
 * + free users (because the wait gates engagement on cold paid traffic),
 * 'high' for subscribers (polished output is the perk they're paying
 * for). Anyone can override either way per-generation. We deliberately
 * do NOT gate 'high' for free users — the whole point of letting users
 * pick speed-vs-quality is that they self-select. Gating undermines that.
 *
 * Why this works for both audiences:
 *   - CC (kids' parents): bouncy thumb on press, brand-orange accent.
 *     The drag affordance is friendly, not corporate. Bigger fonts.
 *   - CH (adults): same component, theme tokens swap orange for sage,
 *     the rail + thumb stay tasteful at a smaller scale.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faSparkles,
  faBrainCircuit,
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

// Sizing: keep the visible thumb circle and the drag-handler box
// separate so transforms (whileTap scale) and shadows can't desync the
// shape. The handler box is bigger than the visible thumb so it's a
// generous touch target on mobile.
const THUMB_SIZE = 22; // visible circle diameter
const HANDLER_SIZE = 44; // invisible drag/tap area diameter

type QualityPickerProps = {
  value: ImageQuality;
  onChange: (next: ImageQuality) => void;
  /** Subscriber state. Drives the DEFAULT tier only (subscribers default
   *  to 'high', everyone else to 'low'). It does NOT lock any tier — the
   *  free user can still pick 'high' if they're willing to wait. */
  isSubscriber: boolean;
  className?: string;
};

const QualityPicker = ({
  value,
  onChange,
  isSubscriber,
  className,
}: QualityPickerProps) => {
  const labelsRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<ImageQuality, HTMLButtonElement | null>>({
    low: null,
    medium: null,
    high: null,
  });
  // Snap positions in px from the rail's left edge, one per tier. We
  // recompute them from the actual rendered label positions so the dot
  // tracks the labels regardless of font / breakpoint.
  const [snapPoints, setSnapPoints] = useState<Record<ImageQuality, number>>({
    low: 0,
    medium: 0,
    high: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const thumbX = useMotionValue(0);
  const groupId = useId();

  // Compute snap point pixel positions whenever the layout might change.
  useEffect(() => {
    const compute = () => {
      const container = labelsRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const next: Record<ImageQuality, number> = { low: 0, medium: 0, high: 0 };
      for (const tier of TIERS) {
        const target = labelRefs.current[tier];
        if (!target) continue;
        const targetRect = target.getBoundingClientRect();
        next[tier] =
          targetRect.left - containerRect.left + targetRect.width / 2;
      }
      setSnapPoints(next);
    };
    compute();
    window.addEventListener('resize', compute);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(compute).catch(() => {});
    }
    return () => window.removeEventListener('resize', compute);
  }, []);

  // Animate the thumb to the active tier's snap point whenever value
  // changes externally OR the snap points change (e.g. on resize). Never
  // write thumbX while dragging — framer + handlers own it then.
  useEffect(() => {
    if (isDragging) return;
    thumbX.set(snapPoints[value]);
  }, [value, snapPoints, thumbX, isDragging]);

  // Hydrate saved choice on first mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved || !TIERS.includes(saved as ImageQuality)) return;
    const tier = saved as ImageQuality;
    if (tier === value) return;
    onChange(tier);
  }, []);

  const persistAndChange = (tier: ImageQuality, previous: ImageQuality) => {
    if (tier === previous) return;
    trackEvent(TRACKING_EVENTS.QUALITY_TIER_SELECTED, {
      quality: tier,
      previousQuality: previous,
      isSubscriber,
    });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, tier);
    }
    onChange(tier);
  };

  // Find the tier whose snap point is nearest to a given pixel x.
  const nearestTier = (x: number): ImageQuality => {
    let best: ImageQuality = 'low';
    let bestDist = Infinity;
    for (const tier of TIERS) {
      const dist = Math.abs(snapPoints[tier] - x);
      if (dist < bestDist) {
        bestDist = dist;
        best = tier;
      }
    }
    return best;
  };

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const railRect = railRef.current?.getBoundingClientRect();
    if (!railRect) {
      setIsDragging(false);
      return;
    }
    const releaseX = info.point.x - railRect.left;
    const target = nearestTier(releaseX);
    // Snap thumb position synchronously BEFORE flipping isDragging, so
    // the post-drag useEffect doesn't race with the snap.
    thumbX.set(snapPoints[target]);
    setIsDragging(false);
    persistAndChange(target, value);
  };

  // Drag bounds = full rail. All tiers are reachable by everyone.
  const dragConstraints = {
    left: snapPoints.low,
    right: snapPoints.high,
  };

  return (
    <div
      role="group"
      aria-label="Image quality"
      className={cn('flex flex-col', className)}
    >
      {/* Button row — bigger icon + label per tier. Click anywhere on a
          column snaps the thumb. The labels are also the visual targets
          the dot tracks underneath. */}
      <div ref={labelsRef} className="relative grid grid-cols-3 gap-x-1 pb-3">
        {TIERS.map((tier) => {
          const meta = IMAGE_QUALITY_TIERS[tier];
          const isActive = tier === value;
          return (
            <button
              key={tier}
              ref={(el) => {
                labelRefs.current[tier] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-describedby={`${groupId}-caption`}
              onClick={() => persistAndChange(tier, value)}
              className={cn(
                'group relative flex flex-col items-center justify-center gap-y-1.5 py-2 rounded-lg',
                'transition-colors active:scale-95 transition-transform',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coloring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                isActive
                  ? 'text-coloring-accent'
                  : 'text-text-secondary/60 hover:text-text-primary hover:bg-paper-cream-dark/30',
              )}
            >
              {/* Icon. Active tier scales up + uses brand colour via
                  parent text colour. */}
              <span className="relative inline-flex h-[40px] w-[40px] items-center justify-center">
                <motion.span
                  animate={{ scale: isActive ? 1.18 : 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 360,
                    damping: 22,
                  }}
                  className="block"
                >
                  <FontAwesomeIcon
                    icon={TIER_ICONS[tier]}
                    className="text-[32px]"
                  />
                </motion.span>
                {tier === 'high' && (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-1 text-[12px] leading-none opacity-90"
                  >
                    ✦
                  </span>
                )}
              </span>

              {/* Label — bigger, bolder. Active tier is heaviest. */}
              <span
                className={cn(
                  'font-coloring-heading text-[13px] tracking-[0.14em] uppercase leading-none',
                  isActive ? 'font-bold' : 'font-semibold',
                )}
              >
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Rail + draggable thumb. The thumb is a 44px invisible drag/tap
          handler containing a 22px visible circle child. Separating
          them keeps the visible circle's shape pixel-perfect even
          while framer-motion applies whileTap scale transforms — those
          only affect the inner element, never the handler box. */}
      <div
        ref={railRef}
        className="relative h-1 rounded-full bg-paper-cream-dark/70"
      >
        <motion.div
          drag="x"
          dragConstraints={dragConstraints}
          dragElastic={0.06}
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          style={{
            x: thumbX,
            width: HANDLER_SIZE,
            height: HANDLER_SIZE,
            top: -(HANDLER_SIZE / 2 - 2),
            left: -(HANDLER_SIZE / 2),
          }}
          className="absolute touch-none cursor-grab active:cursor-grabbing"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        >
          <motion.div
            role="slider"
            aria-label="Image quality"
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={TIERS.indexOf(value) + 1}
            aria-valuetext={IMAGE_QUALITY_TIERS[value].label}
            tabIndex={0}
            whileTap={{ scale: 1.1 }}
            style={{
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              // Centre the visible circle inside the bigger handler box.
              marginLeft: (HANDLER_SIZE - THUMB_SIZE) / 2,
              marginTop: (HANDLER_SIZE - THUMB_SIZE) / 2,
            }}
            className={cn(
              'rounded-full bg-coloring-accent',
              'shadow-[0_2px_0_var(--color-coloring-accent-dark),0_0_0_3px_var(--color-paper-cream)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coloring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white',
            )}
          />
        </motion.div>
      </div>

      {/* Caption — friendly wait copy. Sits under the thumb, animates on
          tier change, with extra top margin so it doesn't crowd the rail. */}
      <div
        id={`${groupId}-caption`}
        aria-live="polite"
        className="relative h-6 mt-5"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={value}
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={cn(
              'absolute inset-0 flex items-baseline gap-x-2 px-1',
              value === 'low' && 'justify-start',
              value === 'medium' && 'justify-center',
              value === 'high' && 'justify-end',
            )}
          >
            <span className="font-coloring-body text-[14px] font-semibold text-text-primary">
              {IMAGE_QUALITY_TIERS[value].approxWait}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QualityPicker;
