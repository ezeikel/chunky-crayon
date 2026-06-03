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
import { Image } from "expo-image";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faSparkles, faStar } from "@fortawesome/pro-duotone-svg-icons";
import ColoAvatar from "@/components/ColoAvatar";
import type { ColoStage, EvolutionResult } from "@/lib/colo";
import { COLO_STAGES, getAccessory } from "@/lib/colo";
import { COLO_ACCESSORY_IMAGES } from "@/lib/colo/colo-images";
import { COLORS } from "@/lib/design";

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

                    {/* Sparkle burst — FontAwesome duotone to match web's
                        ColoEvolutionCelebration (faSparkles/faStar in
                        yellow/orange/pink), not emoji glyphs. */}
                    <Animated.View
                      className="absolute inset-0 items-center justify-center"
                      style={sparkleAnimatedStyle}
                    >
                      <FontAwesomeIcon
                        icon={faSparkles}
                        size={28}
                        color={COLORS.yellow}
                        style={styles.sparkleTopLeft}
                      />
                      <FontAwesomeIcon
                        icon={faStar}
                        size={28}
                        color={COLORS.crayonOrange}
                        style={styles.sparkleTopRight}
                      />
                      <FontAwesomeIcon
                        icon={faStar}
                        size={28}
                        color={COLORS.yellow}
                        style={styles.sparkleBottomLeft}
                      />
                      <FontAwesomeIcon
                        icon={faSparkles}
                        size={28}
                        color={COLORS.coral}
                        style={styles.sparkleBottomRight}
                      />
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
                        {/* Accessory icon — bundled PNG illustration (web
                            parity: web renders accessory.imagePath via
                            next/image), not an emoji. */}
                        <View className="w-16 h-16 rounded-full bg-[#E46444] items-center justify-center mb-2 overflow-hidden">
                          <Image
                            source={COLO_ACCESSORY_IMAGES[accessoryId]}
                            style={styles.accessoryImage}
                            contentFit="contain"
                            transition={200}
                          />
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
  // Accessory PNG inside the 64px (w-16/h-16) circle. p-1.5 padding mirrors
  // web's object-contain p-1.5; the parent View clips with overflow-hidden.
  accessoryImage: {
    width: "100%",
    height: "100%",
    padding: 6,
  },
  // Sparkle-burst positions around the avatar (mirror web's absolute
  // -top-4 left-1/4 etc.). Absolute within the inset-0 sparkle layer.
  sparkleTopLeft: {
    position: "absolute",
    top: -16,
    left: "25%",
  },
  sparkleTopRight: {
    position: "absolute",
    top: -8,
    right: "25%",
  },
  sparkleBottomLeft: {
    position: "absolute",
    bottom: -16,
    left: "33%",
  },
  sparkleBottomRight: {
    position: "absolute",
    bottom: -8,
    right: "33%",
  },
});

export default ColoEvolutionCelebration;
