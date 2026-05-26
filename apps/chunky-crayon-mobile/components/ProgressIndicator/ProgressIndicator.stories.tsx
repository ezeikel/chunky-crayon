import { useEffect } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import ProgressIndicator from "./ProgressIndicator";
import { useCanvasStore } from "@/stores/canvasStore";

// ProgressIndicator reads the live canvas store. To preview values
// in isolation we seed `progress` on mount via a tiny decorator.
const WithProgress = ({ value }: { value: number }) => {
  const setProgress = useCanvasStore((s) => s.setProgress);

  useEffect(() => {
    setProgress(value);
    return () => setProgress(0);
  }, [setProgress, value]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ProgressIndicator />
    </View>
  );
};

const meta: Meta<typeof ProgressIndicator> = {
  title: "Design System/ProgressIndicator",
  component: ProgressIndicator,
};

export default meta;
type Story = StoryObj<typeof ProgressIndicator>;

export const Empty: Story = {
  render: () => <WithProgress value={0} />,
};

export const Quarter: Story = {
  render: () => <WithProgress value={25} />,
};

export const Half: Story = {
  render: () => <WithProgress value={50} />,
};

export const ThreeQuarters: Story = {
  render: () => <WithProgress value={75} />,
};

export const Complete: Story = {
  render: () => <WithProgress value={100} />,
};
