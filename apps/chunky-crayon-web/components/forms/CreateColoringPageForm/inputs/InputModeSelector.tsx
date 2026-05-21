'use client';

import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShapes,
  faPencil,
  faMicrophoneLines,
  faCameraRetro,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useInputMode, type InputMode } from './InputModeContext';
import { Button } from '@/components/ui/button';
import { useParentalGate } from '@/components/ParentalGate';
import { issueParentGateToken } from '@/app/actions/parent-gate';
import { setModeUnlocked } from '@/app/actions/scene';
import { type GateableMode } from '@/lib/scene/modes';
import {
  addUnlockedModeToCookie,
  getUnlockedModesFromCookie,
} from '@/lib/scene/unlock-cookie';
import cn from '@/utils/cn';

// =============================================================================
// Types
// =============================================================================

type InputOption = {
  mode: InputMode;
  labelKey: 'scene' | 'type' | 'talk' | 'photo';
  icon: IconDefinition;
  /** Scene Builder is never gateable; the other three are. */
  gateable: boolean;
};

// =============================================================================
// Constants
// =============================================================================

// Scene first — it's the privacy-first default. The other three are
// gated behind a one-time parent check. Once passed, the unlock persists
// (cookie for guests, DB for signed-in) and we never re-ask for that mode.
const INPUT_OPTIONS: InputOption[] = [
  { mode: 'scene', labelKey: 'scene', icon: faShapes, gateable: false },
  { mode: 'text', labelKey: 'type', icon: faPencil, gateable: true },
  { mode: 'voice', labelKey: 'talk', icon: faMicrophoneLines, gateable: true },
  { mode: 'image', labelKey: 'photo', icon: faCameraRetro, gateable: true },
];

// =============================================================================
// Component
// =============================================================================

type InputModeSelectorProps = {
  className?: string;
  /** Disable all mode buttons */
  disabled?: boolean;
  /**
   * Modes unlocked on the SERVER side for this user's active profile.
   * Undefined for guests / while loading. The local cookie state is
   * merged on top so we have a unified view of "what's unlocked".
   */
  unlockedModes?: GateableMode[];
  /** Optimistically reflect a server-side unlock without a refetch. */
  onModeUnlocked?: (mode: GateableMode) => void;
  /** True for signed-out users — drives cookie vs server persistence. */
  isGuest?: boolean;
};

const InputModeSelector = ({
  className,
  disabled,
  unlockedModes,
  onModeUnlocked,
  isGuest,
}: InputModeSelectorProps) => {
  const { mode: currentMode, setMode, isProcessing } = useInputMode();
  const t = useTranslations('createForm.inputModes');
  const { openGate } = useParentalGate();

  // Cookie-backed unlocks (used for guests + as a belt-and-braces local
  // cache for signed-in users). Read on mount; updated when the parent
  // gate passes. SSR-safe — the helper returns [] when document is
  // unavailable, then the client effect refreshes.
  const [cookieUnlocks, setCookieUnlocks] = useState<GateableMode[]>([]);
  useEffect(() => {
    setCookieUnlocks(getUnlockedModesFromCookie());
  }, []);

  // Effective unlock set: server (DB) ∪ cookie. Signed-in users have
  // either path lighting up the same mode; guests only ever get the
  // cookie path. Both produce the same UI.
  const isUnlocked = (option: InputOption): boolean => {
    if (!option.gateable) return true;
    const m = option.mode as GateableMode;
    return (unlockedModes ?? []).includes(m) || cookieUnlocks.includes(m);
  };

  // Server-side persistent unlock for signed-in users. Skips the DB
  // call for guests — there's no profile row to write against.
  const persistUnlock = async (mode: GateableMode): Promise<boolean> => {
    if (isGuest) {
      addUnlockedModeToCookie(mode);
      setCookieUnlocks((prev) =>
        prev.includes(mode) ? prev : [...prev, mode],
      );
      return true;
    }
    const issued = await issueParentGateToken('modes:unlock');
    if (!issued.ok) return false;
    const res = await setModeUnlocked({
      mode,
      unlocked: true,
      parentGateToken: issued.token,
    });
    if (!res.ok) return false;
    // Also write the cookie for signed-in users so a logged-out reload
    // (e.g. session expiry) doesn't re-prompt the same parent.
    addUnlockedModeToCookie(mode);
    setCookieUnlocks((prev) => (prev.includes(mode) ? prev : [...prev, mode]));
    onModeUnlocked?.(mode);
    return true;
  };

  const handleModeChange = (option: InputOption) => {
    if (disabled || isProcessing) return;

    // Already unlocked (or never gated) — just switch.
    if (isUnlocked(option)) {
      setMode(option.mode);
      return;
    }

    // Gate it. The modal handles its own UI; we pass the success
    // callback that persists + flips the mode.
    openGate({
      reason: 'unlock-input-mode',
      onSuccess: async () => {
        const ok = await persistUnlock(option.mode as GateableMode);
        if (!ok) {
          toast.error(t('unlockFailed'));
          return;
        }
        setMode(option.mode);
      },
    });
  };

  return (
    <div
      className={cn('flex gap-2 md:gap-3 justify-center', className)}
      role="tablist"
      aria-label={t('ariaLabel')}
    >
      {INPUT_OPTIONS.map((option) => {
        const isActive = option.mode === currentMode;
        const isDisabled = disabled || isProcessing;
        const label = t(option.labelKey);

        return (
          <Button
            key={option.mode}
            type="button"
            variant={isActive ? 'default' : 'outline-muted'}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${option.mode}-input-panel`}
            tabIndex={isActive ? 0 : -1}
            disabled={isDisabled}
            onClick={() => handleModeChange(option)}
            aria-label={label}
            title={label}
            className={cn(
              // Same compact tile shape across all four. No lock badge,
              // no premium-y styling on gated modes — every mode tile
              // looks identical and ready to use. The parent gate fires
              // on tap; the user finds out about it AT the modal, not
              // by reading a lock icon on the tile. (Research finding:
              // a visible lock implies paywall, which kills the adult
              // trial click-through.)
              'size-14 rounded-coloring-card border-2 p-0 md:size-16',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-crayon-orange',
              isActive && 'border-transparent',
              !isActive &&
                'border-paper-cream-dark bg-white text-text-primary hover:border-crayon-orange hover:bg-crayon-orange-light/10',
              isDisabled &&
                'opacity-50 cursor-not-allowed hover:border-paper-cream-dark hover:bg-white',
            )}
            style={
              isActive
                ? ({
                    '--fa-primary-color': 'white',
                    '--fa-secondary-color': 'rgba(255, 255, 255, 0.85)',
                    '--fa-secondary-opacity': '1',
                  } as React.CSSProperties)
                : ({
                    '--fa-primary-color': 'hsl(var(--crayon-orange))',
                    '--fa-secondary-color': 'hsl(var(--crayon-teal))',
                    '--fa-secondary-opacity': '1',
                  } as React.CSSProperties)
            }
          >
            <FontAwesomeIcon
              icon={option.icon}
              size="2x"
              className={cn(
                'transition-transform duration-200',
                isActive && 'animate-bounce-in',
              )}
            />
          </Button>
        );
      })}
    </div>
  );
};

export default InputModeSelector;
