'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPencil,
  faMicrophoneLines,
  faCameraRetro,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useInputMode, type InputMode } from './InputModeContext';
import cn from '@/utils/cn';

// =============================================================================
// Types
// =============================================================================

type InputOption = {
  mode: InputMode;
  label: string;
  icon: IconDefinition;
  description: string;
};

// =============================================================================
// Constants
// =============================================================================

const INPUT_OPTIONS: InputOption[] = [
  {
    mode: 'text',
    label: 'Type',
    icon: faPencil,
    description: 'Write what you want',
  },
  {
    mode: 'voice',
    label: 'Talk',
    icon: faMicrophoneLines,
    description: 'Say it out loud',
  },
  {
    mode: 'image',
    label: 'Photo',
    icon: faCameraRetro,
    description: 'Show us a picture',
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

  const handleModeChange = (mode: InputMode) => {
    if (disabled || isProcessing) return;
    setMode(mode);
  };

  return (
    <div
      className={cn('flex gap-3 justify-center items-center', className)}
      role="tablist"
      aria-label="Input mode selection"
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
            className={cn(
              // Base styles
              'flex flex-col items-center justify-center gap-1.5',
              'min-w-[80px] md:min-w-[90px] p-3 md:p-4 rounded-2xl',
              'transition-all duration-200 ease-out',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              // Active state
              isActive
                ? 'bg-btn-orange text-white shadow-btn-primary scale-105 focus-visible:ring-crayon-orange'
                : 'bg-white text-text-primary border-2 border-paper-cream-dark hover:border-crayon-orange hover:bg-crayon-orange-light/10 focus-visible:ring-crayon-orange',
              // Disabled state
              isDisabled &&
                'opacity-50 cursor-not-allowed hover:border-paper-cream-dark hover:bg-white',
              // Animation on hover
              !isDisabled && !isActive && 'hover:scale-105 active:scale-95',
            )}
            style={
              isActive
                ? ({
                    // Duotone icon colors for active state
                    '--fa-primary-color': 'white',
                    '--fa-secondary-color': 'rgba(255, 255, 255, 0.8)',
                    '--fa-secondary-opacity': '1',
                  } as React.CSSProperties)
                : ({
                    // Duotone icon colors for inactive state
                    '--fa-primary-color': 'hsl(var(--crayon-orange))',
                    '--fa-secondary-color': 'hsl(var(--crayon-teal))',
                    '--fa-secondary-opacity': '1',
                  } as React.CSSProperties)
            }
          >
            <FontAwesomeIcon
              icon={option.icon}
              className={cn(
                'text-2xl md:text-3xl transition-transform duration-200',
                isActive && 'animate-bounce-in',
              )}
            />
            <span className="text-xs md:text-sm font-tondo font-bold">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default InputModeSelector;
