"use client";

import { useState } from "react";
import { useColoringContext } from "./context";
import cn from "./cn";

type AutoColorPreviewProps = {
  /** Base64 data URL of the AI-colored reference image */
  referenceImage: string;
  /** Called when user approves the reference — apply colors to canvas */
  onApply: () => void;
  /** Called when user wants to try a different coloring */
  onRetry: () => void;
  /** Called when user cancels auto-color entirely */
  onCancel: () => void;
  /** Whether a retry is in progress */
  isRetrying?: boolean;
  className?: string;
};

/**
 * Preview overlay for AI-generated colored reference image.
 * Shows the reference alongside the original so the user can judge
 * the color scheme before applying it to their canvas.
 */
const AutoColorPreview = ({
  referenceImage,
  onApply,
  onRetry,
  onCancel,
  isRetrying = false,
  className,
}: AutoColorPreviewProps) => {
  const { variant } = useColoringContext();
  const isKids = variant === "kids";
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center gap-4 p-6 rounded-2xl shadow-2xl max-w-lg w-[90%]",
          isKids
            ? "bg-orange-50 border-2 border-orange-200"
            : "bg-white border border-gray-200",
        )}
      >
        {/* Header */}
        <h3
          className={cn(
            "font-bold text-lg",
            isKids ? "text-orange-600" : "text-gray-800",
          )}
        >
          {isKids ? "Look at these colors! 🎨" : "Preview Auto-Color"}
        </h3>

        <p className="text-sm text-coloring-muted text-center">
          {isKids
            ? "Do you like how this looks?"
            : "Review the AI-suggested coloring before applying it to your canvas."}
        </p>

        {/* Reference image preview */}
        <div className="relative w-full aspect-square rounded-coloring-card overflow-hidden border border-gray-200 bg-gray-50">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-8 border-3 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          )}
          <img
            src={referenceImage}
            alt="AI-colored preview"
            className={cn(
              "w-full h-full object-contain transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onCancel}
            disabled={isRetrying}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-coloring-card text-sm font-medium transition-colors",
              "border border-gray-300 text-coloring-muted hover:bg-gray-50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-coloring-card text-sm font-medium transition-colors",
              isKids
                ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {isRetrying ? (
              <span className="flex items-center justify-center gap-2">
                <span className="size-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              "Try Again"
            )}
          </button>

          <button
            type="button"
            onClick={onApply}
            disabled={isRetrying}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-coloring-card text-sm font-bold transition-colors text-white",
              isKids
                ? "bg-orange-500 hover:bg-orange-600"
                : "bg-green-600 hover:bg-green-700",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {isKids ? "Yes! Color it! 🎉" : "Apply Colors"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoColorPreview;
