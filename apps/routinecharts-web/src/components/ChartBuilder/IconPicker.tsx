import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ROUTINE_ICONS } from "./icons";
import { trackEvent } from "@one-colored-pixel/satellite-shared/analytics";

const FullEmojiPicker = lazy(() => import("./FullEmojiPicker"));

type Props = {
  value: string;
  onChange: (icon: string) => void;
};

type Mode = "quick" | "full";

export const IconPicker = ({ value, onChange }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("quick");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setMode("quick");
  }, [isOpen]);

  const handlePick = (emoji: string) => {
    onChange(emoji);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-12 h-12 flex items-center justify-center text-3xl bg-white border border-slate-200 hover:border-brand rounded-lg transition-colors"
        aria-label="Change icon"
        aria-expanded={isOpen}
      >
        {value}
      </button>
      {isOpen && (
        <div className="absolute z-20 top-full mt-2 left-0 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
          {mode === "quick" ? (
            <>
              <div className="grid grid-cols-6 gap-1 w-72">
                {ROUTINE_ICONS.map((icon) => (
                  <button
                    key={icon.emoji}
                    type="button"
                    onClick={() => handlePick(icon.emoji)}
                    className={`w-10 h-10 flex items-center justify-center text-2xl rounded-lg hover:bg-brand-tint transition-colors ${
                      icon.emoji === value
                        ? "bg-brand-tint ring-2 ring-brand"
                        : ""
                    }`}
                    title={icon.label}
                    aria-label={icon.label}
                  >
                    {icon.emoji}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode("full");
                  trackEvent("browse_all_emoji_opened");
                }}
                className="w-full mt-2 py-2 text-xs font-medium text-slate-500 hover:text-brand hover:bg-brand-tint rounded-lg transition-colors"
              >
                Browse all emoji
              </button>
            </>
          ) : (
            <Suspense
              fallback={
                <div className="w-[352px] h-[400px] flex items-center justify-center text-sm text-slate-500">
                  Loading…
                </div>
              }
            >
              <FullEmojiPicker
                onPick={handlePick}
                onBack={() => setMode("quick")}
              />
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
};
