import { View, Pressable, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCircle } from "@fortawesome/pro-solid-svg-icons";
import { useCanvasStore } from "@/stores/canvasStore";
import { BRUSH_SIZES } from "@/constants/Colors";
import { selectionChanged } from "@/utils/haptics";

type BrushSizeSelectorProps = {
  style?: Record<string, unknown>;
};

const SIZES = Object.entries(BRUSH_SIZES) as [
  keyof typeof BRUSH_SIZES,
  number,
][];

const BrushSizeSelector = ({ style }: BrushSizeSelectorProps) => {
  const { brushSize, setBrushSize } = useCanvasStore();

  return (
    <View style={[styles.container, style]}>
      {SIZES.map(([name, size]) => {
        const isActive = brushSize === size;
        // Scale icon size based on brush size (min 12, max 28)
        const iconSize = Math.max(12, Math.min(28, size * 0.8));

        return (
          <Pressable
            key={name}
            onPress={() => {
              selectionChanged();
              setBrushSize(size);
            }}
            style={[styles.button, isActive && styles.buttonActive]}
          >
            <FontAwesomeIcon
              icon={faCircle}
              size={iconSize}
              color={isActive ? "#FFFFFF" : "#4B5563"}
            />
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  buttonActive: {
    backgroundColor: "#E46444",
  },
});

export default BrushSizeSelector;
