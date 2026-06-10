import { StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

/**
 * Smooth dashed circle drawn with SVG `strokeDasharray`, as an
 * absolutely-positioned overlay sized to its parent.
 *
 * WHY THIS EXISTS — CSS `borderStyle: 'dashed'` with a large `borderRadius`
 * renders as a flat-edged OCTAGON on Android (RN's dashed-border renderer
 * draws along a polygonized path; iOS rasterizes the true arc). Every dashed
 * "add" disc in the app (scene picker, character picker, settings profiles,
 * profile switcher) hit this. SVG renders an identical smooth circle on both
 * platforms.
 *
 * Parent contract:
 *  - The parent must be `size`×`size` and have NO borderWidth: RN anchors
 *    absolute children to the parent's PADDING box, so a parent border shifts
 *    this overlay down-right by the border width and the ring reads
 *    off-centre against flex-centred siblings (e.g. a "+" icon).
 *  - Avoid `overflow: 'hidden'` + an opaque parent background: on Android
 *    that combination can swallow the parent's children entirely.
 *  - The optional `fill` paints the inner wash via the SVG (a translucent
 *    rounded View background polygonizes on Android the same way the dashed
 *    border does).
 */
type DashedRingProps = {
  /** Diameter — match the parent box exactly. */
  size: number;
  /** Stroke (dash) colour. */
  color: string;
  /** Stroke width. */
  stroke?: number;
  /** SVG strokeDasharray, e.g. "8 6" (dash length, gap length). */
  dash?: string;
  /** Inner wash painted inside the ring; defaults to none. */
  fill?: string;
};

const DashedRing = ({
  size,
  color,
  stroke = 3,
  dash = "8 6",
  fill = "none",
}: DashedRingProps) => {
  // Keep the stroke fully inside the box so nothing clips at the edges.
  const r = (size - stroke) / 2;
  return (
    <Svg
      width={size}
      height={size}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill={fill}
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={dash}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default DashedRing;
