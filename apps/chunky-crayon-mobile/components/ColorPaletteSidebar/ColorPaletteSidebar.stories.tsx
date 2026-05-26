import { useEffect } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import ColorPaletteSidebar from "./ColorPaletteSidebar";
import { useCanvasStore } from "@/stores/canvasStore";

const SeedTool = ({
  tool,
  magicMode,
  children,
}: {
  tool: "brush" | "magic";
  magicMode?: "suggest" | "auto";
  children: React.ReactNode;
}) => {
  const setTool = useCanvasStore((s) => s.setTool);
  const setMagicMode = useCanvasStore((s) => s.setMagicMode);

  useEffect(() => {
    setTool(tool);
    if (magicMode) setMagicMode(magicMode);
    return () => {
      setTool("brush");
    };
  }, [tool, magicMode, setTool, setMagicMode]);

  return <>{children}</>;
};

const meta: Meta<typeof ColorPaletteSidebar> = {
  title: "Coloring Experience/ColorPaletteSidebar",
  component: ColorPaletteSidebar,
  argTypes: {
    width: { control: { type: "range", min: 120, max: 280, step: 8 } },
  },
  args: { width: 200 },
};

export default meta;
type Story = StoryObj<typeof ColorPaletteSidebar>;

export const Active: Story = {
  render: (args) => (
    <View style={{ flex: 1, flexDirection: "row" }}>
      <SeedTool tool="brush">
        <ColorPaletteSidebar {...args} />
      </SeedTool>
    </View>
  ),
};

export const DisabledForMagicTool: Story = {
  render: (args) => (
    <View style={{ flex: 1, flexDirection: "row" }}>
      <SeedTool tool="magic" magicMode="suggest">
        <ColorPaletteSidebar {...args} />
      </SeedTool>
    </View>
  ),
};
