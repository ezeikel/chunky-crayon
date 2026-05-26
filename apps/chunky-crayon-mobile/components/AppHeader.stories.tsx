import { View } from "react-native";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import AppHeader from "./AppHeader";

const meta: Meta<typeof AppHeader> = {
  title: "Navigation/AppHeader",
  component: AppHeader,
  argTypes: {
    credits: { control: { type: "number" } },
    challengeProgress: { control: { type: "range", min: 0, max: 100 } },
    stickerCount: { control: { type: "number" } },
    profileName: { control: "text" },
    coloStage: {
      control: { type: "select" },
      options: [1, 2, 3, 4, 5, 6],
    },
  },
  args: {
    credits: 12,
    challengeProgress: 30,
    stickerCount: 8,
    profileName: "Ezra",
    coloStage: 2,
    onCreditsPress: action("credits-press"),
    onChallengePress: action("challenge-press"),
    onStickersPress: action("stickers-press"),
    onProfilePress: action("profile-press"),
  },
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: "#FFF6EC" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AppHeader>;

export const Default: Story = {};

export const NewArtist: Story = {
  args: {
    credits: 0,
    challengeProgress: 0,
    stickerCount: 0,
    profileName: "Artist",
    coloStage: 1,
  },
};

export const PowerUser: Story = {
  args: {
    credits: 999,
    challengeProgress: 95,
    stickerCount: 42,
    profileName: "Maya",
    coloStage: 6,
  },
};
