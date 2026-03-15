'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles } from '@fortawesome/pro-solid-svg-icons';
import cn from '@/utils/cn';

type AutoColorButtonProps = {
  /** Trigger auto-fill of all remaining regions */
  onAutoColor: () => void;
  /** Number of regions remaining to be colored */
  remainingCount: number;
  /** Whether the AI analysis is loading */
  isLoading?: boolean;
  /** Loading message to display */
  loadingMessage?: string | null;
  /** Whether the color map is ready */
  isReady?: boolean;
  /** Error message if generation failed */
  error?: string | null;
  /** Additional CSS classes */
  className?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
};

// Kid-friendly button: magical purple theme for AI features
const buttonClassName =
  'flex items-center justify-center gap-x-2 md:gap-x-3 text-white font-bold text-base md:text-lg size-11 md:size-auto md:px-8 md:py-4 rounded-full shadow-lg bg-crayon-purple hover:bg-crayon-purple-dark active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

const AutoColorButton = ({
  onAutoColor,
  remainingCount,
  isLoading = false,
  loadingMessage,
  isReady = false,
  error,
  className,
  disabled = false,
}: AutoColorButtonProps) => {
  // Show loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-x-2 md:gap-x-3 text-white font-bold text-base md:text-lg px-4 md:px-8 py-2 md:py-4 rounded-full shadow-lg bg-crayon-purple/70 cursor-wait',
          className,
        )}
      >
        <div className="size-5 md:size-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <span className="hidden md:inline text-sm">
          {loadingMessage || 'Preparing magic...'}
        </span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-x-2 text-crayon-pink font-bold text-sm md:text-base px-4 md:px-6 py-2 md:py-3 rounded-full shadow-lg bg-white border-2 border-crayon-pink',
          className,
        )}
      >
        <span className="hidden md:inline">{error}</span>
        <span className="md:hidden">Error</span>
      </div>
    );
  }

  // Show ready state with count
  if (isReady && remainingCount > 0) {
    return (
      <button
        type="button"
        onClick={onAutoColor}
        disabled={disabled}
        className={cn(buttonClassName, className)}
      >
        <FontAwesomeIcon
          icon={faWandMagicSparkles}
          className="text-xl md:text-2xl"
        />
        <span className="hidden md:inline">Auto-Color ({remainingCount})</span>
      </button>
    );
  }

  // Show completed state
  if (isReady && remainingCount === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-x-2 md:gap-x-3 text-white font-bold text-base md:text-lg px-4 md:px-8 py-2 md:py-4 rounded-full shadow-lg bg-crayon-green',
          className,
        )}
      >
        <span className="text-xl md:text-2xl">🎉</span>
        <span className="hidden md:inline">All Done!</span>
      </div>
    );
  }

  // Show disabled/not ready state
  return (
    <button
      type="button"
      disabled
      className={cn(
        buttonClassName,
        'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <FontAwesomeIcon
        icon={faWandMagicSparkles}
        className="text-xl md:text-2xl"
      />
      <span className="hidden md:inline">Auto-Color</span>
    </button>
  );
};

export default AutoColorButton;
