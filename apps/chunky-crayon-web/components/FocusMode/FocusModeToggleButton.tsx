'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand, faXmark } from '@fortawesome/pro-solid-svg-icons';
import { useFocusMode } from './FocusModeProvider';
import cn from '@/utils/cn';

/**
 * Inline button that toggles focus mode. Rendered inside ZoomControls
 * via its `trailing` slot so it visually belongs to the zoom-controls
 * pill instead of floating as a separate button. Matches the zoom
 * button sizing/styling exactly.
 *
 * When `hideInFocusMode` is true the button renders only in normal
 * view — in focus mode the exit affordance lives elsewhere (a
 * floating X top-right of viewport via FocusModeFloatingExit) so the
 * canvas card's chrome stays clean.
 *
 * Mobile only via md:hidden — desktop never uses focus mode.
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
        'md:hidden shrink-0 flex items-center justify-center size-10 sm:size-12',
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
