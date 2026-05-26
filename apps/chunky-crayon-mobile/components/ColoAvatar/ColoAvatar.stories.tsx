import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import ColoAvatar from "./ColoAvatar";

const meta: Meta<typeof ColoAvatar> = {
  title: "Mascot & Stickers/ColoAvatar",
  component: ColoAvatar,
  argTypes: {
    stage: { control: { type: "select" }, options: [1, 2, 3, 4, 5, 6] },
    size: {
      control: { type: "select" },
      options: ["xs", "sm", "md", "lg", "xl"],
    },
    showProgress: { control: "boolean" },
    enableTapReactions: { control: "boolean" },
  },
  args: {
    stage: 1,
    size: "lg",
    showProgress: false,
    enableTapReactions: true,
  },
  decorators: [
    (Story) => (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ColoAvatar>;

export const Stage1Hatchling: Story = { args: { stage: 1 } };
export const Stage2Sprout: Story = { args: { stage: 2 } };
export const Stage3Curious: Story = { args: { stage: 3 } };
export const Stage4Explorer: Story = { args: { stage: 4 } };
export const Stage5Artist: Story = { args: { stage: 5 } };
export const Stage6Master: Story = { args: { stage: 6 } };

export const AllSizes: Story = {
  render: () => (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
        flexWrap: "wrap",
      }}
    >
      <ColoAvatar stage={3} size="xs" />
      <ColoAvatar stage={3} size="sm" />
      <ColoAvatar stage={3} size="md" />
      <ColoAvatar stage={3} size="lg" />
      <ColoAvatar stage={3} size="xl" />
    </View>
  ),
};

export const WithProgress: Story = {
  args: { stage: 3, showProgress: true, size: "xl" },
};
