'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/pro-solid-svg-icons';
import { useFocusMode } from './FocusModeProvider';
import cn from '@/utils/cn';

/**
 * Floating exit button shown only while focus mode is active on mobile.
 * Top-right of the viewport with safe-area inset padding so it doesn't
 * sit under the iOS notch. Click → exit focus mode, header +
 * breadcrumbs fade back in.
 *
 * Lives in document flow but uses `fixed` positioning so it's always
 * reachable regardless of canvas zoom/pan state. Stacked above the
 * drawer hint (z-[70] > drawer hint z-[60]).
 */
const FocusModeExitButton = () => {
  const { isFocusMode, exitFocus } = useFocusMode();

  if (!isFocusMode) return null;

  return (
    <button
      type="button"
      onClick={exitFocus}
      aria-label="Exit focus mode"
      className={cn(
        'md:hidden fixed z-[70] flex items-center justify-center',
        'w-10 h-10 rounded-full bg-white text-coloring-text-primary',
        'shadow-lg border-2 border-coloring-surface-dark',
        'active:scale-95 transition-transform duration-150',
      )}
      style={{
        top: 'max(env(safe-area-inset-top, 0px), 12px)',
        right: 'max(env(safe-area-inset-right, 0px), 12px)',
      }}
    >
      <FontAwesomeIcon icon={faXmark} className="text-lg" />
    </button>
  );
};

export default FocusModeExitButton;
