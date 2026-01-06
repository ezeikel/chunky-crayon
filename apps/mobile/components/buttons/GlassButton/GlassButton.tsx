import { Host, Button, Label } from "@expo/ui/swift-ui";
import {
  buttonStyle,
  frame,
  foregroundStyle,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { isLiquidGlassAvailable } from "expo-glass-effect";

type GlassButtonProps = {
  title: string;
  onPress: () => void;
  color?: string;
  width?: number;
};

export default function GlassButton({
  title,
  onPress,
  color = "blue",
  width = 320,
}: GlassButtonProps) {
  return (
    <Host matchContents>
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle(
            isLiquidGlassAvailable() ? "glassProminent" : "borderedProminent",
          ),
          tint(color),
        ]}
      >
        <Label
          title={title}
          modifiers={[frame({ width }), foregroundStyle("white")]}
        />
      </Button>
    </Host>
  );
}
