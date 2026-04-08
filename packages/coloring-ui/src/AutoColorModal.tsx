"use client";

import { useEffect } from "react";
import { useColoringContext } from "./context";
import cn from "./cn";

type AutoColorModalProps = {
  className?: string;
};

/**
 * Full-page modal overlay shown during auto-color.
 * Blocks all interaction and scroll while the canvas is being painted.
 */
const AutoColorModal = ({ className }: AutoColorModalProps) => {
  const { isAutoColoring, variant } = useColoringContext();
  const isKids = variant === "kids";

  // Disable body scroll while modal is visible
  useEffect(() => {
    if (isAutoColoring) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isAutoColoring]);

  if (!isAutoColoring) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center gap-5 px-10 py-8 rounded-2xl shadow-xl max-w-sm mx-4",
          isKids
            ? "bg-white border-2 border-crayon-purple/20"
            : "bg-white border border-gray-100",
        )}
      >
        {/* Spinner */}
        <div
          className={cn(
            "size-12 border-[3px] rounded-full animate-spin",
            isKids
              ? "border-crayon-purple/20 border-t-crayon-purple"
              : "border-gray-200 border-t-gray-800",
          )}
        />

        {/* Text */}
        <div className="text-center">
          <h3
            className={cn(
              "font-semibold text-base",
              isKids ? "text-crayon-purple" : "text-gray-900",
            )}
          >
            {isKids ? "Coloring your picture!" : "Adding color to your page"}
          </h3>
          <p
            className={cn(
              "text-sm mt-1.5",
              isKids ? "text-crayon-purple/60" : "text-gray-500",
            )}
          >
            {isKids
              ? "Hang tight, the magic is happening"
              : "This may take a few seconds"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutoColorModal;
