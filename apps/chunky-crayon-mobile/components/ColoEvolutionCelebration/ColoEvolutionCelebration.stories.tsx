import { useState } from "react";
import { View, Pressable, Text } from "react-native";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import ColoEvolutionCelebration from "./ColoEvolutionCelebration";
import type { EvolutionResult } from "@/lib/colo";

// Celebration is a modal driven by `evolutionResult`. Story wraps a
// trigger so reviewers can replay each evolution + dismiss.
const Trigger = ({ result }: { result: EvolutionResult }) => {
  const [value, setValue] = useState<EvolutionResult | null>(result);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Pressable
        onPress={() => setValue(result)}
        style={{
          backgroundColor: "#E46444",
          paddingVertical: 16,
          paddingHorizontal: 32,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold", fontSize: 18 }}>
          🎉 Replay celebration
        </Text>
      </Pressable>
      <ColoEvolutionCelebration
        evolutionResult={value}
        onDismiss={() => {
          action("dismiss")();
          setValue(null);
        }}
      />
    </View>
  );
};

const meta: Meta<typeof ColoEvolutionCelebration> = {
  title: "Mascot & Stickers/ColoEvolutionCelebration",
  component: ColoEvolutionCelebration,
};

export default meta;
type Story = StoryObj<typeof ColoEvolutionCelebration>;

export const FirstEvolution: Story = {
  render: () => (
    <Trigger
      result={{
        evolved: true,
        previousStage: 1,
        newStage: 2,
        newAccessories: [],
      }}
    />
  ),
};

export const MidJourney: Story = {
  render: () => (
    <Trigger
      result={{
        evolved: true,
        previousStage: 3,
        newStage: 4,
        newAccessories: ["rainbow-scarf"],
      }}
    />
  ),
};

export const FinalMaster: Story = {
  render: () => (
    <Trigger
      result={{
        evolved: true,
        previousStage: 5,
        newStage: 6,
        newAccessories: ["crown"],
      }}
    />
  ),
};
