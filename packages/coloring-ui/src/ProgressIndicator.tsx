"use client";

import { useColoringContext } from "./context";
import cn from "./cn";

type ProgressIndicatorProps = {
  className?: string;
};

/**
 * Coloring progress indicator.
 * - Kids: animated star-filling progress ring
 * - Adults: minimal, elegant progress line
 */
const ProgressIndicator = ({ className }: ProgressIndicatorProps) => {
  const { coloringProgress, isColoringComplete, variant } =
    useColoringContext();
  const isKids = variant === "kids";

  if (coloringProgress === 0) return null;

  if (isKids) {
    // Star-filling circular progress ring
    const circumference = 2 * Math.PI * 18; // r=18
    const offset = circumference - (coloringProgress / 100) * circumference;

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative size-10">
          <svg className="size-10 -rotate-90" viewBox="0 0 40 40">
            {/* Background ring */}
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="3"
            />
            {/* Progress ring */}
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke={isColoringComplete ? "#FDD835" : "#FB8C00"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          {/* Star icon in center */}
          <span className="absolute inset-0 flex items-center justify-center text-sm">
            {isColoringComplete ? "🌟" : "⭐"}
          </span>
        </div>
        <span className="text-sm font-bold text-orange-500">
          {coloringProgress}%
        </span>
      </div>
    );
  }

  // Adults: minimal progress line
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="w-20 sm:w-28 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            isColoringComplete ? "bg-green-500" : "bg-gray-500",
          )}
          style={{ width: `${coloringProgress}%` }}
        />
      </div>
      <span className="text-xs text-coloring-muted tabular-nums">
        {coloringProgress}%
      </span>
    </div>
  );
};

export default ProgressIndicator;
