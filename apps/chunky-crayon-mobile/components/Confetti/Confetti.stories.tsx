import { useState, useEffect } from "react";
import { View, Pressable, Text } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import Confetti from "./Confetti";

// Confetti is keyed by `visible` and clears itself after ~2.5s.
// Story wraps a tappable "Trigger" button so kids — sorry, reviewers
// — can fire bursts on demand instead of staring at a never-loops
// piece of UI.
const Trigger = () => {
  const [visible, setVisible] = useState(true);

  // Restart automatically on mount so the story shows the celebration
  // immediately when navigating in.
  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Pressable
        onPress={() => {
          setVisible(false);
          setTimeout(() => setVisible(true), 50);
        }}
        style={{
          backgroundColor: "#E46444",
          paddingVertical: 16,
          paddingHorizontal: 32,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold", fontSize: 18 }}>
          🎉 Replay burst
        </Text>
      </Pressable>
      <Confetti visible={visible} onComplete={() => setVisible(false)} />
    </View>
  );
};

const meta: Meta<typeof Confetti> = {
  title: "Celebrations & Actions/Confetti",
  component: Confetti,
};

export default meta;
type Story = StoryObj<typeof Confetti>;

export const Burst: Story = {
  render: () => <Trigger />,
};

export const ManualVisible: Story = {
  args: { visible: true },
};
