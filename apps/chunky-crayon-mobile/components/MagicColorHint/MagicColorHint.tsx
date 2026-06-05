/**
 * MagicColorHint — displays an AI colour suggestion bubble near the
 * tap point when the magic tool is used in "suggest" mode.
 *
 * Animations are Reanimated (worklets / UI thread); never RN's
 * built-in Animated. See feedback_use_reanimated_not_animated.
 *
 * Lifecycle:
 *   - colorCell + position truthy → fade-in + spring-up to 1, auto-
 *     dismiss after 4s.
 *   - colorCell or position null → fade back to 0 and call onDismiss
 *     when the fade settles.
 */

import { useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faLightbulb, faXmark } from "@fortawesome/pro-duotone-svg-icons";
import type { GridColorCell } from "@/types";
import { tapLight, notifySuccess } from "@/utils/haptics";
import { useCanvasStore } from "@/stores/canvasStore";

type MagicColorHintProps = {
  colorCell: GridColorCell | null;
  position: { x: number; y: number } | null;
  onDismiss: () => void;
  onUseColor: (color: string) => void;
};

const MagicColorHint = ({
  colorCell,
  position,
  onDismiss,
  onUseColor,
}: MagicColorHintProps) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  // Both are stable action fns, only called inside handleUseColor — read once,
  // no subscription. This component renders on its props, never on store state,
  // so the old whole-store useCanvasStore() was pure per-stroke re-render
  // overhead (it's always mounted by ImageCanvas).
  const { setColor, setTool } = useCanvasStore.getState();

  // Fade out + scale back, then call onDismiss when the fade settles.
  // Reanimated's withTiming completion callback runs on the UI thread,
  // so jump back to JS via runOnJS before invoking the React prop.
  const handleDismiss = useCallback(() => {
    opacity.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
    scale.value = withTiming(0.8, { duration: 150 });
  }, [onDismiss, opacity, scale]);

  useEffect(() => {
    if (colorCell && position) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 14, stiffness: 180 });

      // Auto-dismiss after 4 seconds. Timer cleanup happens on
      // colorCell/position change or on unmount.
      const timer = setTimeout(() => {
        handleDismiss();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      // Hidden: snap to off-state immediately so the next open
      // animates from the correct start.
      opacity.value = 0;
      scale.value = 0.8;
    }
  }, [colorCell, position, opacity, scale, handleDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handleUseColor = () => {
    if (colorCell) {
      tapLight();
      notifySuccess();
      setColor(colorCell.suggestedColor);
      setTool("brush"); // Switch to brush to paint with the suggested color
      onUseColor(colorCell.suggestedColor);
      handleDismiss();
    }
  };

  if (!colorCell || !position) return null;

  return (
    <Animated.View
      className="absolute z-50"
      style={[
        {
          // Position near the tap point but ensure it stays in view.
          left: Math.min(position.x - 80, 200),
          top: Math.max(position.y - 120, 20),
        },
        animatedStyle,
      ]}
    >
      <View
        className="bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-100"
        style={styles.hintCard}
      >
        {/* Color preview circle */}
        <View className="flex-row items-center mb-3">
          <View
            className="w-12 h-12 rounded-full mr-3 border-2 border-gray-200"
            style={{ backgroundColor: colorCell.suggestedColor }}
          />
          <View className="flex-1">
            <Text style={styles.colorName}>{colorCell.colorName}</Text>
            <Text style={styles.elementText}>{colorCell.element}</Text>
          </View>
        </View>

        {/* Reasoning. Lightbulb duotone in brand orange/yellow (was an
            emoji; memory feedback_fontawesome_over_emojis). */}
        <View style={styles.reasoningRow}>
          <FontAwesomeIcon
            icon={faLightbulb}
            size={16}
            color="#E46444"
            secondaryColor="#FFD93D"
            secondaryOpacity={1}
          />
          <Text style={styles.reasoningText}>{colorCell.reasoning}</Text>
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-2">
          <Pressable
            onPress={handleUseColor}
            className="flex-1 py-2 px-4 rounded-lg bg-primary-light items-center justify-center"
          >
            <Text style={styles.useColorText}>Use Color</Text>
          </Pressable>
          <Pressable
            onPress={handleDismiss}
            className="py-2 px-4 rounded-lg bg-gray-100 items-center justify-center"
          >
            <FontAwesomeIcon icon={faXmark} size={16} color="#4B5563" />
          </Pressable>
        </View>
      </View>

      {/* Little arrow pointing to tap location */}
      <View className="absolute w-4 h-4 bg-white" style={styles.arrow} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  hintCard: {
    minWidth: 180,
  },
  colorName: {
    fontSize: 18,
    fontFamily: "TondoTrial-Bold",
    color: "#1F2937",
  },
  elementText: {
    fontSize: 12,
    fontFamily: "TondoTrial-Regular",
    color: "#6B7280",
  },
  reasoningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
  },
  reasoningText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "TondoTrial-Regular",
    color: "#4B5563",
  },
  useColorText: {
    color: "#FFF",
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
  },
  arrow: {
    bottom: -8,
    left: 80,
    transform: [{ rotate: "45deg" }],
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#F3F4F6",
  },
});

export default MagicColorHint;
