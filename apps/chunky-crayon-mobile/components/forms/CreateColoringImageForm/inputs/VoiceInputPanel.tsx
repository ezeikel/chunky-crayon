import { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faMicrophoneLines,
  faStop,
  faRotateRight,
  faFaceDizzy,
} from "@fortawesome/pro-duotone-svg-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { useInputMode } from "./InputModeContext";
import {
  useVoiceConversation,
  type VoiceConversationError,
} from "../hooks/useVoiceConversation";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner/Spinner";
import { useT } from "@/lib/i18n/useT";
import { COLORS, FONTS } from "@/lib/design";

/**
 * Mobile 2-turn conversational voice input — RN port of web's VoiceInput.tsx.
 * Drives `useVoiceConversation` (the state machine) and renders a branch per
 * state with copy mirroring web. Shared <Button>, design-token COLORS, i18n.
 *
 * Props unchanged so the create form doesn't change: on `ready_to_submit`
 * the combined transcript is already mirrored into InputModeContext, and we
 * hand off to the parent `onSubmit` (credit-gated via onShowPaywall).
 */

const RECORDING_STATES = ["recording_a1", "recording_a2"] as const;

type VoiceInputPanelProps = {
  /**
   * Called with the two captured transcripts once the conversation completes.
   * The parent routes this through the VOICE-specific create path (charges
   * the voice credit cost, anon-blocked, purposeKey:'voice') — NOT the flat
   * text path. The panel has already credit-gated before calling this.
   */
  onVoiceSubmit: (firstAnswer: string, secondAnswer: string) => void;
  isSubmitting: boolean;
  credits: number;
  /** Credit cost of a voice generation (10) — used for the pre-submit gate. */
  voiceCreditCost: number;
  onShowPaywall: () => void;
};

// 5-bar audio level indicator — mirrors web's AudioLevelIndicator.
const AudioBars = ({ level }: { level: number }) => (
  <View style={styles.barsRow}>
    {[0, 1, 2, 3, 4].map((i) => {
      const threshold = ((i + 1) / 5) * 0.7;
      const active = level >= threshold;
      return (
        <View
          key={i}
          style={[
            styles.bar,
            { height: 16 + i * 8 },
            active ? styles.barActive : styles.barIdle,
          ]}
        />
      );
    })}
  </View>
);

