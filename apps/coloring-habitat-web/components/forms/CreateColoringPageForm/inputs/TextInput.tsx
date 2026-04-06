"use client";

import useUser from "@/hooks/useUser";
import { trackEvent } from "@/utils/analytics-client";
import { TRACKING_EVENTS } from "@/constants";
import SubmitButton from "@/components/buttons/SubmitButton/SubmitButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useInputMode } from "./InputModeContext";

type TextInputProps = {
  className?: string;
};

const TextInput = ({ className }: TextInputProps) => {
  const {
    isSignedIn,
    canGenerate,
    blockedReason,
    hasActiveSubscription,
    handleAuthAction,
    isGuest,
    remainingGenerations,
  } = useUser();

  const { description, setDescription } = useInputMode();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  const getTextareaConfig = () => {
    if (canGenerate) {
      return {
        disabled: false,
        placeholder:
          "e.g. a serene Japanese garden with koi and cherry blossoms...",
      };
    }

    if (blockedReason === "guest_limit_reached") {
      return {
        disabled: true,
        placeholder:
          "You've used your 2 free creations today. Sign up to keep creating!",
      };
    }

    if (blockedReason === "no_credits") {
      if (hasActiveSubscription) {
        return {
          disabled: true,
          placeholder:
            "You've run out of credits. Buy more to continue creating!",
        };
      }
      return {
        disabled: true,
        placeholder: "You've run out of credits. Subscribe for more creations!",
      };
    }

    return {
      disabled: true,
      placeholder: "Sign in to start creating coloring pages",
    };
  };

  const getButtonConfig = () => {
    if (canGenerate) {
      if (isGuest) {
        return {
          text: `Create my page (${remainingGenerations} free left)`,
          isSubmit: true,
        };
      }
      return {
        text: "Create my page",
        isSubmit: true,
      };
    }

    if (blockedReason === "guest_limit_reached") {
      return {
        text: "Sign up for free",
        action: () => {
          trackEvent(TRACKING_EVENTS.GUEST_SIGNUP_CLICKED, {
            location: "text_input",
          });
          handleAuthAction("signin");
        },
        subtext: "Create an account to unlock more creations",
        isSubmit: false,
      };
    }

    if (blockedReason === "no_credits") {
      return {
        text: hasActiveSubscription ? "Buy credits" : "View plans",
        action: () => handleAuthAction("billing"),
        subtext: hasActiveSubscription
          ? "Get more credits to keep creating"
          : "Subscribe for unlimited creativity",
        isSubmit: false,
      };
    }

    return {
      text: "Get started",
      action: () => handleAuthAction("signin"),
      subtext: "Sign in to start creating",
      isSubmit: false,
    };
  };

  const textareaConfig = getTextareaConfig();
  const buttonConfig = getButtonConfig();

  return (
    <div
      className={cn("flex flex-col gap-y-4", className)}
      role="tabpanel"
      id="text-input-panel"
      aria-labelledby="text-mode-tab"
    >
      <Textarea
        name="description"
        value={description}
        onChange={handleChange}
        placeholder={textareaConfig.placeholder}
        className={cn(
          "text-sm min-h-24 rounded-xl border border-border bg-secondary resize-none p-4 leading-relaxed",
          "placeholder:text-muted-foreground",
          "focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground",
          textareaConfig.disabled && "cursor-not-allowed opacity-60",
        )}
        required
        disabled={textareaConfig.disabled}
      />
      {buttonConfig.isSubmit ? (
        <SubmitButton
          text={buttonConfig.text}
          className="w-full rounded-lg bg-primary py-3.5 text-base font-bold text-primary-foreground transition-shadow hover:shadow-md"
        />
      ) : (
        <Button
          onClick={buttonConfig.action}
          className="w-full rounded-lg bg-primary py-3.5 text-base font-bold text-primary-foreground transition-shadow hover:shadow-md h-auto"
          type="button"
        >
          {buttonConfig.text}
        </Button>
      )}
      {buttonConfig.subtext && (
        <p className="text-xs text-center text-muted-foreground">
          {buttonConfig.subtext}
        </p>
      )}
    </div>
  );
};

export default TextInput;
