import Svg, { Path, Circle, Line } from "react-native-svg";

/**
 * Stroke (line-art) icons for the coloring tools rail, ported VERBATIM from
 * CC web's DesktopToolsSidebar inline SVGs (UndoIcon / RedoIcon / ZoomInIcon
 * / ZoomOutIcon / HomeIcon). Web uses these hand-drawn stroke glyphs — NOT
 * FontAwesome — for undo/redo/zoom, so the mobile rail must too (FA duotone
 * looked wrong / too heavy). All share viewBox 0 0 24 24, stroke=currentColor,
 * strokeWidth 2, round caps/joins, fill none.
 */

type IconProps = { size?: number; color: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
});

export const UndoIcon = ({ size = 24, color }: IconProps) => (
  <Svg {...base(size)}>
    <Path
      d="M3 7v6h6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const RedoIcon = ({ size = 24, color }: IconProps) => (
  <Svg {...base(size)}>
    <Path
      d="M21 7v6h-6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ZoomInIcon = ({ size = 24, color }: IconProps) => (
  <Svg {...base(size)}>
    <Circle cx={11} cy={11} r={8} stroke={color} strokeWidth={2} />
    <Line
      x1={21}
      y1={21}
      x2={16.65}
      y2={16.65}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1={11}
      y1={8}
      x2={11}
      y2={14}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1={8}
      y1={11}
      x2={14}
      y2={11}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

export const ZoomOutIcon = ({ size = 24, color }: IconProps) => (
  <Svg {...base(size)}>
    <Circle cx={11} cy={11} r={8} stroke={color} strokeWidth={2} />
    <Line
      x1={21}
      y1={21}
      x2={16.65}
      y2={16.65}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1={8}
      y1={11}
      x2={14}
      y2={11}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

export const HomeIcon = ({ size = 24, color }: IconProps) => (
  <Svg {...base(size)}>
    <Path
      d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12h6v10"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
