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

// No-op handlers so the rail/toolbar ACTION tiles (Start Over / Print / Save /
// My Artwork) actually render in stories — without these the action row's
// `if (onStartOver || …)` guard is false and the row is hidden, so the parity
// review would be incomplete.
const noop = () => {};

const Frame = ({
  label,
  width,
  height,
}: {
  label?: string;
  width: number;
  height: number;
}) => {
  const tier = getColoringTier(width);
  return (
    <View style={styles.frameWrap}>
      <Text style={styles.frameTitle}>
        {label ? `${label}  ` : ""}
        {width}×{height} → {tier}
      </Text>
      <View style={[styles.frame, { width, height }]}>
        <ColoringLayout
          width={width}
          height={height}
          zoom={1}
          onZoomIn={noop}
          onZoomOut={noop}
          onResetZoom={noop}
          onStartOver={noop}
          onPrint={noop}
          onSave={noop}
          onMyArtwork={noop}
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

// Every key device width stacked so the fit-based tier switch is visible at a
// glance. Widths are real logical-point window widths; the title prints the
// resolved tier so the threshold (three-column ≥ 822) is self-documenting.
export const AllDevices: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.stage} horizontal>
      <View style={styles.col}>
        <Frame label="iPhone portrait" width={393} height={852} />
        <Frame label="iPad mini / split portrait" width={744} height={1133} />
      </View>
      <Frame label="iPhone Max landscape" width={852} height={393} />
      <Frame label="iPad Pro 11 portrait" width={834} height={1194} />
      <Frame label="iPad Pro 13 portrait" width={1032} height={1376} />
      <Frame label="iPad Pro 13 landscape" width={1376} height={1032} />
    </ScrollView>
  ),
};

// ── Per-device stories (each in isolation for close review) ──────────────

// iPhone portrait (393) — narrowest. NOTE: on the real screen the phone tier is
// the separate MobileColoringToolbar BOTTOM SHEET, not ColoringLayout; here
// ColoringLayout falls back to its middle/toolbar-on-top branch so the frame
// isn't empty. See MobileColoringToolbar.stories for the real phone surface.
export const PhonePortrait: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.stage}>
      <Frame label="iPhone portrait" width={393} height={852} />
    </ScrollView>
  ),
};

// iPhone Max landscape (852) — now THREE-COLUMN (was middle pre-822 cutover).
// Height-bound: the canvas clamps to the short landscape height.
export const PhoneLandscape: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.stage}>
      <Frame label="iPhone Max landscape" width={852} height={393} />
    </ScrollView>
  ),
};

// iPad mini / a narrow split-view (744) → toolbar-on-top middle tier (two rails
// don't fit a comfortable canvas here).
export const MiddleTier: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.stage}>
      <Frame label="iPad mini / split portrait" width={744} height={1133} />
    </ScrollView>
  ),
};

// iPad Pro 11" / Air portrait (834) — newly THREE-COLUMN after the 822 cutover.
export const IPadProgressivePortrait: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.stage}>
      <Frame label="iPad Pro 11 portrait" width={834} height={1194} />
    </ScrollView>
  ),
};

// iPad Pro 13" portrait (1032) — the primary three-column case.
export const IPadPortrait: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.stage}>
      <Frame label="iPad Pro 13 portrait" width={1032} height={1376} />
    </ScrollView>
  ),
};

// iPad Pro 13" landscape (1376) — wide three-column.
export const IPadLandscape: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.stage}>
      <Frame label="iPad Pro 13 landscape" width={1376} height={1032} />
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
