import { useState, useEffect } from "react";
import { View, Pressable, Text } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import Confetti from "./Confetti";

// Confetti fires on `isActive` toggle and clears itself after
// duration. Story wraps a "Replay" button so reviewers can fire
// bursts on demand instead of staring at a never-loops piece of UI.
//
// Mirrors web's storybook entry — same pattern (button → toggle
// active → onComplete resets) so what reviewers see on mobile
// matches what they see on web at /story/chunky-crayon-11-celebrations-actions--confetti.
const Trigger = () => {
  const [active, setActive] = useState(true);

  // Fire immediately on mount so the burst is visible on first
  // navigate.
  useEffect(() => {
    setActive(true);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Pressable
        onPress={() => {
          setActive(false);
          // Tiny gap before flipping back so the false→true edge is
          // distinct (the component re-fires on the edge, not on
          // every render).
          setTimeout(() => setActive(true), 50);
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
      <Confetti isActive={active} onComplete={() => setActive(false)} />
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

export const ManualActive: Story = {
  args: { isActive: true },
};
