'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand, faXmark } from '@fortawesome/pro-solid-svg-icons';
import { useFocusMode } from './FocusModeProvider';
import cn from '@/utils/cn';

/**
 * Inline button that toggles focus mode. Rendered inside ZoomControls
 * via its `trailing` slot so it visually belongs to the zoom-controls
 * pill instead of floating as a separate button. Matches the zoom
 * button sizing/styling exactly. Icon swaps based on state: faExpand
 * when off (enter), faXmark when on (exit).
 *
 * Mobile only via md:hidden — desktop never uses focus mode.
 */
const FocusModeToggleButton = ({ className }: { className?: string }) => {
  const { isFocusMode, enterFocus, exitFocus } = useFocusMode();

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
