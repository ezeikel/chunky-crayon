import { Pressable, View } from "react-native";
import tw from "twrnc";
import { PALETTE_COLORS } from "@/constants/Colors";
import { useColoringContext } from "@/contexts/coloring";
import { perfect } from "@/styles";

type ColorPaletteProps = {
  style?: Record<string, unknown>;
};

const ColorPalette = ({ style }: ColorPaletteProps) => {
  const { selectedColor, setSelectedColor } = useColoringContext();

  return (
    <View
      style={tw.style(
        "flex-row flex-wrap gap-2 p-4 rounded-lg bg-white justify-center items-center",
        {
          ...style,
          ...perfect.boxShadow,
        },
      )}
    >
      {PALETTE_COLORS.map((color) => (
        <Pressable onPress={() => setSelectedColor(color)} key={color}>
          <View
            style={tw.style("h-8 w-8 rounded-full", {
              "border-2 border-black": selectedColor === color,
              backgroundColor: color,
              ...perfect.boxShadow,
            })}
          />
        </Pressable>
      ))}
    </View>
  );
};

export default ColorPalette;
