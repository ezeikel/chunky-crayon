'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandPointer } from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';

type TapPromptOverlayProps = {
  /** Hide the overlay (e.g. once the visitor has interacted with the canvas). */
  hidden?: boolean;
  /** Translated label, e.g. "Tap to color". */
  label: string;
  className?: string;
};

/**
 * Visual hint shown over the embedded coloring canvas in the `/start` and
 * homepage hero. Cold-traffic visitors saw a polaroid-framed coloring page
 * but didn't realize it was interactive (only ~14% touched it). The overlay
 * adds a pulsing tap-finger + a short label so the affordance is obvious.
 *
 * Pure CSS animation, no JS. `pointer-events-none` so taps pass straight
 * through to the canvas underneath; the canvas's own pointer handlers fire
 * `START_HERO_CANVAS_INTERACTED`, which the parent uses to set `hidden`.
 *
 * Gated by the `exp-start-hero-tap-prompt` feature flag so it's A/B tested
 * vs the no-prompt control.
 */
const TapPromptOverlay = ({
  hidden = false,
  label,
  className,
}: TapPromptOverlayProps) => (
  <div
    aria-hidden
    className={cn(
      'pointer-events-none absolute inset-0 z-20 flex items-center justify-center',
      'transition-opacity duration-500 ease-out',
      hidden ? 'opacity-0' : 'opacity-100',
      className,
    )}
  >
    {/* Finger + ripple. Two stacked rings ping at 1s offsets so the prompt
        always reads as moving, even at the moment a single ring expires. */}
    <div className="relative flex flex-col items-center gap-3">
      <div className="relative">
        <span
          className="absolute inset-0 rounded-full bg-crayon-orange/35 animate-ping"
          style={{ animationDuration: '1.6s' }}
        />
        <span
          className="absolute inset-0 rounded-full bg-crayon-orange/25 animate-ping"
          style={{ animationDuration: '1.6s', animationDelay: '0.8s' }}
        />
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-lg border-2 border-crayon-orange">
          <FontAwesomeIcon
            icon={faHandPointer}
            className="text-2xl text-crayon-orange"
            style={
              {
                '--fa-primary-color': 'hsl(var(--crayon-orange))',
                '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
                '--fa-secondary-opacity': '1',
              } as React.CSSProperties
            }
          />
        </div>
      </div>
      <span
        className={cn(
          'font-tondo font-bold text-sm sm:text-base text-text-primary',
          'bg-white/95 backdrop-blur-sm rounded-full px-4 py-1.5',
          'shadow-md border border-paper-cream-dark',
        )}
      >
        {label}
      </span>
    </div>
  </div>
);

export default TapPromptOverlay;
