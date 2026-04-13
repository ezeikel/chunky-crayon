"use client";

import { useEffect, useState, useCallback } from "react";
import { useColoringContext } from "./context";
import { useSound } from "./useSound";
import { haptics } from "./haptics";
import cn from "./cn";

type CompletionCelebrationProps = {
  className?: string;
  /** Called when the celebration has been shown and dismissed */
  onDismiss?: () => void;
};

/**
 * Completion celebration overlay.
 * - Kids: confetti particles + sparkle sound + "You did it!" message
 * - Adults: gentle glow + mindful completion message
 *
 * Shows automatically when isColoringComplete becomes true.
 * Dismisses on tap/click or after a timeout.
 */
const CompletionCelebration = ({
  className,
  onDismiss,
}: CompletionCelebrationProps) => {
  const { isColoringComplete, variant } = useColoringContext();
  const { playSound } = useSound();
  const isKids = variant === "kids";

  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  // Show celebration when coloring completes (only once per session)
  useEffect(() => {
    if (isColoringComplete && !hasShown) {
      setIsVisible(true);
      setHasShown(true);
      playSound("sparkle");
      haptics.celebration(variant);

      // Auto-dismiss after 5 seconds (kids) or 4 seconds (adults)
      const timer = setTimeout(
        () => {
          setIsVisible(false);
          onDismiss?.();
        },
        isKids ? 5000 : 4000,
      );

      return () => clearTimeout(timer);
    }
  }, [isColoringComplete, hasShown, isKids, playSound, onDismiss]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!isVisible) return null;

  if (isKids) {
    return (
      <div
        className={cn(
          "absolute inset-0 z-50 flex items-center justify-center",
          "animate-in fade-in duration-500",
          className,
        )}
        onClick={handleDismiss}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleDismiss()}
      >
        {/* Semi-transparent backdrop */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

        {/* Celebration content */}
        <div className="relative flex flex-col items-center gap-4 animate-bounce-gentle">
          {/* Emoji confetti burst */}
          <div className="text-6xl sm:text-7xl animate-pulse">🎉</div>
          <div className="flex gap-2 text-3xl">
            <span className="animate-spin-slow">⭐</span>
            <span className="animate-bounce">🌈</span>
            <span className="animate-spin-slow">✨</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">
            You did it!
          </h2>
          <p className="text-lg text-white/90 drop-shadow">
            Amazing coloring! 🎨
          </p>
        </div>
      </div>
    );
  }

  // Adults: elegant, minimal celebration
  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex items-center justify-center",
        "animate-in fade-in duration-700",
        className,
      )}
      onClick={handleDismiss}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleDismiss()}
    >
      {/* Subtle backdrop */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]" />

      {/* Celebration content */}
      <div className="relative flex flex-col items-center gap-3 px-8 py-6 rounded-2xl bg-white/80 backdrop-blur-sm shadow-xl">
        <div className="text-4xl">🎨</div>
        <h2 className="text-xl font-semibold text-gray-800">
          Beautifully done
        </h2>
        <p className="text-sm text-coloring-muted">
          Your coloring is complete. Take a moment to admire your work.
        </p>
        <button
          type="button"
          className="mt-2 px-4 py-1.5 text-sm font-medium text-coloring-muted bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          onClick={handleDismiss}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default CompletionCelebration;
