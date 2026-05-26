import { useEffect } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import ZoomControls from "./ZoomControls";
import { useCanvasStore } from "@/stores/canvasStore";

// ZoomControls render conditional icons (pan / reset) based on the
// current zoom level in the canvas store, so each story seeds a
// different scale on mount.
const WithScale = ({ scale }: { scale: number }) => {
  const setScale = useCanvasStore((s) => s.setScale);

  useEffect(() => {
    setScale(scale);
    return () => setScale(1);
  }, [scale, setScale]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ZoomControls />
    </View>
  );
};

const meta: Meta<typeof ZoomControls> = {
  title: "Design System/ZoomControls",
  component: ZoomControls,
};

export default meta;
type Story = StoryObj<typeof ZoomControls>;

export const AtRest: Story = {
  render: () => <WithScale scale={1} />,
};

export const ZoomedIn: Story = {
  render: () => <WithScale scale={2.5} />,
};

export const MaxZoom: Story = {
  render: () => <WithScale scale={4} />,
};
