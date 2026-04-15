'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPencil,
  faMicrophoneLines,
  faCameraRetro,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useTranslations } from 'next-intl';
import { useInputMode, type InputMode } from './InputModeContext';
import cn from '@/utils/cn';

// =============================================================================
// Types
// =============================================================================

type InputOption = {
  mode: InputMode;
  labelKey: 'type' | 'talk' | 'photo';
  icon: IconDefinition;
};

// =============================================================================
// Constants
// =============================================================================

const INPUT_OPTIONS: InputOption[] = [
  {
    mode: 'text',
    labelKey: 'type',
    icon: faPencil,
  },
  {
    mode: 'voice',
    labelKey: 'talk',
    icon: faMicrophoneLines,
  },
  {
    mode: 'image',
    labelKey: 'photo',
    icon: faCameraRetro,
  },
];

// =============================================================================
// Component
// =============================================================================

type InputModeSelectorProps = {
  className?: string;
  /** Disable all mode buttons */
  disabled?: boolean;
};

const InputModeSelector = ({ className, disabled }: InputModeSelectorProps) => {
  const { mode: currentMode, setMode, isProcessing } = useInputMode();
  const t = useTranslations('createForm.inputModes');

  const handleModeChange = (mode: InputMode) => {
    if (disabled || isProcessing) return;
    setMode(mode);
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

        return (
          <button
            key={option.mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`${option.mode}-input-panel`}
            tabIndex={isActive ? 0 : -1}
            disabled={isDisabled}
            onClick={() => handleModeChange(option.mode)}
            aria-label={t(option.labelKey)}
            title={t(option.labelKey)}
            className={cn(
              // Base — compact tile matching DesktopToolsSidebar tool buttons
              'flex items-center justify-center size-14 md:size-16 rounded-coloring-card',
              'border-2 transition-all duration-200 ease-out',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-crayon-orange',
              isActive
                ? 'bg-btn-orange border-transparent text-white shadow-btn-primary'
                : 'bg-white border-paper-cream-dark text-text-primary hover:border-crayon-orange hover:bg-crayon-orange-light/10',
              isDisabled &&
                'opacity-50 cursor-not-allowed hover:border-paper-cream-dark hover:bg-white',
              !isDisabled && !isActive && 'hover:scale-105 active:scale-95',
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
          </button>
        );
      })}
    </div>
  );
};

export default InputModeSelector;
