"use client";

import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faKeyboard,
  faMicrophone,
  faCamera,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { useInputMode, type InputMode } from "./InputModeContext";
import { cn } from "@/lib/utils";

type InputOption = {
  mode: InputMode;
  labelKey: string;
  icon: IconDefinition;
};

const INPUT_OPTIONS: InputOption[] = [
  { mode: "text", labelKey: "type", icon: faKeyboard },
  { mode: "voice", labelKey: "talk", icon: faMicrophone },
  { mode: "image", labelKey: "photo", icon: faCamera },
];

type InputModeSelectorProps = {
  className?: string;
  disabled?: boolean;
};

const InputModeSelector = ({ className, disabled }: InputModeSelectorProps) => {
  const { mode: currentMode, setMode, isProcessing } = useInputMode();
  const t = useTranslations("createForm.inputModes");

  const handleModeChange = (mode: InputMode) => {
    if (disabled || isProcessing) return;
    setMode(mode);
  };

  return (
    <div
      className={cn("flex border-b border-border", className)}
      role="tablist"
      aria-label="Input mode"
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
              "flex flex-1 items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors",
              isActive
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground",
              isDisabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <FontAwesomeIcon icon={option.icon} size="sm" />
            {t(option.labelKey)}
          </button>
        );
      })}
    </div>
  );
};

export default InputModeSelector;
