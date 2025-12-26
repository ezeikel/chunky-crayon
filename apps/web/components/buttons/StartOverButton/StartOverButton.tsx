'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRotateLeft } from '@fortawesome/pro-solid-svg-icons';
import cn from '@/utils/cn';

type StartOverButtonProps = {
  onStartOver: () => void;
  className?: string;
  disabled?: boolean;
};

// Kid-friendly button: matches Print button style but secondary color (teal)
// Responsive: icon-only on mobile (44px touch target), icon+text on desktop
const buttonClassName =
  'flex items-center justify-center gap-x-2 md:gap-x-3 text-white font-bold text-base md:text-lg size-11 md:size-auto md:px-8 md:py-4 rounded-full shadow-lg bg-crayon-teal hover:bg-crayon-teal-dark active:scale-95 transition-all duration-150';

const StartOverButton = ({
  onStartOver,
  className,
  disabled = false,
}: StartOverButtonProps) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = () => {
    if (showConfirm) {
      // User confirmed, execute start over
      onStartOver();
      setShowConfirm(false);
    } else {
      // Show confirmation
      setShowConfirm(true);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <div className={cn('flex items-center gap-x-1.5 md:gap-x-2', className)}>
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center justify-center gap-x-1.5 text-white font-bold text-sm md:text-base px-3 py-2 md:px-6 md:py-3 rounded-full shadow-lg bg-crayon-pink hover:bg-crayon-pink-dark active:scale-95 transition-all duration-150"
        >
          <FontAwesomeIcon
            icon={faArrowRotateLeft}
            className="text-base md:text-xl"
          />
          <span className="hidden md:inline">Yes, Start Over</span>
          <span className="md:hidden">Yes</span>
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center justify-center text-text-secondary font-bold text-sm md:text-base px-3 py-2 md:px-6 md:py-3 rounded-full shadow-lg bg-white hover:bg-paper-cream active:scale-95 transition-all duration-150 border-2 border-paper-cream-dark"
        >
          <span className="hidden md:inline">Keep Coloring</span>
          <span className="md:hidden">No</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        buttonClassName,
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <FontAwesomeIcon
        icon={faArrowRotateLeft}
        className="text-xl md:text-2xl"
      />
      <span className="hidden md:inline">Start Over</span>
    </button>
  );
};

export default StartOverButton;
