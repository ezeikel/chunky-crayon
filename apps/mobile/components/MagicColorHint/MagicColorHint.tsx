/**
 * MagicColorHint - Displays AI color suggestions to the user
 * Shows when the magic tool is used in "suggest" mode
 */

import { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const { setColor, setTool } = useCanvasStore();

  useEffect(() => {
    if (colorCell && position) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      // Reset animations when hidden
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [colorCell, position]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

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
      style={{
        // Position the hint near the tap point but ensure it stays in view
        left: Math.min(position.x - 80, 200),
        top: Math.max(position.y - 120, 20),
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
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

        {/* Reasoning */}
        <Text style={styles.reasoningText}>💡 {colorCell.reasoning}</Text>

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
            <Text style={styles.dismissText}>✕</Text>
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
  reasoningText: {
    fontSize: 14,
    fontFamily: "TondoTrial-Regular",
    color: "#4B5563",
    marginBottom: 12,
  },
  useColorText: {
    color: "#FFF",
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
  },
  dismissText: {
    color: "#4B5563",
    fontFamily: "TondoTrial-Regular",
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
