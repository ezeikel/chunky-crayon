import { useState } from "react";
import { View, Pressable, Text, useWindowDimensions } from "react-native";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import MagicColorHint from "./MagicColorHint";
import type { GridColorCell } from "@/types";

const makeCell = (overrides: Partial<GridColorCell>): GridColorCell => ({
  row: 1,
  col: 3,
  element: "sky",
  suggestedColor: "#7EC8E3",
  colorName: "Sky Blue",
  reasoning: "Bright open sky above the scene",
  ...overrides,
});

const Trigger = ({ cell, label }: { cell: GridColorCell; label: string }) => {
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(true);

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          position: "absolute",
          top: 24,
          left: 16,
          backgroundColor: "#E46444",
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 999,
          zIndex: 10,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Show hint ({label})
        </Text>
      </Pressable>
      <MagicColorHint
        colorCell={open ? cell : null}
        position={open ? { x: width / 2, y: height / 2 } : null}
        onDismiss={() => {
          action("dismiss")();
          setOpen(false);
        }}
        onUseColor={(c) => {
          action("use-color")(c);
          setOpen(false);
        }}
      />
    </View>
  );
};

const meta: Meta<typeof MagicColorHint> = {
  title: "Coloring Experience/MagicColorHint",
  component: MagicColorHint,
};

export default meta;
type Story = StoryObj<typeof MagicColorHint>;

export const SkyBlue: Story = {
  render: () => <Trigger cell={makeCell({})} label="sky" />,
};

export const Sunset: Story = {
  render: () => (
    <Trigger
      cell={makeCell({
        element: "sunset clouds",
        suggestedColor: "#FFAC4D",
        colorName: "Sunset Orange",
        reasoning: "Warm clouds catching the last light",
      })}
      label="sunset"
    />
  ),
};

export const Grass: Story = {
  render: () => (
    <Trigger
      cell={makeCell({
        row: 5,
        col: 2,
        element: "grass",
        suggestedColor: "#3B8132",
        colorName: "Forest Green",
        reasoning: "Tall grass in the meadow",
      })}
      label="grass"
    />
  ),
};
