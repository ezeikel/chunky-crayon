import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import ColoAvatar from "@/components/ColoAvatar";
import type { ColoStage, EvolutionResult } from "@/lib/colo";
import { COLO_STAGES, getAccessory } from "@/lib/colo";

type ColoEvolutionCelebrationProps = {
  /** Evolution result from server action */
  evolutionResult: EvolutionResult | null;
  /** Called when celebration is dismissed */
  onDismiss: () => void;
  /** Auto-dismiss after delay (ms) - 0 to disable */
  autoDismissDelay?: number;
};

// Kid-friendly celebration messages for each stage
const EVOLUTION_MESSAGES: Record<ColoStage, string[]> = {
  1: ["Welcome, little artist!", "Your coloring journey begins!"],
  2: ["Look! Colo is growing!", "You're doing amazing!"],
  3: ["Wow! Colo is getting bigger!", "Keep up the great work!"],
  4: ["Colo is so happy!", "You're a coloring superstar!"],
  5: ["Incredible! Artist Colo!", "You're a true artist now!"],
  6: ["AMAZING! Master Colo!", "You've mastered coloring!"],
};

// Accessory emojis for display
const ACCESSORY_EMOJIS: Record<string, string> = {
  "astronaut-helmet": "🪖",
  crown: "👑",
  "rainbow-scarf": "🧣",
  "party-hat": "🎉",
  "artist-beret": "🎨",
  "wizard-hat": "🧙",
  "dino-spikes": "🦖",
  "flower-crown": "🌸",
  "superhero-cape": "🦸",
  "sparkle-glasses": "✨",
};

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const ColoEvolutionCelebration = ({
  evolutionResult,
  onDismiss,
  autoDismissDelay = 0,
}: ColoEvolutionCelebrationProps) => {
  const [currentAccessoryIndex, setCurrentAccessoryIndex] = useState(0);

  const isVisible =
    evolutionResult !== null &&
    (evolutionResult.evolved || evolutionResult.newAccessories.length > 0);

  const hasEvolved = evolutionResult?.evolved ?? false;
  const newStage = evolutionResult?.newStage ?? 1;
  const previousStage = evolutionResult?.previousStage ?? 1;
  const newAccessories = evolutionResult?.newAccessories ?? [];
  const stageInfo = COLO_STAGES[newStage];

  // Animation values
  const sparkleScale = useSharedValue(0);
  const sparkleOpacity = useSharedValue(0);

  // Haptic feedback when celebration appears
  useEffect(() => {
    if (isVisible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Sparkle animation
      sparkleScale.value = withSequence(
        withDelay(700, withSpring(1.2, { damping: 5 })),
        withTiming(0.8, { duration: 300 }),
        withSpring(1, { damping: 10 }),
      );
      sparkleOpacity.value = withSequence(
        withDelay(700, withTiming(1, { duration: 300 })),
        withDelay(1500, withTiming(0, { duration: 500 })),
      );
    }
  }, [isVisible, sparkleScale, sparkleOpacity]);

  // Auto-dismiss after delay
  useEffect(() => {
    if (isVisible && autoDismissDelay > 0) {
      const timer = setTimeout(onDismiss, autoDismissDelay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoDismissDelay, onDismiss]);

  // Cycle through new accessories
  useEffect(() => {
    if (newAccessories.length > 1) {
      const interval = setInterval(() => {
        setCurrentAccessoryIndex((prev) => (prev + 1) % newAccessories.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [newAccessories.length]);

  // Get random celebration message
  const getMessage = useCallback(() => {
    const messages = EVOLUTION_MESSAGES[newStage];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [newStage]);

  // Sparkle animated style
  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkleScale.value }],
    opacity: sparkleOpacity.value,
  }));

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              entering={SlideInDown.springify().damping(15)}
              exiting={SlideOutDown}
              className="bg-white rounded-3xl p-8 w-full max-w-sm items-center shadow-2xl"
            >
              {/* Evolution celebration */}
              {hasEvolved && (
                <>
                  {/* Stage transition animation */}
                  <View className="relative mb-6 items-center">
                    {/* Colo avatar */}
                    <Animated.View entering={FadeIn.delay(800).duration(500)}>
                      <ColoAvatar stage={newStage} size="xl" />
                    </Animated.View>

                    {/* Sparkle effects */}
                    <Animated.View
                      className="absolute inset-0 items-center justify-center"
                      style={sparkleAnimatedStyle}
                    >
                      <Text className="absolute -top-4 left-4 text-3xl">
                        ✨
                      </Text>
                      <Text className="absolute -top-2 right-4 text-3xl">
                        🌟
                      </Text>
                      <Text className="absolute -bottom-4 left-8 text-3xl">
                        ⭐
                      </Text>
                      <Text className="absolute -bottom-2 right-8 text-3xl">
                        ✨
                      </Text>
                    </Animated.View>
                  </View>

                  {/* Celebration text */}
                  <Animated.View
                    entering={FadeIn.delay(1200).duration(400)}
                    className="items-center"
                  >
                    <Text style={styles.evolvedTitle}>Colo Evolved!</Text>
                    <Text style={styles.stageName}>{stageInfo.name}</Text>
                    <Text style={styles.message}>{getMessage()}</Text>
                  </Animated.View>
                </>
              )}

              {/* Accessory unlocks (after evolution or standalone) */}
              {newAccessories.length > 0 && (
                <Animated.View
                  entering={FadeIn.delay(hasEvolved ? 2000 : 500).duration(400)}
                  className={`items-center w-full ${hasEvolved ? "pt-4 border-t border-gray-100" : ""}`}
                >
                  <Text style={styles.accessoryTitle}>
                    {newAccessories.length === 1
                      ? "New Accessory Unlocked!"
                      : "New Accessories Unlocked!"}
                  </Text>

                  {/* Accessory display */}
                  {newAccessories.map((accessoryId, index) => {
                    if (
                      index !== currentAccessoryIndex &&
                      newAccessories.length > 1
                    )
                      return null;
                    const accessory = getAccessory(accessoryId);
                    if (!accessory) return null;

                    return (
                      <View key={accessoryId} className="items-center">
                        {/* Accessory icon */}
                        <View className="w-16 h-16 rounded-full bg-[#E46444] items-center justify-center mb-2">
                          <Text className="text-2xl">
                            {ACCESSORY_EMOJIS[accessoryId] || "🎁"}
                          </Text>
                        </View>
                        <Text style={styles.accessoryName}>
                          {accessory.name}
                        </Text>
                        <Text style={styles.accessoryDescription}>
                          {accessory.description}
                        </Text>
                      </View>
                    );
                  })}

                  {/* Pagination dots for multiple accessories */}
                  {newAccessories.length > 1 && (
                    <View className="flex-row gap-2 mt-4">
                      {newAccessories.map((_, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => setCurrentAccessoryIndex(index)}
                          className={`w-2 h-2 rounded-full ${index === currentAccessoryIndex ? "bg-[#E46444]" : "bg-gray-300"}`}
                        />
                      ))}
                    </View>
                  )}
                </Animated.View>
              )}

              {/* Dismiss button */}
              <AnimatedTouchableOpacity
                entering={FadeIn.delay(hasEvolved ? 2500 : 1000).duration(400)}
                onPress={onDismiss}
                className="mt-6 px-8 py-3 bg-[#E46444] rounded-full shadow-lg"
              >
                <Text style={styles.buttonText}>Awesome! 🎉</Text>
              </AnimatedTouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  evolvedTitle: {
    fontSize: 24,
    color: "#E46444",
    marginBottom: 8,
    textAlign: "center",
    fontFamily: "TondoTrial-Bold",
  },
  stageName: {
    fontSize: 18,
    color: "#4B4B4B",
    marginBottom: 4,
    fontFamily: "TondoTrial-Bold",
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    fontFamily: "RooneySans-Regular",
  },
  accessoryTitle: {
    fontSize: 18,
    color: "#4B4B4B",
    marginBottom: 12,
    fontFamily: "TondoTrial-Bold",
  },
  accessoryName: {
    color: "#4B4B4B",
    fontFamily: "TondoTrial-Bold",
  },
  accessoryDescription: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    fontFamily: "RooneySans-Regular",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "TondoTrial-Bold",
  },
});

export default ColoEvolutionCelebration;
