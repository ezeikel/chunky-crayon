"use client";

import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMicrophone,
  faStop,
  faRotateRight,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import useUser from "@/hooks/useUser";
import { trackEvent } from "@/utils/analytics-client";
import { TRACKING_EVENTS } from "@/constants";
import { Button } from "@/components/ui/button";
import SubmitButton from "@/components/buttons/SubmitButton/SubmitButton";
import { cn } from "@/lib/utils";
import { useInputMode } from "./InputModeContext";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";

type VoiceInputProps = {
  className?: string;
};

const AudioLevelIndicator = ({ level }: { level: number }) => {
  const bars = Array.from({ length: 5 }, (_, i) => {
    const threshold = (i + 1) / 5;
    const isActive = level >= threshold * 0.7;
    return (
      <div
        key={i}
        className={cn(
          "w-2 rounded-full transition-all duration-100",
          isActive ? "bg-primary" : "bg-muted",
        )}
        style={{
          height: `${20 + i * 8}px`,
          transform: isActive ? `scaleY(${0.8 + level * 0.4})` : "scaleY(1)",
        }}
      />
    );
  });

  return <div className="flex items-end gap-1.5 h-12">{bars}</div>;
};

const CountdownTimer = ({
  duration,
  maxDuration,
}: {
  duration: number;
  maxDuration: number;
}) => {
  const remaining = maxDuration - duration;
  const percentage = (duration / maxDuration) * 100;
  const isLow = remaining <= 5;

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={cn(
          "text-2xl font-bold tabular-nums",
          isLow ? "text-destructive animate-pulse" : "text-foreground",
        )}
      >
        {remaining}s
      </span>
      <div className="w-32 h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-100",
            isLow ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const VoiceInput = ({ className }: VoiceInputProps) => {
  const {
    canGenerate,
    blockedReason,
    hasActiveSubscription,
    handleAuthAction,
    isGuest,
    remainingGenerations,
  } = useUser();

  const { description, setDescription, setIsProcessing } = useInputMode();

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const {
    state,
    transcription,
    error,
    audioLevel,
    duration,
    maxDuration,
    silenceDuration,
    isSilenceDetected,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
    isSupported,
  } = useVoiceRecorder();

  useEffect(() => {
    if (transcription) {
      setDescription(transcription);
    }
  }, [transcription, setDescription]);

  useEffect(() => {
    setIsProcessing(state === "processing");
  }, [state, setIsProcessing]);

  useEffect(() => {
    if (state === "recording") {
      trackEvent(TRACKING_EVENTS.VOICE_INPUT_STARTED, {
        location: "create_form",
      });
    }
  }, [state]);

  useEffect(() => {
    if (state === "complete" && transcription && submitButtonRef.current) {
      const timer = setTimeout(() => {
        submitButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state, transcription]);

  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
    trackEvent(TRACKING_EVENTS.VOICE_INPUT_COMPLETED, {
      transcription: transcription || "",
      durationMs: duration * 1000,
    });
  };

  const handleCancel = () => {
    cancelRecording();
    trackEvent(TRACKING_EVENTS.VOICE_INPUT_CANCELLED, {
      durationMs: duration * 1000,
      reason: "user_cancelled",
    });
  };

  const handleRetry = () => {
    reset();
  };

  const canRecord = canGenerate;

  const getButtonConfig = () => {
    if (canGenerate) {
      if (isGuest) {
        return {
          text: `Create my page (${remainingGenerations} free left)`,
          isSubmit: true,
        };
      }
      return { text: "Create my page", isSubmit: true };
    }

    if (blockedReason === "guest_limit_reached") {
      return {
        text: "Sign up for free",
        action: () => {
          trackEvent(TRACKING_EVENTS.GUEST_SIGNUP_CLICKED, {
            location: "voice_input",
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

  const buttonConfig = getButtonConfig();

  if (!isSupported) {
    return (
      <div
        className={cn("flex flex-col items-center gap-4 py-8", className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <p className="text-center text-muted-foreground font-semibold">
          Voice recording is not supported in this browser.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Try Chrome or Safari for the best experience.
        </p>
      </div>
    );
  }

  if (state === "error") {
    const errorMessages: Record<string, string> = {
      permission_denied:
        "Microphone access was denied. Please allow access in your browser settings.",
      not_supported: "Voice recording is not supported in this browser.",
      transcription_failed:
        "Couldn't understand the recording. Please try again.",
      recording_failed: "Recording failed. Please try again.",
      timeout: "Recording timed out. Please try again.",
    };

    return (
      <div
        className={cn("flex flex-col items-center gap-4 py-8", className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <p className="text-center text-foreground font-semibold">
          {errorMessages[error || "recording_failed"]}
        </p>
        <Button onClick={handleRetry} variant="outline">
          <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
          Try again
        </Button>
      </div>
    );
  }

  if (state === "recording") {
    const autoStopCountdown = isSilenceDetected
      ? Math.max(0, Math.ceil(4 - silenceDuration))
      : null;

    return (
      <div
        className={cn("flex flex-col items-center gap-6 py-4", className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <p
          className={cn(
            "text-center font-semibold text-lg transition-all duration-300",
            isSilenceDetected ? "text-primary" : "text-foreground",
          )}
        >
          {isSilenceDetected
            ? `All done? Stopping in ${autoStopCountdown}s...`
            : "Listening..."}
        </p>

        <AudioLevelIndicator level={audioLevel} />
        <CountdownTimer duration={duration} maxDuration={maxDuration} />

        <div className="flex gap-3">
          <Button onClick={handleCancel} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={handleStopRecording}
            className={cn(
              "px-8 transition-all duration-300",
              isSilenceDetected && "animate-pulse",
            )}
          >
            <FontAwesomeIcon icon={faStop} className="mr-2" />
            {isSilenceDetected ? "I'm done" : "Done talking"}
          </Button>
        </div>
      </div>
    );
  }

  if (state === "processing" || state === "requesting_permission") {
    return (
      <div
        className={cn("flex flex-col items-center gap-4 py-8", className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <FontAwesomeIcon
          icon={faSpinner}
          className="text-5xl animate-spin text-primary"
        />
        <p className="text-center text-foreground font-semibold">
          {state === "requesting_permission"
            ? "Getting microphone ready..."
            : "Understanding what you said..."}
        </p>
      </div>
    );
  }

  if (state === "complete" && transcription) {
    const isDescriptionReady = description.trim().length > 0;

    return (
      <div
        className={cn("flex flex-col items-center gap-5 py-4", className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <div className="relative w-full max-w-sm">
          <div className="bg-secondary border border-border rounded-2xl px-5 py-4 text-center">
            <p className="text-foreground text-lg leading-relaxed">
              &ldquo;{transcription}&rdquo;
            </p>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-secondary border-b border-r border-border rotate-45" />
        </div>

        <div className="flex flex-col items-center gap-3 mt-2">
          {buttonConfig.isSubmit ? (
            <SubmitButton
              ref={submitButtonRef}
              text="Create my coloring page"
              className="text-lg px-8 py-6 rounded-lg"
              disabled={!isDescriptionReady}
            />
          ) : (
            <Button
              onClick={buttonConfig.action}
              className="text-lg px-8 py-6 rounded-lg h-auto"
              type="button"
            >
              {buttonConfig.text}
            </Button>
          )}

          {buttonConfig.subtext && (
            <p className="text-sm text-center text-muted-foreground">
              {buttonConfig.subtext}
            </p>
          )}

          <button
            type="button"
            onClick={handleRetry}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Not quite right? Try again
          </button>
        </div>
      </div>
    );
  }

  // Idle state
  return (
    <div
      className={cn("flex flex-col items-center gap-6 py-4", className)}
      role="tabpanel"
      id="voice-input-panel"
      aria-labelledby="voice-mode-tab"
    >
      <p className="text-center text-foreground font-semibold text-lg">
        {canRecord
          ? "Tap to describe your page"
          : blockedReason === "guest_limit_reached"
            ? "You've used your free creations. Sign up to continue!"
            : blockedReason === "no_credits"
              ? "You've run out of credits."
              : "Sign in to record"}
      </p>

      <button
        type="button"
        onClick={handleStartRecording}
        disabled={!canRecord}
        className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center",
          "transition-all duration-200 ease-out",
          "focus:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2",
          canRecord
            ? "bg-primary text-white hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
            : "bg-muted cursor-not-allowed",
        )}
        aria-label="Start recording"
      >
        <FontAwesomeIcon
          icon={faMicrophone}
          className={cn("text-4xl", canRecord && "animate-pulse")}
        />
      </button>

      <p className="text-sm text-muted-foreground text-center">
        Max {maxDuration} seconds
      </p>

      {!canRecord && (
        <>
          {!buttonConfig.isSubmit && (
            <Button onClick={buttonConfig.action} type="button">
              {buttonConfig.text}
            </Button>
          )}
          {buttonConfig.subtext && (
            <p className="text-sm text-center text-muted-foreground">
              {buttonConfig.subtext}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default VoiceInput;
