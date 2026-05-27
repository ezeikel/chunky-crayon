import { useState } from "react";
import { View, Text } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import AvatarPicker from "./AvatarPicker";
import ProfileAvatar from "@/components/ProfileAvatar";
import { DEFAULT_AVATAR_ID } from "@/lib/avatars";

// AvatarPicker is fully controlled — the parent owns selectedAvatarId.
// Storybook wraps it in a tiny controlled host so reviewers can tap
// through tiles and see the selection ring move.
const ControlledPicker = ({ initial }: { initial?: string }) => {
  const [selected, setSelected] = useState(initial ?? DEFAULT_AVATAR_ID);
  return (
    <View style={{ padding: 16 }}>
      <AvatarPicker selectedAvatarId={selected} onSelect={setSelected} />
    </View>
  );
};

const meta: Meta<typeof AvatarPicker> = {
  title: "Profiles/AvatarPicker",
  component: AvatarPicker,
};

export default meta;
type Story = StoryObj<typeof AvatarPicker>;

export const Default: Story = {
  render: () => <ControlledPicker />,
};

export const StartingOnDragon: Story = {
  render: () => <ControlledPicker initial="dragon" />,
};

// Mirror of the create-profile card in ProfileSwitcher — gives a
// visual reference for the picker in its real container (preview at
// top + picker + name input + actions). Lets us iterate the card
// layout without booting the bottom-sheet flow.
const CreateCardPreview = () => {
  const [selected, setSelected] = useState<string>("dragon");
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 16,
        marginTop: 8,
        borderWidth: 2,
        borderColor: "#E46444",
        gap: 16,
      }}
    >
      <View style={{ alignItems: "center", gap: 8 }}>
        <ProfileAvatar avatarId={selected} name="Maya" size="xl" showBorder />
        <Text
          style={{
            fontFamily: "TondoTrial-Bold",
            fontSize: 16,
            color: "#3D2C1E",
          }}
        >
          Pick your character
        </Text>
      </View>

      <AvatarPicker selectedAvatarId={selected} onSelect={setSelected} />

      <View
        style={{
          backgroundColor: "#FAF7F1",
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: "#E8DFD6",
        }}
      >
        <Text
          style={{
            fontFamily: "TondoTrial-Regular",
            fontSize: 18,
            color: "#374151",
          }}
        >
          Maya
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: "#F3EBE0",
          }}
        >
          <Text
            style={{
              fontFamily: "TondoTrial-Bold",
              fontSize: 16,
              color: "#7A6F66",
            }}
          >
            Cancel
          </Text>
        </View>
        <View
          style={{
            flex: 2,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: "#E46444",
          }}
        >
          <Text
            style={{
              fontFamily: "TondoTrial-Bold",
              fontSize: 16,
              color: "#FFFFFF",
            }}
          >
            Create
          </Text>
        </View>
      </View>
    </View>
  );
};

export const InCreateProfileCard: Story = {
  render: () => (
    <View style={{ padding: 16 }}>
      <CreateCardPreview />
    </View>
  ),
};
