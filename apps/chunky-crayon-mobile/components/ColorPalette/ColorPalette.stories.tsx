import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import ColorPalette from "./ColorPalette";

const meta: Meta<typeof ColorPalette> = {
  title: "Design System/ColorPalette",
  component: ColorPalette,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ColorPalette>;

export const Default: Story = {};