const VoiceInputPanel = ({
  onVoiceSubmit,
  isSubmitting,
  credits,
  voiceCreditCost,
  onShowPaywall,
}: VoiceInputPanelProps) => {
  const t = useT("createForm.voice");
  const { setDescription, setIsProcessing, setIsBusy } = useInputMode();
  const {
    state,
    error,
    firstAnswer,
    secondAnswer,
    audioLevel,
    silenceDetected,
    start,
    stopRecording,
    reset,
  } = useVoiceConversation();

  const hasEnoughCredits = credits >= voiceCreditCost;
  const handedOffRef = useRef(false);

  // Idle-mic gentle pulse (matches web's animate-pulse on the big mic).
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (state === "idle") {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1);
    }
  }, [state, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // Mirror combined transcript into context (drives loading overlay + isReady)
  // and tell the form we're busy so its CTA hides during the conversation.
  useEffect(() => {
    if (firstAnswer && secondAnswer) {
      setDescription(`${firstAnswer} ${secondAnswer}`.trim());
    } else if (firstAnswer) {
      setDescription(firstAnswer);
    }
  }, [firstAnswer, secondAnswer, setDescription]);

  useEffect(() => {
    const busy = state !== "idle" && state !== "error";
    setIsBusy(busy);
    setIsProcessing(state === "processing_q2");
    return () => {
      setIsBusy(false);
      setIsProcessing(false);
    };
  }, [state, setIsBusy, setIsProcessing]);

  // Hand off to the parent once both turns are captured. Credit-gate first —
  // out of credits opens the paywall instead of submitting.
  useEffect(() => {
    if (state !== "ready_to_submit") {
      handedOffRef.current = false;
      return;
    }
    if (handedOffRef.current) return;
    handedOffRef.current = true;
    if (!hasEnoughCredits) {
      onShowPaywall();
      reset();
      return;
    }
    // Submit the two transcripts through the voice-specific create path.
    onVoiceSubmit(firstAnswer, secondAnswer);
  }, [
    state,
    hasEnoughCredits,
    onVoiceSubmit,
    firstAnswer,
    secondAnswer,
    onShowPaywall,
    reset,
  ]);

  const errorCopy = (code: VoiceConversationError): string => {
    const map: Record<VoiceConversationError, string> = {
      permission_denied: t("errorPermissionDenied"),
      q1_audio_failed: t("errorQ1AudioFailed"),
      stt_failed: t("errorSttFailed"),
      follow_up_failed: t("errorFollowUpFailed"),
      follow_up_blocked: t("errorFollowUpBlocked"),
      q2_audio_failed: t("errorQ2AudioFailed"),
      timeout: t("errorTimeout"),
      requires_signin: t("errorRequiresSignin"),
    };
    return map[code];
  };

  const isRecording = (RECORDING_STATES as readonly string[]).includes(state);
  const isThinking =
    state === "processing_q2" || state === "ready_to_submit" || isSubmitting;

  // ── error ──
  if (state === "error" && error) {
    return (
      <View style={styles.centered}>
        <FontAwesomeIcon
          icon={faFaceDizzy}
          size={56}
          color={COLORS.crayonOrange}
          secondaryColor={COLORS.crayonPeach}
          secondaryOpacity={1}
        />
        <Text style={styles.bigText}>{errorCopy(error)}</Text>
        <Button
          variant="default"
          size="lg"
          label={t("tryAgain")}
          onPress={reset}
          leading={
            <FontAwesomeIcon icon={faRotateRight} size={16} color="#FFFFFF" />
          }
        />
      </View>
    );
  }

  // ── q1/q2 playing — passive ──
  if (state === "q1_playing" || state === "q2_playing") {
    return (
      <View style={styles.centered}>
        <FontAwesomeIcon
          icon={faMicrophoneLines}
          size={56}
          color={COLORS.crayonOrange}
          secondaryColor={COLORS.crayonOrange}
          secondaryOpacity={0.6}
        />
        <Text style={styles.bigText}>{t("listen")}</Text>
      </View>
    );
  }

  // ── thinking (processing Q2 / handing off) ──
  if (isThinking) {
    return (
      <View style={styles.centered}>
        <Spinner color={COLORS.crayonOrange} size={44} />
        <Text style={styles.bigText}>
          {t(isSubmitting ? "painting" : "thinking")}
        </Text>
      </View>
    );
  }

  // ── recording ──
  if (isRecording) {
    return (
      <View style={styles.centered}>
        <Text
          style={[
            styles.bigText,
            silenceDetected && { color: COLORS.crayonPeach },
          ]}
        >
          {silenceDetected ? t("anythingElse") : t("listening")}
        </Text>
        <AudioBars level={audioLevel} />
        <View style={styles.recRow}>
          <Button
            variant="outline-muted"
            size="lg"
            label={t("cancel")}
            onPress={reset}
            style={styles.recCancel}
          />
          <Button
            variant={silenceDetected ? "secondary" : "default"}
            size="lg"
            label={silenceDetected ? t("imDone") : t("doneTalking")}
            onPress={stopRecording}
            style={styles.recDone}
            leading={
              <FontAwesomeIcon icon={faStop} size={16} color="#FFFFFF" />
            }
          />
        </View>
      </View>
    );
  }

  // ── idle — big bouncy mic, tap to start ──
  return (
    <View style={styles.centered}>
      <Text style={styles.bigText}>{t("tapToChat")}</Text>
      <Animated.View style={pulseStyle}>
        <Pressable
          onPress={start}
          accessibilityRole="button"
          accessibilityLabel={t("startLabel")}
          style={styles.micButton}
        >
          <FontAwesomeIcon
            icon={faMicrophoneLines}
            size={44}
            color={COLORS.white}
            secondaryColor="rgba(255,255,255,0.8)"
            secondaryOpacity={1}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 16,
  },
  bigText: {
    textAlign: "center",
    color: COLORS.textPrimary,
    fontSize: 22,
    fontFamily: FONTS.bold,
    paddingHorizontal: 16,
  },
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.crayonOrange,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.crayonOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 48,
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  barActive: {
    backgroundColor: COLORS.crayonOrange,
  },
  barIdle: {
    backgroundColor: COLORS.bgCreamDark,
  },
  recRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  recCancel: {
    flex: 1,
  },
  recDone: {
    flex: 2,
  },
});

export default VoiceInputPanel;
