"use client";

import { useColoringContext } from "./context";
import cn from "./cn";

type AutoColorModalProps = {
  className?: string;
};

/**
 * Full-page modal overlay shown during auto-color.
 * Blocks all interaction while the canvas is being painted.
 */
const AutoColorModal = ({ className }: AutoColorModalProps) => {
  const { isAutoColoring, variant } = useColoringContext();
  const isKids = variant === "kids";

  if (!isAutoColoring) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-[2px]",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center gap-4 p-8 rounded-2xl shadow-2xl",
          isKids
            ? "bg-orange-50 border-2 border-orange-200"
            : "bg-white border border-gray-200",
        )}
      >
        {/* Spinner */}
        <div className="relative">
          <div
            className={cn(
              "size-16 border-4 rounded-full animate-spin",
              isKids
                ? "border-orange-200 border-t-orange-500"
                : "border-gray-200 border-t-violet-600",
            )}
          />
          <span className="absolute inset-0 flex items-center justify-center text-2xl">
            {isKids ? "🎨" : "✨"}
          </span>
        </div>

        {/* Text */}
        <div className="text-center">
          <h3
            className={cn(
              "font-bold text-lg",
              isKids ? "text-orange-600" : "text-gray-800",
            )}
          >
            {isKids ? "Coloring your picture!" : "Auto-coloring..."}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {isKids
              ? "Watch the magic happen! ✨"
              : "Painting colors from AI reference"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutoColorModal;
