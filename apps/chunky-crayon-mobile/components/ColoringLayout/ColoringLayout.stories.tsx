import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import ColoringLayout from "./ColoringLayout";
import CanvasTopBar from "@/components/CanvasTopBar/CanvasTopBar";
import ToolbarContent from "@/components/MobileColoringToolbar/ToolbarContent";
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
  const tier = getColoringTier(width, height);
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
 * The PHONE tier is NOT rendered by ColoringLayout (that only knows the
 * three-column + middle/toolbar-on-top branches). On a real phone the coloring
 * screen is: a CanvasTopBar chrome row (progress + sound/music) above the
 * canvas, with the MobileColoringToolbar BOTTOM SHEET docked at the base. So
 * this frame composes that real structure — CanvasTopBar, canvas, then the
 * sheet body (ToolbarContent) in a sheet-styled container at the bottom —
 * instead of letting ColoringLayout fall back to its (never-shown-on-phone)
 * toolbar-on-top branch. Scaled to fit the pane exactly like Frame.
 */
const PhoneFrame = ({
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
  const scale = availableWidth > 0 ? Math.min(1, availableWidth / width) : 1;
  return (
    <View style={styles.frameWrap}>
      <Text style={styles.frameTitle}>
        {label ? `${label}  ` : ""}
        {width}×{height} → phone (bottom sheet)
        {scale < 1 ? `  (shown @ ${Math.round(scale * 100)}%)` : ""}
      </Text>
      <View
        style={[
          styles.frameClip,
          { width: width * scale, height: height * scale },
        ]}
      >
        <View
          style={[
            styles.phoneFrame,
            {
              width,
              height,
              transform: [{ scale }],
              transformOrigin: "top left",
            },
          ]}
        >
          {/* Chrome row + canvas fill the WHOLE frame; the sheet floats OVER
              the bottom of the canvas (absolute), so the canvas peeks above it
              — reading as a real bottom sheet sitting on top of the canvas,
              not a panel stacked below it. */}
          <View style={styles.phoneTopRow}>
            <CanvasTopBar />
          </View>
          <View style={styles.phoneCanvas}>
            <PlaceholderCanvas area={{ width, height }} />
          </View>
          {/* Docked bottom sheet — overlays the lower portion of the canvas.
              ToolbarContent is the sheet's scrollable body (MobileColoringToolbar
              wraps it in a gorhom BottomSheet on-device, which docks to the
              SCREEN bottom and so can't live inside a scaled frame — this is the
              faithful faux: same body, sheet chrome, overlaying the canvas).
              CAPPED to ~60% of the frame height and the body SCROLLS within it —
              mirroring the real collapsed detent — so the canvas + top bar stay
              visible above it even on a SHORT landscape frame (852×393), where an
              uncapped sheet (its content is ~400px tall) would cover everything. */}
          <View style={[styles.phoneSheetOverlay, { maxHeight: height * 0.6 }]}>
            <View style={styles.phoneSheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Sheet body reads everything from the store — tools / colors /
                  brush / undo-redo only (web parity). Zoom lives in the top
                  chrome, actions under the canvas (not shown in this faux). */}
              <ToolbarContent />
            </ScrollView>
          </View>
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
          <PhoneFrame
            label="iPhone portrait"
            width={393}
            height={852}
            availableWidth={w}
          />
          <PhoneFrame
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

// iPhone portrait (393) — the phone tier. Rendered via PhoneFrame (CanvasTopBar
// + canvas + docked bottom sheet), mirroring the REAL phone screen — NOT
// ColoringLayout, which the phone never uses.
export const PhonePortrait: Story = {
  render: () => (
    <FittedStage>
      {(w) => (
        <PhoneFrame
          label="iPhone portrait"
          width={393}
          height={852}
          availableWidth={w}
        />
      )}
    </FittedStage>
  ),
};

// iPhone Max landscape (852×393) — still the PHONE tier (bottom sheet), NOT
// middle: at 393px tall, a tools-on-top toolbar would starve the canvas, so the
// height-aware tier (height < 600) keeps the bottom sheet. Rendered via
// PhoneFrame to mirror the real screen.
export const PhoneLandscape: Story = {
  render: () => (
    <FittedStage>
      {(w) => (
        <PhoneFrame
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

// iPad Pro 11" / Air portrait (834) — MIDDLE tools-on-top. Three-column here
// would squeeze the canvas to ~372px (skinny); tools-on-top gives it the full
// width. Three-column kicks in at 1000 (iPad-13 portrait + all landscapes).
export const IPadProgressivePortrait: Story = {
  name: "iPad Pro 11 Portrait",
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
  // Phone-tier mockup: chrome row, canvas, docked bottom sheet.
  phoneFrame: {
    backgroundColor: COLORS.bgCream,
    flexDirection: "column",
  },
  phoneTopRow: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  // Canvas fills the whole frame below the chrome row; the sheet overlays its
  // lower half. Extra bottom padding keeps the placeholder label clear of the
  // sheet so the canvas reads as "peeking above" it.
  phoneCanvas: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  // Bottom sheet — absolutely positioned over the lower portion of the canvas.
  phoneSheetOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  phoneSheetHandle: {
    // Match the production handle (web parity): 56x5 cream pill, 20px gap.
    alignSelf: "center",
    backgroundColor: COLORS.bgCreamDark,
    width: 56,
    height: 5,
    borderRadius: 2.5,
    marginTop: 20,
    marginBottom: 20,
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
