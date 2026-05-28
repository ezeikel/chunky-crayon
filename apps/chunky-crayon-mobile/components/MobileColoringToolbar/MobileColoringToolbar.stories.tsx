import { useEffect } from "react";
import { ScrollView, StyleSheet } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import ToolbarContent from "./ToolbarContent";
import { useCanvasStore } from "@/stores/canvasStore";

/**
 * Storybook surface for the kids coloring toolbar body — the tool tray
 * that lives inside the bottom sheet on the coloring canvas.
 *
 * We render `ToolbarContent` (the sheet's scrollable body) directly,
 * NOT the full MobileColoringToolbar: a gorhom BottomSheet docks to the
 * screen bottom, which renders off-canvas in Storybook's split layout.
 * The body is the reviewable part and renders identically here.
 *
 * Mirrors web's coloring-ui ToolSelector: white cream-bordered rounded
 * tool tiles (orange-fill + glow when active), duotone icons, the magic
 * tool's purple→pink gradient + sparkles badge, and the orange-halo
 * selected swatch. Kids tool set only (crayon / marker / rainbow / fill
 * / eraser / sticker / auto).
 *
 * ToolbarContent reads everything from `useCanvasStore` (zustand), so
 * each story seeds the store to show a different facet:
 *   - Default       → brush (crayon) selected, brush-size row visible
 *   - FillSelected  → fill tool selected, fill-type row visible
 *   - MagicSelected → Auto-color magic tool active (gradient + badge)
 */

const Stage = ({ children }: { children: React.ReactNode }) => (
  <ScrollView contentContainerStyle={styles.stage}>{children}</ScrollView>
);

const meta: Meta = {
  title: "Coloring Experience/Coloring Toolbar",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    useEffect(() => {
      useCanvasStore.setState({
        selectedTool: "brush",
        brushType: "crayon",
        selectedColor: "#E46444",
        magicReady: true,
      });
    }, []);
    return (
      <Stage>
        <ToolbarContent />
      </Stage>
    );
  },
};

export const FillSelected: Story = {
  render: () => {
    useEffect(() => {
      useCanvasStore.setState({
        selectedTool: "fill",
        fillType: "solid",
        selectedColor: "#5A9EE2",
        magicReady: true,
      });
    }, []);
    return (
      <Stage>
        <ToolbarContent />
      </Stage>
    );
  },
};

export const MagicSelected: Story = {
  render: () => {
    useEffect(() => {
      useCanvasStore.setState({
        selectedTool: "magic",
        magicMode: "auto",
        selectedColor: "#8CAF5A",
        magicReady: true,
      });
    }, []);
    return (
      <Stage>
        <ToolbarContent />
      </Stage>
    );
  },
};

// Region store not yet ready → the Auto-Color (magic) tile is disabled
// and shows a spinner in place of its icon, ignoring taps.
export const MagicNotReady: Story = {
  render: () => {
    useEffect(() => {
      useCanvasStore.setState({
        selectedTool: "brush",
        brushType: "crayon",
        selectedColor: "#E46444",
        magicReady: false,
      });
      return () => useCanvasStore.setState({ magicReady: true });
    }, []);
    return (
      <Stage>
        <ToolbarContent />
      </Stage>
    );
  },
};

const styles = StyleSheet.create({
  stage: {
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
});
