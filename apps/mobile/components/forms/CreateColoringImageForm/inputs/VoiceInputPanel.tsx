import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faMicrophoneLines, faStop } from "@fortawesome/pro-duotone-svg-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "@jamsch/expo-speech-recognition";
import { useInputMode } from "./InputModeContext";
import Spinner from "@/components/Spinner/Spinner";

// =============================================================================
// Design Tokens (matching web tailwind config)
// =============================================================================

const COLORS = {
  // Primary - Coral: hsl(12, 75%, 58%)
  crayonOrange: "#E46444",
  // Secondary - Peach: hsl(25, 80%, 72%) - web calls this "teal"
  crayonPeach: "#F1AE7E",
  // Peach light: for transcript bubble background
  crayonPeachLight: "rgba(241, 174, 126, 0.3)",
  // Background cream dark: hsl(35, 40%, 93%)
  bgCreamDark: "#F0E9E0",
  // Text primary: hsl(20, 20%, 22%)
  textPrimary: "#443832",
  // Text muted: hsl(20, 10%, 50%)
  textMuted: "#8B7E78",
  // Red for recording
  recordingRed: "#EF4444",
  // White
  white: "#FFFFFF",
};

// =============================================================================
// Types
// =============================================================================

const CREDITS_PER_GENERATION = 5;

type VoiceInputPanelProps = {
  onSubmit: () => void;
  isSubmitting: boolean;
  credits: number;
  onShowPaywall: () => void;
};

// =============================================================================
// Component
// =============================================================================

const VoiceInputPanel = ({
  onSubmit,
  isSubmitting,
  credits,
  onShowPaywall,
}: VoiceInputPanelProps) => {
  const { description, setDescription, setIsProcessing, setError } =
    useInputMode();

  // Check if user has enough credits to generate
  const hasEnoughCredits = credits >= CREDITS_PER_GENERATION;

  // Wrap onSubmit with credit check
  const handleSubmit = useCallback(() => {
    if (!hasEnoughCredits) {
      onShowPaywall();
      return;
    }
    onSubmit();
  }, [hasEnoughCredits, onShowPaywall, onSubmit]);
  const [isListening, setIsListening] = useState(false);
  const [partialResult, setPartialResult] = useState("");

  // Animation for pulsing effect when listening
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Start/stop pulse animation based on listening state
  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 800 }),
          withTiming(0.3, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = withTiming(1);
      pulseOpacity.value = withTiming(0.5);
    }
  }, [isListening, pulseScale, pulseOpacity]);

  // Handle speech recognition results
  useSpeechRecognitionEvent("result", (event) => {
    if (event.results && event.results.length > 0) {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult) {
        const transcript = lastResult.transcript || "";

        if (event.isFinal) {
          // Final result - update context
          const newDescription = description
            ? `${description} ${transcript}`
            : transcript;
          setDescription(newDescription);
          setPartialResult("");
        } else {
          // Partial result - show in UI
          setPartialResult(transcript);
        }
      }
    }
  });

  // Handle speech recognition end
  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    setIsProcessing(false);
    setPartialResult("");
  });

  // Handle speech recognition errors
  useSpeechRecognitionEvent("error", (event) => {
    console.warn("Speech recognition error:", event.error, event.message);
    setIsListening(false);
    setIsProcessing(false);
    setError("Voice recognition failed. Please try again.");
    setPartialResult("");
  });

  const startListening = useCallback(async () => {
    try {
      const result =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        setError("Microphone permission is required for voice input.");
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setIsListening(true);
      setIsProcessing(true);
      setPartialResult("");

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
      });
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      setIsListening(false);
      setIsProcessing(false);
      setError("Failed to start voice recognition.");
    }
  }, [setIsProcessing, setError]);

  const stopListening = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
    } catch (error) {
      console.error("Failed to stop speech recognition:", error);
    }
  }, []);

  const handleMicPress = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return (
    <View style={styles.container}>
      {/* Instructions */}
      <Text style={styles.instructions}>
        {description
          ? "All done? Tap the button to create!"
          : "Tap the microphone and tell me what you want to color!"}
      </Text>

      {/* Microphone button */}
      <View style={styles.micContainer}>
        <TouchableOpacity
          onPress={handleMicPress}
          disabled={isSubmitting}
          accessibilityLabel={
            isListening ? "Stop recording" : "Start voice input"
          }
          accessibilityRole="button"
        >
          {/* Pulse effect behind the button */}
          {isListening && <Animated.View style={[styles.pulse, pulseStyle]} />}

          {/* Main button */}
          <View
            style={[
              styles.micButton,
              isListening && styles.micButtonActive,
              isSubmitting && styles.micButtonDisabled,
            ]}
          >
            <FontAwesomeIcon
              icon={isListening ? faStop : faMicrophoneLines}
              size={40}
              color={COLORS.white}
              secondaryColor={
                isListening ? COLORS.white : "rgba(255, 255, 255, 0.8)"
              }
              secondaryOpacity={1}
            />
          </View>
        </TouchableOpacity>

        {/* Status text */}
        <Text style={styles.statusText}>
          {isListening
            ? partialResult || "I'm listening! Tell me what you want to color!"
            : description
              ? ""
              : "Tap to speak"}
        </Text>
      </View>

      {/* Show transcribed text in speech bubble */}
      {description && !isListening && (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptText}>"{description}"</Text>
        </View>
      )}

      {/* Submit button - only show when we have text */}
      {description.trim() && !isListening && (
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? "Creating..." : "Create coloring page"}
          </Text>
          {isSubmitting && <Spinner color={COLORS.white} size={18} />}
        </TouchableOpacity>
      )}
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  instructions: {
    textAlign: "center",
    color: COLORS.textPrimary,
    fontSize: 18,
    fontFamily: "TondoTrial-Bold",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  micContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  pulse: {
    position: "absolute",
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: COLORS.crayonOrange,
    left: -10,
    top: -10,
  },
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.crayonOrange,
    alignItems: "center",
    justifyContent: "center",
    // shadow-btn-primary: 0 4px 14px 0 hsl(var(--crayon-orange) / 0.4)
    shadowColor: COLORS.crayonOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  micButtonActive: {
    backgroundColor: COLORS.recordingRed,
    shadowColor: COLORS.recordingRed,
  },
  micButtonDisabled: {
    backgroundColor: COLORS.bgCreamDark,
    shadowOpacity: 0,
  },
  statusText: {
    marginTop: 12,
    color: COLORS.crayonOrange,
    fontSize: 14,
    fontFamily: "TondoTrial-Regular",
    textAlign: "center",
    minHeight: 20,
  },
  transcriptContainer: {
    backgroundColor: COLORS.crayonPeachLight,
    borderWidth: 2,
    borderColor: COLORS.crayonPeach,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    marginBottom: 16,
  },
  transcriptText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontFamily: "TondoTrial-Regular",
    textAlign: "center",
    lineHeight: 26,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.crayonOrange,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    // shadow-btn-primary: 0 4px 14px 0 hsl(var(--crayon-orange) / 0.4)
    shadowColor: COLORS.crayonOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: "TondoTrial-Bold",
  },
});

export default VoiceInputPanel;
