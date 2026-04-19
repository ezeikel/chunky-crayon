"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPencil,
  faMicrophoneLines,
  faCameraRetro,
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { useInputMode, type InputMode } from "./InputMode";
import cn from "./cn";

export type InputModeSelectorLabels = {
  text?: string;
  voice?: string;
  image?: string;
  ariaLabel?: string;
};

type InputOption = {
  mode: InputMode;
  defaultLabel: string;
  icon: IconDefinition;
};

const INPUT_OPTIONS: InputOption[] = [
  { mode: "text", defaultLabel: "Type", icon: faPencil },
  { mode: "voice", defaultLabel: "Talk", icon: faMicrophoneLines },
  { mode: "image", defaultLabel: "Photo", icon: faCameraRetro },
];

type InputModeSelectorProps = {
  className?: string;
  /** Disable all mode buttons */
  disabled?: boolean;
  /** Optional translated labels; English defaults used otherwise. */
  labels?: InputModeSelectorLabels;
};

/**
 * Three-way toggle between text / voice / image input modes for the
 * create-coloring-page form. Reads current mode from `useInputMode`
 * (must be wrapped in `InputModeProvider`).
 *
 * Tokenised — renders the active brand's accent + surface tokens.
 */
const InputModeSelector = ({
  className,
  disabled,
  labels = {},
}: InputModeSelectorProps) => {
  const { mode: currentMode, setMode, isProcessing } = useInputMode();

  const resolveLabel = (opt: InputOption) => {
    if (opt.mode === "text") return labels.text ?? opt.defaultLabel;
    if (opt.mode === "voice") return labels.voice ?? opt.defaultLabel;
    return labels.image ?? opt.defaultLabel;
  };

  const handleModeChange = (mode: InputMode) => {
    if (disabled || isProcessing) return;
    setMode(mode);
  };

  return (
    <div
      className={cn("flex gap-2 md:gap-3 justify-center", className)}
      role="tablist"
      aria-label={labels.ariaLabel ?? "Choose input mode"}
    >
      {INPUT_OPTIONS.map((option) => {
        const isActive = option.mode === currentMode;
        const isDisabled = disabled || isProcessing;
        const label = resolveLabel(option);

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
            aria-label={label}
            title={label}
            className={cn(
              "flex items-center justify-center size-14 md:size-16 rounded-coloring-card",
              "border-2 transition-all duration-coloring-base ease-coloring",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coloring-accent",
              isActive
                ? "bg-coloring-accent border-transparent text-white shadow-coloring-button"
                : "bg-white border-coloring-surface-dark text-coloring-text-primary hover:border-coloring-accent hover:bg-coloring-surface",
              isDisabled &&
                "opacity-50 cursor-not-allowed hover:border-coloring-surface-dark hover:bg-white",
              !isDisabled && !isActive && "hover:scale-105 active:scale-95",
            )}
          >
            <FontAwesomeIcon
              icon={option.icon}
              size="2x"
              className="transition-transform duration-coloring-base"
            />
          </button>
        );
      })}
    </div>
  );
};

export default InputModeSelector;
