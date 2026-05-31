import { View, Text, StyleSheet, ScrollView } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import ColoringLayout from "./ColoringLayout";
import { COLORS } from "@/lib/design";
import { getColoringTier } from "@/utils/deviceUtils";

/**
 * The responsive coloring layout at several widths, so the tier behaviour
 * (three-column ↔ toolbar-on-top) can be reviewed side by side WITHOUT
 * running the real app and tapping into a coloring page. This is the
 * source-of-truth visual for the layout work — iterate here, compare to
 * web, then it ships unchanged because the screen renders the same
 * ColoringLayout component.
 *
 * Each frame is a fixed-size window emulating a device width; the canvas is
 * a placeholder so we can see exactly how much room the rails leave it.
 */

const PlaceholderCanvas = ({
  area,
}: {
  area: { width: number; height: number };
}) => (
  <View style={styles.canvas}>
    <Text style={styles.canvasLabel}>
      canvas{"\n"}
      {Math.round(area.width)}×{Math.round(area.height)}
    </Text>
  </View>
);

const Frame = ({ width, height }: { width: number; height: number }) => {
  const tier = getColoringTier(width);
  return (
    <View style={styles.frameWrap}>
      <Text style={styles.frameTitle}>
        {width}×{height} → {tier}
      </Text>
      <View style={[styles.frame, { width, height }]}>
        <ColoringLayout
          width={width}
          height={height}
          zoom={1}
          renderCanvas={(area) => <PlaceholderCanvas area={area} />}
        />
      </View>
    </View>
  );
};

const meta: Meta = {
  title: "Coloring Experience/Coloring Layout (Responsive)",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

// All tiers stacked so the fit-based switch is visible at a glance.
export const AllWidths: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.stage} horizontal>
      <View style={styles.col}>
        <Frame width={390} height={680} />
        <Frame width={744} height={560} />
      </View>
      <Frame width={834} height={1100} />
      <Frame width={1032} height={1300} />
      <Frame width={1366} height={900} />
    </ScrollView>
  ),
};

// iPad portrait (1032) on its own — the primary three-column case.
export const IPadPortrait: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.stage}>
      <Frame width={1032} height={1300} />
    </ScrollView>
  ),
};

// iPad landscape (1366) — wide three-column.
export const IPadLandscape: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.stage}>
      <Frame width={1366} height={900} />
    </ScrollView>
  ),
};

// Just-too-narrow for three-column (744) → toolbar-on-top.
export const MiddleTier: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.stage}>
      <Frame width={744} height={900} />
    </ScrollView>
  ),
};

const styles = StyleSheet.create({
  stage: {
    padding: 16,
    gap: 24,
    backgroundColor: COLORS.bgCreamDark,
  },
  col: {
    gap: 24,
  },
  frameWrap: {
    gap: 6,
    marginRight: 24,
  },
  frameTitle: {
    fontSize: 12,
    fontFamily: "TondoTrial-Bold",
    color: COLORS.textPrimary,
  },
  frame: {
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.bgCream,
  },
  canvas: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    alignItems: "center",
    justifyContent: "center",
  },
  canvasLabel: {
    fontSize: 14,
    fontFamily: "TondoTrial-Bold",
    color: COLORS.textMuted,
    textAlign: "center",
  },
});
