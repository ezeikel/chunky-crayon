'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShapes,
  faPencil,
  faMicrophoneLines,
  faCameraRetro,
  faLock,
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
// locked per profile until a parent unlocks them.
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
   * Modes the active profile has unlocked. Scene is always available and
   * not included here. Undefined while loading / for guests (treated as
   * "all gateable modes locked" — the safe default).
   */
  unlockedModes?: GateableMode[];
  /** Optimistically reflect an unlock without a refetch. */
  onModeUnlocked?: (mode: GateableMode) => void;
  /** True for signed-out users — they can't unlock (no profile to write). */
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

  const isModeLocked = (option: InputOption): boolean => {
    if (!option.gateable) return false;
    return !(unlockedModes ?? []).includes(option.mode as GateableMode);
  };

  const unlockMode = (mode: GateableMode) => {
    // Parent gate first (client subtraction friction), then mint the
    // scoped token and persist the unlock server-side. The HMAC token is
    // what actually authorises setModeUnlocked — the modal is just UX.
    openGate({
      reason: 'unlock-input-mode',
      onSuccess: async () => {
        const issued = await issueParentGateToken('modes:unlock');
        if (!issued.ok) {
          toast.error(t('unlockFailed'));
          return;
        }
        const res = await setModeUnlocked({
          mode,
          unlocked: true,
          parentGateToken: issued.token,
        });
        if (!res.ok) {
          toast.error(t('unlockFailed'));
          return;
        }
        onModeUnlocked?.(mode);
        setMode(mode);
        toast.success(t('unlockSuccess'));
      },
    });
  };

  const handleModeChange = (option: InputOption) => {
    if (disabled || isProcessing) return;

    if (isModeLocked(option)) {
      if (isGuest) {
        // No profile to write an unlock against — nudge to sign in
        // rather than opening a gate that can't persist.
        toast.info(t('lockedSignInPrompt'));
        return;
      }
      unlockMode(option.mode as GateableMode);
      return;
    }

    setMode(option.mode);
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
        const locked = isModeLocked(option);
        const baseLabel = t(option.labelKey);
        const label = locked ? `${baseLabel} ${t('lockedSuffix')}` : baseLabel;

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
              // Base — compact tile matching DesktopToolsSidebar tool buttons
              'relative size-14 rounded-coloring-card border-2 p-0 md:size-16',
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
                locked && 'opacity-40',
              )}
            />
            {locked && (
              <span
                className={cn(
                  'absolute -right-1 -top-1 grid size-5 place-items-center',
                  'rounded-full bg-crayon-purple text-white shadow',
                )}
                aria-hidden="true"
              >
                <FontAwesomeIcon icon={faLock} className="text-[10px]" />
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default InputModeSelector;
