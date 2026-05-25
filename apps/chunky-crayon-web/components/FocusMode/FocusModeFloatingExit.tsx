'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/pro-solid-svg-icons';
import { useFocusMode } from './FocusModeProvider';
import cn from '@/utils/cn';

/**
 * Floating exit button shown while focus mode is active at every
 * breakpoint. Pins to the top-right of the visual viewport with
 * safe-area padding so it doesn't sit under the iOS notch.
 *
 * Counterpart to FocusModeToggleButton (which lives inside the zoom
 * pill on mobile and in the progress/mute row on desktop, hidden in
 * focus mode). On mobile the canvas card is promoted to
 * position:fixed; on desktop the canvas stays in its normal spot.
 * Either way this X sits above everything via z-[70] — above the
 * mobile scrim (z-[55]), the bumped drawer (z-[56]), and the
 * desktop tool sidebars.
 */
const FocusModeFloatingExit = () => {
  const { isFocusMode, exitFocus } = useFocusMode();

  if (!isFocusMode) return null;

  return (
    <button
      type="button"
      onClick={exitFocus}
      aria-label="Exit focus mode"
      className={cn(
        'fixed z-[70] flex items-center justify-center',
        'w-10 h-10 rounded-full bg-white text-coloring-text-primary',
        'shadow-lg border-2 border-coloring-surface-dark',
        'active:scale-95 transition-transform duration-150',
      )}
      style={{
        top: 'max(env(safe-area-inset-top, 0px), 16px)',
        right: 'max(env(safe-area-inset-right, 0px), 16px)',
      }}
    >
      <FontAwesomeIcon icon={faXmark} className="text-lg" />
    </button>
  );
};

export default FocusModeFloatingExit;
