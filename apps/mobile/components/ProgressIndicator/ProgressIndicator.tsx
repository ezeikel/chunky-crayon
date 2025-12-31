import { View, Text, StyleSheet } from "react-native";
import { useCanvasStore } from "@/stores/canvasStore";

type ProgressIndicatorProps = {
  style?: Record<string, unknown>;
};

/**
 * Compact progress indicator for mobile coloring canvas.
 * Shows just the percentage to save space on mobile.
 */
const ProgressIndicator = ({ style }: ProgressIndicatorProps) => {
  const { progress } = useCanvasStore();

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.progressText}>{Math.round(progress)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E46444",
    fontFamily: "TondoTrial-Bold",
  },
});

export default ProgressIndicator;
