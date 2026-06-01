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
 * Rebuilt on the shared coloring primitives (PaletteVariantPills /
 * ColorSwatchGrid / ToolTile / BrushSizeRow) so it matches web exactly —
 * same variant pills, the full web swatch palette per variant, the 10-tool
 * web set as ToolTiles, the magic tiles (gradient + sparkle badge, Spinner
 * while the region store loads), and brush sizes + undo/redo.
 *
 * ToolbarContent reads everything from `useCanvasStore` (zustand), so
 * each story seeds the store to show a different facet:
 *   - Default       → crayon brush selected, realistic palette
 *   - FillSelected  → fill tool tile selected
 *   - MagicSelected → Auto-color magic tile active (gradient + badge),
 *                     swatch grid dimmed
 *   - MagicNotReady → magic tiles disabled + spinning (region store loading)
 */

const Stage = ({ children }: { children: React.ReactNode }) => (
  <ScrollView contentContainerStyle={styles.stage}>{children}</ScrollView>
);

// No-op handlers so the zoom row + the action tiles (Start Over / Print /
// Save / My Artwork) render in the story — they're gated on having handlers,
// mirroring the production wiring from the coloring screen.
const noop = () => {};
const actionProps = {
  onZoomIn: noop,
  onZoomOut: noop,
  onResetZoom: noop,
  zoom: 1,
  onStartOver: noop,
  onPrint: noop,
  onSave: noop,
  onMyArtwork: noop,
};

const meta: Meta = {
  title: "Coloring Experience/Coloring Toolbar (Bottom Sheet)",
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
        <ToolbarContent {...actionProps} />
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
