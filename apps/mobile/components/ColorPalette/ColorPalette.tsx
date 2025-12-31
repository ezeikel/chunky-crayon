import { Pressable, View, ScrollView } from "react-native";
import { PALETTE_COLORS } from "@/constants/Colors";
import { useCanvasStore } from "@/stores/canvasStore";
import { perfect } from "@/styles";
import { selectionChanged } from "@/utils/haptics";

type ColorPaletteProps = {
  style?: Record<string, unknown>;
};

const ColorPalette = ({ style }: ColorPaletteProps) => {
  const { selectedColor, setColor } = useCanvasStore();

  return (
    <View className="rounded-lg bg-white" style={[style, perfect.boxShadow]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row gap-2 p-3"
      >
        {PALETTE_COLORS.map((color) => (
          <Pressable
            onPress={() => {
              selectionChanged();
              setColor(color);
            }}
            key={color}
          >
            <View
              className={`h-10 w-10 rounded-full ${
                selectedColor === color
                  ? "border-[3px] border-gray-800"
                  : "border border-gray-300"
              }`}
              style={[{ backgroundColor: color }, perfect.boxShadow]}
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

export default ColorPalette;
