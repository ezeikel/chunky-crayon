import { useState } from "react";
import { View, ScrollView } from "react-native";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import CreateProfileCard from "./CreateProfileCard";

/**
 * Mobile mirror of web's `Chunky Crayon/05 Modals → CreateProfileOpen`
 * story. Mobile's create-profile flow lives inside ProfileSwitcher's
 * bottom sheet; this story renders the extracted CreateProfileCard
 * standalone so we can iterate the picker grid + name input + actions
 * without booting the whole switcher (which needs auth + profile-list
 * queries to render).
 *
 * Stories:
 *   Default     — empty card, default avatar selected
 *   Prefilled   — name + avatar already chosen (verifies live preview)
 *   Submitting  — Create button shows spinner, disabled
 */

const meta: Meta<typeof CreateProfileCard> = {
  title: "Modals/CreateProfileCard",
  component: CreateProfileCard,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof CreateProfileCard>;

const Stage = ({ children }: { children: React.ReactNode }) => (
  <ScrollView
    contentContainerStyle={{
      flexGrow: 1,
      backgroundColor: "#FDFAF5",
      padding: 16,
      justifyContent: "center",
    }}
  >
    <View style={{ alignSelf: "stretch" }}>{children}</View>
  </ScrollView>
);

export const Default: Story = {
  render: () => (
    <Stage>
      <CreateProfileCard
        onCancel={action("cancel")}
        onSubmit={(input) => action("submit")(input)}
      />
    </Stage>
  ),
};

export const Prefilled: Story = {
  render: () => (
    <Stage>
      <CreateProfileCard
        initialName="Eli"
        initialAvatarId="dragon"
        onCancel={action("cancel")}
        onSubmit={(input) => action("submit")(input)}
      />
    </Stage>
  ),
};

export const Submitting: Story = {
  render: () => (
    <Stage>
      <CreateProfileCard
        initialName="Eli"
        initialAvatarId="dragon"
        isSubmitting
        onCancel={action("cancel")}
        onSubmit={(input) => action("submit")(input)}
      />
    </Stage>
  ),
};

/**
 * Verifies the live-preview behaviour: as you type / pick a tile,
 * the avatar + label at the top updates. Used to confirm the
 * controlled-input + ProfileAvatar fallback wiring.
 */
export const LivePreviewSandbox: Story = {
  render: () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [submitted, setSubmitted] = useState<{
      name: string;
      avatarId: string;
    } | null>(null);
    return (
      <Stage>
        <CreateProfileCard
          onCancel={action("cancel")}
          onSubmit={(input) => {
            action("submit")(input);
            setSubmitted(input);
          }}
        />
      </Stage>
    );
  },
};
