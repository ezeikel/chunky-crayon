import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import MuteToggle from "./MuteToggle";

const meta: Meta<typeof MuteToggle> = {
  title: "Coloring Experience/MuteToggle",
  component: MuteToggle,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MuteToggle>;

export const Default: Story = {};
