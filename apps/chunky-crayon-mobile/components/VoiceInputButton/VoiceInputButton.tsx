import { useState, useCallback, useEffect } from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faMicrophone, faStop } from "@fortawesome/pro-solid-svg-icons";
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
import { perfect } from "@/styles";

type VoiceInputButtonProps = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
};

const VoiceInputButton = ({
  onTranscript,
  disabled = false,
}: VoiceInputButtonProps) => {
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
          withTiming(1.3, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        true,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 600 }),
          withTiming(0.3, { duration: 600 }),
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
      // Get the last result (most recent recognition)
      const lastResult = event.results[event.results.length - 1];
      if (lastResult) {
        const transcript = lastResult.transcript || "";

        if (event.isFinal) {
          // Final result - pass to parent
          onTranscript(transcript);
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
    setPartialResult("");
  });

  // Handle speech recognition errors
  useSpeechRecognitionEvent("error", (event) => {
    console.warn("Speech recognition error:", event.error, event.message);
    setIsListening(false);
    setPartialResult("");
  });

  const startListening = useCallback(async () => {
    try {
      // Check permissions
      const result =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        console.warn("Microphone permission not granted");
        return;
      }

      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setIsListening(true);
      setPartialResult("");

      // Start recognition
      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
      });
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
    } catch (error) {
      console.error("Failed to stop speech recognition:", error);
    }
  }, []);

  const handlePress = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return (
    <View className="items-center">
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        className="relative"
        accessibilityLabel={
          isListening ? "Stop recording" : "Start voice input"
        }
        accessibilityRole="button"
      >
        {/* Pulse effect behind the button */}
        {isListening && (
          <Animated.View
            className="absolute w-14 h-14 rounded-full bg-primary-light"
            style={pulseStyle}
          />
        )}

        {/* Main button */}
        <View
          className={`w-14 h-14 rounded-full items-center justify-center ${isListening ? "bg-red-500" : "bg-primary-light"} ${disabled ? "opacity-50" : ""}`}
          style={perfect.boxShadow}
        >
          <FontAwesomeIcon
            icon={isListening ? faStop : faMicrophone}
            size={24}
            color="white"
          />
        </View>
      </TouchableOpacity>

      {/* Listening indicator */}
      {isListening && (
        <Text style={styles.listeningText}>
          {partialResult || "Listening..."}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  listeningText: {
    color: "#F5A083",
    fontSize: 14,
    marginTop: 8,
    fontFamily: "TondoTrial-Regular",
  },
});

export default VoiceInputButton;
