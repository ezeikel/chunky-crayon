import { View } from "react-native";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import AppHeader from "./AppHeader";

const meta: Meta<typeof AppHeader> = {
  title: "Navigation/AppHeader",
  component: AppHeader,
  argTypes: {
    credits: { control: { type: "number" } },
    profileName: { control: "text" },
    avatarId: {
      control: { type: "select" },
      options: [
        "dragon",
        "unicorn",
        "mermaid",
        "astronaut",
        "wizard",
        "superhero",
        "alien",
        "rocket",
        "ice-cream",
      ],
    },
  },
  args: {
    credits: 12,
    profileName: "Ezra",
    avatarId: "dragon",
    onCreditsPress: action("credits-press"),
    onColoPress: action("colo-press"),
    onProfilePress: action("profile-press"),
    onSettingsPress: action("settings-press"),
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
    profileName: "Artist",
    avatarId: "ice-cream",
  },
};

export const PowerUser: Story = {
  args: {
    credits: 999,
    profileName: "Maya",
    avatarId: "unicorn",
  },
};
