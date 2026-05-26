import { useState } from "react";
import { View, Pressable, Text } from "react-native";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import ParentalGate from "./ParentalGate";

// ParentalGate is a controlled modal; story wraps a trigger so
// reviewers can dismiss + re-open without losing state.
const Trigger = (props: { title?: string; subtitle?: string }) => {
  const [open, setOpen] = useState(true);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: "#E46444",
          paddingVertical: 16,
          paddingHorizontal: 32,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold", fontSize: 18 }}>
          Open parental gate
        </Text>
      </Pressable>
      <ParentalGate
        visible={open}
        onClose={() => {
          action("close")();
          setOpen(false);
        }}
        onSuccess={() => {
          action("success")();
          setOpen(false);
        }}
        title={props.title}
        subtitle={props.subtitle}
      />
    </View>
  );
};

const meta: Meta<typeof ParentalGate> = {
  title: "Modals/ParentalGate",
  component: ParentalGate,
};

export default meta;
type Story = StoryObj<typeof ParentalGate>;

export const Default: Story = {
  render: () => <Trigger />,
};

export const ForPurchase: Story = {
  render: () => (
    <Trigger
      title="Ask a grown-up"
      subtitle="Solve the math problem to add credits."
    />
  ),
};

export const ForDelete: Story = {
  render: () => (
    <Trigger
      title="Ask a grown-up to delete this"
      subtitle="This will remove your masterpiece for good."
    />
  ),
};
