import { useState } from "react";
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

/**
 * A device mockup at its true logical width/height, SCALED DOWN to fit the
 * Storybook preview pane. The frame must render the layout at the real device
 * width (so getColoringTier + the rail/canvas widths match the device), but the
 * pane is far narrower than an iPad — so we transform-scale the whole mockup to
 * fit `availableWidth`. Without this the layout renders at full device width and
 * the right rail spills out of the pane (RN doesn't auto-shrink a fixed-size
 * child). `availableWidth` is measured from the scroll stage via onLayout.
 */
const Frame = ({
  label,
  width,
  height,
  availableWidth,
}: {
  label?: string;
  width: number;
  height: number;
  availableWidth: number;
}) => {
  const tier = getColoringTier(width);
  // Fit the device width into the pane (never scale UP past 1:1).
  const scale = availableWidth > 0 ? Math.min(1, availableWidth / width) : 1;
  return (
    <View style={styles.frameWrap}>
      <Text style={styles.frameTitle}>
        {label ? `${label}  ` : ""}
        {width}×{height} → {tier}
        {scale < 1 ? `  (shown @ ${Math.round(scale * 100)}%)` : ""}
      </Text>
      {/* Reserve the SCALED footprint so siblings don't overlap the shrunk
          mockup (transform doesn't affect layout box), AND clip here on the
          UNSCALED outer box — clipping on the transformed child itself is
          unreliable in RN, which let the toolbar's horizontal tool row spill
          past the frame edge. */}
      <View
        style={[
          styles.frameClip,
          { width: width * scale, height: height * scale },
        ]}
      >
        <View
          style={[
            styles.frame,
            {
              width,
              height,
              transform: [{ scale }],
              // Anchor the scale to the top-left so the box sits in its slot.
              transformOrigin: "top left",
            },
          ]}
        >
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
    </View>
  );
};

/**
 * Measures the available pane width once, then renders its children with that
 * width so each Frame can scale to fit. Children is a render-prop taking the
 * measured width.
 */
const FittedStage = ({
  children,
}: {
  children: (availableWidth: number) => React.ReactNode;
}) => {
  const [paneWidth, setPaneWidth] = useState(0);
  // Subtract the stage's horizontal padding (16 each side) so frames scale to
  // the real content width, not the raw pane width.
  const STAGE_PAD = 16;
  const usable = paneWidth - STAGE_PAD * 2;
  return (
    <ScrollView
      contentContainerStyle={styles.stage}
      onLayout={(e) => setPaneWidth(e.nativeEvent.layout.width)}
    >
      {usable > 0 ? children(usable) : null}
    </ScrollView>
  );
};

const meta: Meta = {
  title: "Coloring Experience/Coloring Layout (Responsive)",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

// Every key device, scaled to fit the pane and stacked vertically so the
// fit-based tier switch is visible at a glance. Widths are real logical-point
// window widths; the title prints the resolved tier so the threshold
// (three-column ≥ 822) is self-documenting.
export const AllDevices: Story = {
  render: () => (
    <FittedStage>
      {(w) => (
        <>
          <Frame
            label="iPhone portrait"
            width={393}
            height={852}
            availableWidth={w}
          />
          <Frame
            label="iPhone Max landscape"
            width={852}
            height={393}
            availableWidth={w}
          />
          <Frame
            label="iPad mini / split portrait"
            width={744}
            height={1133}
            availableWidth={w}
          />
          <Frame
            label="iPad Pro 11 portrait"
            width={834}
            height={1194}
            availableWidth={w}
          />
          <Frame
            label="iPad Pro 13 portrait"
            width={1032}
            height={1376}
            availableWidth={w}
          />
          <Frame
            label="iPad Pro 13 landscape"
            width={1376}
            height={1032}
            availableWidth={w}
          />
        </>
      )}
    </FittedStage>
  ),
};

// ── Per-device stories (each in isolation for close review) ──────────────

// iPhone portrait (393) — narrowest. NOTE: on the real screen the phone tier is
// the separate MobileColoringToolbar BOTTOM SHEET, not ColoringLayout; here
// ColoringLayout falls back to its middle/toolbar-on-top branch so the frame
// isn't empty. See MobileColoringToolbar.stories for the real phone surface.
export const PhonePortrait: Story = {
  render: () => (
    <FittedStage>
      {(w) => (
        <Frame
          label="iPhone portrait"
          width={393}
          height={852}
          availableWidth={w}
        />
      )}
    </FittedStage>
  ),
};

// iPhone Max landscape (852) — now THREE-COLUMN (was middle pre-822 cutover).
// Height-bound: the canvas clamps to the short landscape height.
export const PhoneLandscape: Story = {
  render: () => (
    <FittedStage>
      {(w) => (
        <Frame
          label="iPhone Max landscape"
          width={852}
          height={393}
          availableWidth={w}
        />
      )}
    </FittedStage>
  ),
};

// iPad mini / a narrow split-view (744) → toolbar-on-top middle tier (two rails
// don't fit a comfortable canvas here).
export const MiddleTier: Story = {
  render: () => (
    <FittedStage>
      {(w) => (
        <Frame
          label="iPad mini / split portrait"
          width={744}
          height={1133}
          availableWidth={w}
        />
      )}
    </FittedStage>
  ),
};

// iPad Pro 11" / Air portrait (834) — newly THREE-COLUMN after the 822 cutover.
export const IPadProgressivePortrait: Story = {
  name: "iPad Progressive Portrait",
  render: () => (
    <FittedStage>
      {(w) => (
        <Frame
          label="iPad Pro 11 portrait"
          width={834}
          height={1194}
          availableWidth={w}
        />
      )}
    </FittedStage>
  ),
};

// iPad Pro 13" portrait (1032) — the primary three-column case.
export const IPadPortrait: Story = {
  name: "iPad Portrait",
  render: () => (
    <FittedStage>
      {(w) => (
        <Frame
          label="iPad Pro 13 portrait"
          width={1032}
          height={1376}
          availableWidth={w}
        />
      )}
    </FittedStage>
  ),
};

// iPad Pro 13" landscape (1376) — wide three-column.
export const IPadLandscape: Story = {
  name: "iPad Landscape",
  render: () => (
    <FittedStage>
      {(w) => (
        <Frame
          label="iPad Pro 13 landscape"
          width={1376}
          height={1032}
          availableWidth={w}
        />
      )}
    </FittedStage>
  ),
};

const styles = StyleSheet.create({
  stage: {
    padding: 16,
    gap: 24,
    backgroundColor: COLORS.bgCreamDark,
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
  // The visible device frame edge + the clip boundary live on the UNSCALED
  // outer box (clipping a transform-scaled child directly is unreliable in RN).
  frameClip: {
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.bgCream,
  },
  frame: {
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
