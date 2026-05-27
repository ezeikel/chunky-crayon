import { View, Text } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import ProfileAvatar from "./ProfileAvatar";
import { AVATARS } from "@/lib/avatars";

const meta: Meta<typeof ProfileAvatar> = {
  title: "Profiles/ProfileAvatar",
  component: ProfileAvatar,
  argTypes: {
    avatarId: {
      control: { type: "select" },
      options: AVATARS.map((a) => a.id),
    },
    size: {
      control: { type: "select" },
      options: ["xs", "sm", "md", "lg", "xl"],
    },
    showBorder: { control: "boolean" },
    name: { control: "text" },
  },
  args: {
    avatarId: "ice-cream",
    size: "lg",
    showBorder: false,
    name: "Ezra",
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
type Story = StoryObj<typeof ProfileAvatar>;

export const Default: Story = {};

export const WithBorder: Story = {
  args: { showBorder: true },
};

export const Dragon: Story = { args: { avatarId: "dragon", size: "xl" } };
export const Unicorn: Story = { args: { avatarId: "unicorn", size: "xl" } };
export const Mermaid: Story = { args: { avatarId: "mermaid", size: "xl" } };
export const Astronaut: Story = { args: { avatarId: "astronaut", size: "xl" } };
export const Wizard: Story = { args: { avatarId: "wizard", size: "xl" } };

export const AllAvatarsGrid: Story = {
  render: () => (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 16,
        padding: 16,
      }}
    >
      {AVATARS.map((a) => (
        <View key={a.id} style={{ alignItems: "center", width: 96 }}>
          <ProfileAvatar avatarId={a.id} size="md" />
          <Text
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "#3D2C1E",
              textAlign: "center",
            }}
          >
            {a.name}
          </Text>
        </View>
      ))}
    </View>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      <ProfileAvatar avatarId="dragon" size="xs" />
      <ProfileAvatar avatarId="dragon" size="sm" />
      <ProfileAvatar avatarId="dragon" size="md" />
      <ProfileAvatar avatarId="dragon" size="lg" />
      <ProfileAvatar avatarId="dragon" size="xl" />
    </View>
  ),
};

export const InitialsFallback: Story = {
  args: { avatarId: "unknown-id-xyz", name: "Ezra Pemberton" },
};

export const LegacyId_CrayonOrange: Story = {
  args: { avatarId: "crayon-orange" },
  parameters: {
    docs: { description: { story: "Legacy id resolves to ice-cream." } },
  },
};

export const LegacyId_Bunny: Story = {
  args: { avatarId: "bunny" },
  parameters: {
    docs: { description: { story: "Old bunny id resolves to ice-cream." } },
  },
};
