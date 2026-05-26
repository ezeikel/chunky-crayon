import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import ColorPaletteBar from "./ColorPaletteBar";

const meta: Meta<typeof ColorPaletteBar> = {
  title: "Coloring Experience/ColorPaletteBar",
  component: ColorPaletteBar,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ColorPaletteBar>;

export const LandscapeFooter: Story = {};
