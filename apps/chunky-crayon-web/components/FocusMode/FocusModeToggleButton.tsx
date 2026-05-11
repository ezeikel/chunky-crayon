'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand, faXmark } from '@fortawesome/pro-solid-svg-icons';
import { useFocusMode } from './FocusModeProvider';
import cn from '@/utils/cn';

/**
 * Single button that toggles focus mode. Lives INSIDE the canvas card
 * at top-right (absolute-positioned within the card), so it follows
 * the card whether the card is in normal flow or promoted to
 * position:fixed in focus mode. No floating fixed-positioning, no
 * collision with the canvas — the button is part of the card.
 *
 * Mobile only via md:hidden — desktop has the full chrome and tool
 * sidebar, focus mode is not useful there.
 *
 * Icon swaps based on state: faExpand when normal, faXmark when in
 * focus mode. Same position, same size, same hit target.
 */
const FocusModeToggleButton = () => {
  const { isFocusMode, enterFocus, exitFocus } = useFocusMode();

  return (
    <button
      type="button"
      onClick={isFocusMode ? exitFocus : enterFocus}
      aria-label={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
      className={cn(
        'md:hidden absolute z-10 top-2 right-2',
        'flex items-center justify-center w-9 h-9 rounded-full',
        'bg-white/95 backdrop-blur-sm text-coloring-text-primary',
        'shadow-md border border-coloring-surface-dark',
        'active:scale-95 transition-transform duration-150',
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
