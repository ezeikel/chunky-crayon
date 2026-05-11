'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand, faXmark } from '@fortawesome/pro-solid-svg-icons';
import { useFocusMode } from './FocusModeProvider';
import cn from '@/utils/cn';

/**
 * Inline button that toggles focus mode. Designed to sit in the mobile
 * top bar alongside MuteToggle / ZoomControls so it shares their
 * spacing language instead of overlapping anything. Icon swaps based
 * on state: faExpand when off (enter), faXmark when on (exit). Same
 * position, same hit target across both modes.
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
        'md:hidden shrink-0 flex items-center justify-center w-9 h-9 rounded-full',
        'bg-white text-coloring-text-primary',
        'shadow-sm border border-coloring-surface-dark/40',
        'active:scale-95 transition-transform duration-150',
        className,
      )}
    >
      <FontAwesomeIcon
        icon={isFocusMode ? faXmark : faExpand}
        className="text-sm"
      />
    </button>
  );
};

export default FocusModeToggleButton;
