'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand, faXmark } from '@fortawesome/pro-solid-svg-icons';
import { useFocusMode } from './FocusModeProvider';
import cn from '@/utils/cn';

/**
 * Inline button that toggles focus mode. Rendered in three places:
 *   - Mobile: inside ZoomControls via the `trailing` slot (zoom pill)
 *   - Tablet: in the progress/mute row above the canvas
 *   - Desktop: in the xl-only progress/mute row above the canvas
 *
 * When `hideInFocusMode` is true the button renders only in normal
 * view — in focus mode the exit affordance lives elsewhere (a
 * floating X top-right of viewport via FocusModeFloatingExit) so the
 * canvas card's chrome stays clean.
 *
 * Cross-breakpoint as of the 2026-05 focus mode lift. (Was mobile-only
 * via `md:hidden` on the button itself, but the class survived the
 * lift — caught while auditing the tablet 768 story.)
 */
const FocusModeToggleButton = ({
  className,
  hideInFocusMode = false,
}: {
  className?: string;
  hideInFocusMode?: boolean;
}) => {
  const { isFocusMode, enterFocus, exitFocus } = useFocusMode();

  if (hideInFocusMode && isFocusMode) return null;

  return (
    <button
      type="button"
      onClick={isFocusMode ? exitFocus : enterFocus}
      aria-label={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
      className={cn(
        'shrink-0 flex items-center justify-center size-10 sm:size-12',
        'rounded-coloring-card border-2 border-coloring-surface-dark bg-white text-coloring-muted',
        'active:scale-95 hover:border-coloring-accent transition-all',
        className,
      )}
    >
      <FontAwesomeIcon
        icon={isFocusMode ? faXmark : faExpand}
        className="size-5 sm:size-6"
      />
    </button>
  );
};

export default FocusModeToggleButton;
